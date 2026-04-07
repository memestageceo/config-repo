---
title: Horizontal Pod Autoscaler (HPA)
description: Configuring HPA with CPU/memory metrics, custom FastAPI load-testing image, and Prometheus/KEDA integration notes.
sidebar_position: 1
tags: [kubernetes, hpa, autoscaling, workloads]
---

# Horizontal Pod Autoscaler

```bash
k autoscale deployment app --cpu=50% --min=1 --max=5
```

## Custom Load Testing App

`main.py` creates two types of load:

- `/`: cpu load
- `/mem`: memory load

To build and use the image:

```bash
# build the image
docker build -t noneofyabusiness/fastapi-hpa:local

# load image into kind
kind load docker-image noneofyabusiness/fastapi-hpa:local
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

---

## TODO: Custom metrics with Prometheus + KEDA (implement later)

Custom metrics (Pods and Object types above) require extra infrastructure — the native HPA can't read them on its own.

### How the stack works

```
App (/metrics endpoint, Prometheus format)
    ↓  scraped by
Prometheus
    ↓  queried by
prometheus-adapter  OR  KEDA
    ↓  served to
Kubernetes HPA / KEDA ScaledObject
```

**KEDA** (Kubernetes Event-Driven Autoscaler) is an easier alternative to setting up prometheus-adapter manually. It installs as a CRD and handles the bridge between Prometheus (or other sources like Kafka, RabbitMQ, etc.) and the HPA for you.

### What the app needs to expose

The app must expose a `/metrics` endpoint in Prometheus text format. Use `prometheus_client` (Python):

```python
from prometheus_client import Counter, make_asgi_app

REQUEST_COUNT = Counter("app_requests_total", "Total requests", ["endpoint"])

# mount at /metrics so Prometheus can scrape it
app.mount("/metrics", make_asgi_app())
```

Each endpoint increments the counter. Prometheus then computes `rate(app_requests_total[1m])` → requests/sec.

### Links

- [KEDA Prometheus Scaler](https://keda.sh/docs/latest/scalers/prometheus/)
- [prometheus-adapter (native HPA path)](https://github.com/kubernetes-sigs/prometheus-adapter)
