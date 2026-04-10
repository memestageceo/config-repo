---
title: Custom Images vs Kustomize Patches
description: When to build a custom Docker image versus using Kustomize patches — separation of concerns, reusability, and manifest clarity.
sidebar_position: 2
tags: [kubernetes, kustomize, docker, dockerfile]
---

# Why Create a Custom Image

1. **Separation of concerns** - Build logic stays in Dockerfile, deployment stays in K8s
2. **Reusability** - Same image can be used in different environments
3. **Versioning** - Tag images properly
4. **Simpler manifests** - K8s YAML becomes clean and declarative
5. **Build-time optimizations** - Can pre-process files
6. **Testing** - Can test the image independently

## Simple Custom Image Example

### Dockerfile

```dockerfile
FROM nginx:alpine

# Install envsubst for template processing
RUN apk add --no-cache gettext

WORKDIR /app
COPY entrypoint.sh .
COPY templates/ ./templates/
COPY html/ ./html/
COPY nginx.conf.template /etc/nginx/nginx.conf.template

RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
```

### entrypoint.sh

```bash
#!/bin/sh
echo "Starting application with environment:"
printenv | sort

# Replace environment variables in nginx config
envsubst '${APP_NAME} ${ENVIRONMENT} ${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Generate HTML from template
envsubst < /app/templates/index.html.template > /usr/share/nginx/html/index.html

echo "Configuration complete. Starting nginx..."
exec nginx -g 'daemon off;'
```

## Clean Kubernetes Manifest

With a custom image, your K8s manifest becomes simple:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: env-tester
spec:
  replicas: 2
  selector:
    matchLabels:
      app: env-tester
  template:
    metadata:
      labels:
        app: env-tester
    spec:
      containers:
        - name: env-tester
          image: myregistry/k8s-env-tester:1.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: APP_NAME
              value: "K8s Learning Pod"
            - name: ENVIRONMENT
              value: "development"
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

## Build and Push

```bash
# Build the image
docker build -t myregistry/k8s-env-tester:1.0.0 .

# Test locally
docker run -p 8080:8080 -e APP_NAME="Test" -e ENVIRONMENT="dev" myregistry/k8s-env-tester:1.0.0

# Push to registry
docker push myregistry/k8s-env-tester:1.0.0
```

## Multi-stage Build

```dockerfile
FROM node:alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM nginx:alpine

COPY --from=builder /app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
```

## Benefits of This Approach

1. **K8s manifest is clean** - No shell scripts in YAML
2. **Image is testable** - Can test `docker run` locally
3. **CI/CD friendly** - Build once, deploy anywhere
4. **Security** - Can run as non-root user in Dockerfile
5. **Performance** - Everything is pre-built in the image
6. **Debugging** - Can `docker exec` into container to debug
