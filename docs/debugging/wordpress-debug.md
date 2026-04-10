---
title: WordPress + MySQL Connectivity Debugging
description: Step-by-step guide to diagnosing WordPress database connection errors in Kubernetes — DNS, namespace isolation, credentials, and secret sync.
sidebar_position: 2
tags: [kubernetes, wordpress, mysql, debugging, dns, secrets]
---

# Kubernetes Troubleshooting Guide: WordPress & MySQL Connectivity

> `wordpress` expects `mysql` on port 3306.
> name of `db_host` === `service.name`

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

### Issue: Wrong port configuration

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

```bash
❯ k exec deploy/wordpress -- printenv | grep DB
WORDPRESS_DB_NAME=db
WORDPRESS_DB_PASSWORD=examplepass
WORDPRESS_DB_USER=exampleuser
WORDPRESS_DB_HOST=db
DB_PORT=tcp://10.96.143.38:3306
```

---

## The Problem We Solved

**Symptom**: WordPress showing "Error establishing database connection" with HTTP 500 errors

**Root Cause**: Multiple configuration mismatches between WordPress and MySQL services

## The Troubleshooting Process

### Step 1: Verify Pod Status

Always start by checking if your pods are actually running:

```bash
kubectl get pods -n wordpress
```

**Our case**: Both pods were running, so the issue wasn't a crash - it was configuration.

---

### Step 2: Check Application Logs

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

---

### Step 3: Inspect Environment Variables

```bash
kubectl exec -n wordpress deployment/wordpress -- printenv | grep WORDPRESS_DB
```

**What to look for:**
- Does `WORDPRESS_DB_HOST` match your MySQL service name?
- Do the database name, user, and password match what MySQL expects?

**Our case**: The pod showed `WORDPRESS_DB_HOST=db` but our MySQL service was named `mysql`

---

### Step 4: Understand Kubernetes Service DNS

In Kubernetes, pods communicate using service names as DNS hostnames:

- **Format**: `<service-name>.<namespace>.svc.cluster.local`
- **Short form** (same namespace): `<service-name>`

```bash
kubectl get svc -n wordpress
kubectl describe svc mysql -n wordpress
```

**Our case** had multiple issues:
1. MySQL service was in `default` namespace, WordPress in `wordpress` namespace
2. Service port was 80 instead of 3306
3. WordPress was configured to connect to `db` but service was named `mysql`

---

### Step 5: Verify Service-to-Pod Connectivity

```bash
kubectl get endpoints mysql -n wordpress
kubectl describe svc mysql -n wordpress
```

If endpoints are `<none>`, the service selector doesn't match any pods.

---

### Step 6: Compare Secret Values

```bash
kubectl get secret wordpress-secret -n wordpress -o yaml
kubectl get secret mysql-secret -n wordpress -o yaml

# Decode base64 values
echo "d3BkYg==" | base64 -d
```

**Pro tip**: Use `stringData` instead of `data` in your YAML for easier debugging:

```yaml
stringData:
  MYSQL_DATABASE: wpdb # Plain text - easy to read
  MYSQL_PASSWORD: password
```

---

### Step 7: Test Network Connectivity

```bash
# Test DNS resolution
kubectl exec -n wordpress deployment/wordpress -- nslookup mysql

# Test TCP connectivity
kubectl exec -n wordpress deployment/wordpress -- nc -zv mysql 3306
```

---

### Step 8: Force Configuration Reload

```bash
kubectl rollout restart deployment/wordpress -n wordpress
kubectl rollout restart deployment/mysql -n wordpress
kubectl rollout status deployment/wordpress -n wordpress
```

**Why this matters**: Environment variables are loaded when the pod starts. Updating a Secret doesn't update running pods.

---

## Best Practices

### 1. Use `stringData` for Secrets During Testing

```yaml
stringData:
  MYSQL_DATABASE: wpdb
  MYSQL_PASSWORD: mypassword
```

### 2. Keep Services and Pods in Same Namespace

Simpler DNS: `mysql` instead of `mysql.wordpress.svc.cluster.local`

### 3. Use Consistent Naming

If your service is called `mysql`, name the deployment `mysql`, secret `mysql-secret`, labels `app: mysql`.

### 4. Always Check Logs First

Logs reveal 80% of issues.

### 5. Understand MySQL Environment Variables

```yaml
MySQL expects:
  - MYSQL_DATABASE
  - MYSQL_USER
  - MYSQL_PASSWORD
  - MYSQL_ROOT_PASSWORD or MYSQL_RANDOM_ROOT_PASSWORD

WordPress expects:
  - WORDPRESS_DB_HOST   # Must match service name
  - WORDPRESS_DB_NAME   # Must match MYSQL_DATABASE
  - WORDPRESS_DB_USER   # Must match MYSQL_USER
  - WORDPRESS_DB_PASSWORD  # Must match MYSQL_PASSWORD
```
