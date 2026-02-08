## **Why Create a Custom Image:**

1. **Separation of concerns** - Build logic stays in Dockerfile, deployment stays in K8s
2. **Reusability** - Same image can be used in different environments
3. **Versioning** - Tag images properly
4. **Simpler manifests** - K8s YAML becomes clean and declarative
5. **Build-time optimizations** - Can pre-process files
6. **Testing** - Can test the image independently

## **Simple Custom Image Example:**

### **Dockerfile:**

```dockerfile
# Dockerfile
FROM nginx:alpine

# Install envsubst for template processing
RUN apk add --no-cache gettext

# Create directory structure
WORKDIR /app
COPY entrypoint.sh .
COPY templates/ ./templates/
COPY html/ ./html/

# Copy and process nginx config
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Make scripts executable
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use custom entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
```

### **entrypoint.sh:**

```bash
#!/bin/sh
# entrypoint.sh

echo "Starting application with environment:"
printenv | sort

# Replace environment variables in nginx config
envsubst '${APP_NAME} ${ENVIRONMENT} ${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Generate HTML from template
envsubst < /app/templates/index.html.template > /usr/share/nginx/html/index.html

# Generate JSON endpoint with all env vars
python3 -c "
import os, json
env_dict = dict(os.environ)
with open('/usr/share/nginx/html/env.json', 'w') as f:
    json.dump(env_dict, f, indent=2)
" 2>/dev/null || echo '{"error": "Python not available"}' > /usr/share/nginx/html/env.json

# Create health endpoint
echo '{"status": "healthy", "service": "'${APP_NAME:-unknown}'"}' > /usr/share/nginx/html/health

echo "Configuration complete. Starting nginx..."
exec nginx -g 'daemon off;'
```

### **nginx.conf.template:**

```nginx
# nginx.conf.template
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Log format with env vars
    log_format main '[$time_local] "$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'env=$ENVIRONMENT app=${APP_NAME}';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    server {
        listen ${PORT:-8080};
        server_name localhost;

        root /usr/share/nginx/html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /env {
            default_type application/json;
            alias /usr/share/nginx/html/env.json;
        }

        location /health {
            access_log off;
            default_type application/json;
            alias /usr/share/nginx/html/health;
        }

        location /env/plain {
            default_type text/plain;
            return 200 "$hostname\n$remote_addr\n$(env)\n";
        }

        # Return 404 for missing files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### **templates/index.html.template:**

```html
<!-- templates/index.html.template -->
<!DOCTYPE html>
<html>
  <head>
    <title>${APP_NAME:-K8s Env Tester}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 40px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #f4f4f4;
        font-weight: bold;
      }
      .info {
        background: #e8f4f8;
        padding: 20px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .endpoint {
        background: #f0f0f0;
        padding: 10px;
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <h1>${APP_NAME:-Environment Variables Tester}</h1>
    <div class="info">
      <strong>Environment:</strong> ${ENVIRONMENT:-not set}<br />
      <strong>Port:</strong> ${PORT:-8080}<br />
      <strong>Timestamp:</strong> <span id="timestamp"></span>
    </div>

    <h2>Available Endpoints:</h2>
    <div class="endpoint"><a href="/">/</a> - This page</div>
    <div class="endpoint">
      <a href="/env">/env</a> - All environment variables (JSON)
    </div>
    <div class="endpoint"><a href="/health">/health</a> - Health check</div>
    <div class="endpoint">
      <a href="/env/plain">/env/plain</a> - Plain text environment
    </div>

    <h2>Sample Environment Variables:</h2>
    <table>
      <tr>
        <th>Variable</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>APP_NAME</td>
        <td>${APP_NAME:-not set}</td>
      </tr>
      <tr>
        <td>ENVIRONMENT</td>
        <td>${ENVIRONMENT:-not set}</td>
      </tr>
      <tr>
        <td>PORT</td>
        <td>${PORT:-8080}</td>
      </tr>
    </table>

    <script>
      document.getElementById("timestamp").textContent =
        new Date().toISOString();
      // Fetch and display some env vars
      fetch("/env")
        .then((r) => r.json())
        .then((data) => {
          console.log(
            "Environment variables loaded:",
            Object.keys(data).length,
          );
        });
    </script>
  </body>
</html>
```

### **Build and Push:**

```bash
# Build the image
docker build -t myregistry/k8s-env-tester:1.0.0 .

# Test locally
docker run -p 8080:8080 -e APP_NAME="Test" -e ENVIRONMENT="dev" myregistry/k8s-env-tester:1.0.0

# Push to registry
docker push myregistry/k8s-env-tester:1.0.0
```

## **Clean Kubernetes Manifest:**

Now your K8s manifest becomes super simple:

```yaml
# deployment.yaml
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
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: env-tester-service
spec:
  selector:
    app: env-tester
  ports:
    - port: 80
      targetPort: http
  type: ClusterIP
```

## **Even Simpler - Use Multi-stage Build:**

```dockerfile
# Multi-stage Dockerfile
FROM node:alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM nginx:alpine

# Copy built assets
COPY --from=builder /app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Simple startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
```

## **Benefits of This Approach:**

1. **K8s manifest is clean** - No shell scripts in YAML
2. **Image is testable** - Can test `docker run` locally
3. **CI/CD friendly** - Build once, deploy anywhere
4. **Security** - Can run as non-root user in Dockerfile
5. **Performance** - Everything is pre-built in the image
6. **Debugging** - Can `docker exec` into container to debug

## **Project Structure:**

```
env-tester/
├── Dockerfile
├── entrypoint.sh
├── nginx.conf.template
├── templates/
│   └── index.html.template
├── html/
│   └── (static files)
├── build.sh
├── push.sh
└── k8s/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    └── secret.yaml
```

**You're absolutely thinking the right way!** Building a custom Docker image is industry standard and makes everything cleaner. Start with the simple version, then enhance it as you learn more!
