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

```bash

# localhost:8080 - container:80
 kubectl port-forward --namespace=ingress-nginx service/ingress-nginx-controller 8080:80

# localhost === demo.localdev.me
curl --resolve demo.localdev.me:8080:127.0.0.1 http://demo.localdev.me:8080
```

no DNS resolution required -> trust me bro! -> makes it seem as if `/etc/hosts` contains `127.0.0.1  demo.localdev.me`
