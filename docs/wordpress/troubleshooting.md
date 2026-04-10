---
title: WordPress Troubleshooting Quick Reference
description: Checklist and step-by-step fixes for WordPress/MySQL connectivity issues in Kubernetes.
sidebar_position: 2
sidebar_label: Troubleshooting
tags: [kubernetes, wordpress, mysql, troubleshooting]
---

:::tip Full debug guide
See the complete [WordPress/MySQL Debug Guide](../debugging/wordpress-debug) for an in-depth step-by-step walkthrough.
:::

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

### Issue: Service endpoint is `<none>`

**Cause**: Service selector doesn't match any pods

```bash
kubectl get pods -n wordpress --show-labels
kubectl describe svc mysql -n wordpress | grep Selector
```

### Issue: Wrong namespace

**Solution**: Both service and pods must be in same namespace, OR use FQDN: `mysql.wordpress.svc.cluster.local`

## Quick Debug Commands

```bash
# Check pods
kubectl get pods -n wordpress

# Check services
kubectl get svc -n wordpress

# Check endpoints
kubectl get endpoints -n wordpress

# Check env vars
kubectl exec -n wordpress deployment/wordpress -- printenv | grep WORDPRESS_DB

# Test DNS
kubectl exec -n wordpress deployment/wordpress -- nslookup mysql

# Force restart
kubectl rollout restart deployment/wordpress -n wordpress
```
