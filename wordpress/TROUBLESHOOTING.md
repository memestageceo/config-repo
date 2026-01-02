# Kubernetes Troubleshooting Guide: WordPress & MySQL Connectivity

## The Problem We Solved

**Symptom**: WordPress showing "Error establishing database connection" with HTTP 500 errors

**Root Cause**: Multiple configuration mismatches between WordPress and MySQL services

## The Troubleshooting Process

### Step 1: Verify Pod Status

Always start by checking if your pods are actually running:

```bash
kubectl get pods -n wordpress
```

**What to look for:**

- Are all pods in `Running` status?
- Any pods in `CrashLoopBackOff`, `Error`, or `Pending`?
- Check the `RESTARTS` column - high restart counts indicate problems

**Our case**: Both pods were running, so the issue wasn't a crash - it was configuration.

---

### Step 2: Check Application Logs

Logs tell you what's happening inside the container:

```bash
# Check WordPress logs
kubectl logs -n wordpress deployment/wordpress --tail=50

# Check MySQL logs
kubectl logs -n wordpress deployment/mysql --tail=50
```

**What to look for in WordPress logs:**

- Database connection errors
- Which host/database it's trying to connect to
- Authentication errors

**What to look for in MySQL logs:**

- Is the database initialized? Look for "MySQL init process done"
- What database/user was created?
- Any connection attempts from WordPress?

**Our case**:

- WordPress showed HTTP 500 errors but no specific DB errors in logs
- MySQL showed it successfully created database `wpdb` with user `admin`
- This suggested WordPress wasn't even reaching MySQL

---

### Step 3: Inspect Environment Variables

Check what configuration the running pod actually has:

```bash
kubectl exec -n wordpress deployment/wordpress -- printenv | grep WORDPRESS_DB
```

**What to look for:**

- Does `WORDPRESS_DB_HOST` match your MySQL service name?
- Do the database name, user, and password match what MySQL expects?

**Our case**: The pod showed `WORDPRESS_DB_HOST=db` but our MySQL service was named `mysql`

**Why this happens**: The pod was started before we updated the Secret, so it had old values cached.

---

### Step 4: Understand Kubernetes Service DNS

In Kubernetes, pods communicate using service names as DNS hostnames:

**Format**: `<service-name>.<namespace>.svc.cluster.local`
**Short form** (same namespace): `<service-name>`

```bash
# Check if your service exists
kubectl get svc -n wordpress

# Check service details
kubectl describe svc mysql -n wordpress
```

**What to look for:**

- Service name matches what you're using in `WORDPRESS_DB_HOST`
- Service is in the correct namespace
- Service has the correct selector matching your pod labels
- Service port matches what the application expects (MySQL = 3306)

**Our case**: We had multiple issues:

1. MySQL service was in `default` namespace, WordPress in `wordpress` namespace
2. Service port was 80 instead of 3306
3. WordPress was configured to connect to `db` but service was named `mysql`

---

### Step 5: Verify Service-to-Pod Connectivity

Check that the service is actually routing to your pods:

```bash
# Get service endpoints
kubectl get endpoints mysql -n wordpress

# Describe service to see which pods it selected
kubectl describe svc mysql -n wordpress
```

**What to look for:**

- Endpoints should show pod IPs
- If endpoints are `<none>`, the service selector doesn't match any pods
- Check `Selector` field matches your pod labels

---

### Step 6: Compare Secret Values

When using Secrets, ensure both services use matching credentials:

```bash
# View WordPress secret
kubectl get secret wordpress-secret -n wordpress -o yaml

# View MySQL secret
kubectl get secret mysql-secret -n wordpress -o yaml

# Decode base64 values to verify they match
echo "d3BkYg==" | base64 -d  # Should output: wpdb
```

**What to look for:**

- Database name in WordPress secret matches MySQL's `MYSQL_DATABASE`
- Username matches between `WORDPRESS_DB_USER` and `MYSQL_USER`
- Password matches between `WORDPRESS_DB_PASSWORD` and `MYSQL_PASSWORD`

**Pro tip**: Use `stringData` instead of `data` in your YAML for easier debugging:

```yaml
stringData:
  MYSQL_DATABASE: wpdb # Plain text - easy to read
  MYSQL_PASSWORD: password
```

Kubernetes automatically converts this to base64 internally.

---

### Step 7: Test Network Connectivity

If everything looks correct, test if pods can actually reach each other:

```bash
# Test DNS resolution
kubectl exec -n wordpress deployment/wordpress -- nslookup mysql

# Test TCP connectivity (if netcat is available)
kubectl exec -n wordpress deployment/wordpress -- nc -zv mysql 3306

# Or use curl
kubectl exec -n wordpress deployment/wordpress -- curl -v telnet://mysql:3306
```

**What to look for:**

- DNS resolves to an IP address
- TCP connection succeeds
- If connection fails, check network policies or firewall rules

---

### Step 8: Force Configuration Reload

If you updated Secrets or ConfigMaps, pods won't automatically restart:

```bash
# Restart deployment to pick up new config
kubectl rollout restart deployment/wordpress -n wordpress
kubectl rollout restart deployment/mysql -n wordpress

# Wait for rollout to complete
kubectl rollout status deployment/wordpress -n wordpress
```

**Why this matters**: Environment variables are loaded when the pod starts. Updating a Secret doesn't update running pods.

---

## Common Issues & Solutions

### Issue: "Error establishing database connection"

**Checklist:**

- [ ] MySQL service name matches `WORDPRESS_DB_HOST`
- [ ] Both services in same namespace (or use FQDN)
- [ ] MySQL port is 3306, not 80 or another port
- [ ] Container exposes port 3306
- [ ] Credentials match between WordPress and MySQL
- [ ] MySQL pod is running and healthy
- [ ] WordPress pod restarted after Secret changes

### Issue: Service endpoint is `<none>`

**Cause**: Service selector doesn't match any pods

**Solution**:

```bash
# Check pod labels
kubectl get pods -n wordpress --show-labels

# Check service selector
kubectl describe svc mysql -n wordpress | grep Selector
```

Make sure they match exactly.

### Issue: Wrong namespace

**Symptoms**: Service exists but pods can't connect

**Solution**:

- Both service and pods must be in same namespace, OR
- Use fully qualified domain name: `mysql.wordpress.svc.cluster.local`

### Issue: Wrong port configuration

**Common mistakes:**

- MySQL service port ≠ 3306
- Container port ≠ 3306
- targetPort doesn't match containerPort

**Correct configuration:**

```yaml
# In deployment
ports:
  - containerPort: 3306

# In service
ports:
  - port: 3306        # Port service listens on
    targetPort: 3306  # Port container listens on
```

---

## Debugging Workflow Summary

```
1. Check pod status (kubectl get pods)
   ↓
2. Check logs (kubectl logs)
   ↓
3. Check environment variables (kubectl exec ... printenv)
   ↓
4. Verify services exist and are correct (kubectl get svc, describe svc)
   ↓
5. Check service endpoints (kubectl get endpoints)
   ↓
6. Verify Secret values match (kubectl get secret -o yaml)
   ↓
7. Test connectivity (kubectl exec ... nslookup/nc)
   ↓
8. Restart pods to reload config (kubectl rollout restart)
```

---

## Best Practices for Development

### 1. Use `stringData` for Secrets During Testing

```yaml
# Easy to read and verify
stringData:
  MYSQL_DATABASE: wpdb
  MYSQL_PASSWORD: mypassword
```

### 2. Keep Services and Pods in Same Namespace

Simpler DNS: `mysql` instead of `mysql.wordpress.svc.cluster.local`

### 3. Use Consistent Naming

If your service is called `mysql`, consider naming:

- Deployment: `mysql`
- Secret: `mysql-secret`
- Labels: `app: mysql`

### 4. Always Check Logs First

Logs reveal 80% of issues. Make it your first step.

### 5. Understand the MySQL Environment Variables

```yaml
MySQL expects:
  - MYSQL_DATABASE # Database to create
  - MYSQL_USER # Non-root user
  - MYSQL_PASSWORD # User's password
  - MYSQL_ROOT_PASSWORD or MYSQL_RANDOM_ROOT_PASSWORD

WordPress expects:
  - WORDPRESS_DB_HOST # Service name
  - WORDPRESS_DB_NAME # Must match MYSQL_DATABASE
  - WORDPRESS_DB_USER # Must match MYSQL_USER
  - WORDPRESS_DB_PASSWORD # Must match MYSQL_PASSWORD
```

### 6. Test Changes Incrementally

Don't change everything at once:

1. Deploy MySQL first
2. Verify it's running (`kubectl logs`)
3. Deploy WordPress
4. Check connectivity
5. Debug one issue at a time

---

## Useful Commands Reference

```bash
# View all resources in namespace
kubectl get all -n wordpress

# Describe any resource for detailed info
kubectl describe pod <pod-name> -n wordpress
kubectl describe svc <service-name> -n wordpress

# Execute commands inside a pod
kubectl exec -it deployment/wordpress -n wordpress -- bash

# Port-forward to test locally
kubectl port-forward svc/wordpress 8080:80 -n wordpress

# View events (shows recent problems)
kubectl get events -n wordpress --sort-by='.lastTimestamp'

# Delete and recreate resources
kubectl delete -f k8s/sql-deploy.yaml
kubectl apply -f k8s/sql-deploy.yaml

# Watch pod status in real-time
kubectl get pods -n wordpress -w
```

---

## Learning Resources

1. **Kubernetes DNS**: Understanding how service discovery works
2. **ConfigMaps and Secrets**: Managing application configuration
3. **Labels and Selectors**: How services find pods
4. **Troubleshooting patterns**: Systematic debugging approach
5. **MySQL Docker image docs**: Understanding environment variables

---

## What You Learned

By working through this issue, you now understand:

✅ How to read pod logs to diagnose issues
✅ How Kubernetes DNS and service discovery works
✅ How environment variables are loaded from Secrets
✅ Why pods need restarting after Secret changes
✅ How to verify service-to-pod connectivity
✅ The importance of matching namespaces
✅ How to decode and compare Secret values
✅ The systematic approach to debugging multi-service applications

**Most importantly**: You learned the debugging process, not just the fix. This applies to any Kubernetes connectivity issue.

---

## Next Steps to Build DevOps Skills

1. **Practice the debugging workflow** on other apps
2. **Set up monitoring** (Prometheus + Grafana) to catch issues early
3. **Learn about health checks** (liveness/readiness probes)
4. **Study network policies** for security
5. **Explore Helm charts** for managing complex applications
6. **Set up a local cluster** (kind/minikube) for safe experimentation

Remember: Every error is a learning opportunity. The more you debug, the faster you'll recognize patterns!
