# Horizontal Pod Autoscaler

```bash
k autoscale deployment app --cpu=50% --min=1 --max=5
```

## Example HPA manifest

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: php-apache
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: php-apache
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
```

## Other metric examples

### Memory resource metric

```yaml
- type: Resource
  resource:
    name: memory
    target:
      type: AverageValue
      averageValue: 500Mi
```

### Pods metric

```yaml
- type: Pods
  pods:
    metric:
      name: packets-per-second
    target:
      type: AverageValue
      averageValue: 1k
```

Note: Pod metrics work much like resource metrics, except they only support a target type of `AverageValue`.

### Object metric

```yaml
- type: Object
  object:
    metric:
      name: requests-per-second
    describedObject:
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: main-route
    target:
      type: Value
      value: 2k
```

Note: Object metrics describe a different object in the same namespace instead of describing pods. The metric is not necessarily fetched from that object; it only describes it.
