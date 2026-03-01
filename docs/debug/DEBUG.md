# Debug k8s

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
5. Check service endpoints (kubectl get endpoints/endpointslices)
   ↓
6. Verify Secret values match (kubectl get secret -o yaml)
   ↓
7. Test connectivity (kubectl exec ... nslookup/nc)
   ↓
8. Restart pods to reload config (kubectl rollout restart)
```
