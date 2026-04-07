---
title: Ingress with NGINX
description: Installing the NGINX ingress controller via Helm and testing local routing with curl --resolve.
sidebar_position: 1
tags: [kubernetes, ingress, nginx, helm, networking]
---

# Ingress with NGINX

## Install NGINX Ingress Controller

```bash
helm template ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx

kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

## curl --resolve

Test ingress routing locally without DNS changes:

```bash
# Port-forward the ingress controller
# localhost:8080 → container:80
kubectl port-forward --namespace=ingress-nginx service/ingress-nginx-controller 8080:80

# Resolve hostname to localhost — no /etc/hosts entry needed
curl --resolve demo.localdev.me:8080:127.0.0.1 http://demo.localdev.me:8080
```

`--resolve` makes it seem as if `/etc/hosts` contains `127.0.0.1 demo.localdev.me` — no actual DNS resolution required.
