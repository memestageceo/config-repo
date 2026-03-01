# Service ports in k8s

> `targetPort` must equal `containerPort`

`nodePort -> port -> targetPort = containerPort`

```mermaid
graph TB
    subgraph "Pod Definition"
        CP["containerPort: 8080<br/>(Port app listens on)"]
    end

    subgraph "Service Definition"
        SP["port: 80<br/>(Service port)"]
        TP["targetPort: 8080<br/>(Pod port to forward to)"]
    end

    subgraph "NodePort Service (optional)"
        NP["nodePort: 30080<br/>(External access port)"]
    end

    CP -.->|"Must match"| TP
    SP -->|"Forwards to"| TP
    NP -->|"Forwards to"| SP

    style CP fill:#e1f5ff
    style SP fill:#fff4e1
    style TP fill:#ffe1f5
    style NP fill:#e1ffe1
```

## 1. **External Traffic Flow (User → Pod)**

```mermaid
sequenceDiagram
    participant User
    participant Node as Node IP:30080
    participant Service as Service<br/>ClusterIP:80
    participant Pod as Pod<br/>containerPort:8080
    participant App as Application

    User->>Node: HTTP Request to<br/>NodeIP:30080
    Note over Node: NodePort Service<br/>nodePort: 30080
    Node->>Service: Forwards to<br/>Service port: 80
    Note over Service: Service matches selector<br/>app: myapp
    Service->>Pod: Routes to targetPort: 8080
    Note over Pod: kube-proxy does<br/>load balancing
    Pod->>App: Traffic reaches<br/>app listening on :8080
    App-->>Pod: Response
    Pod-->>Service: Response
    Service-->>Node: Response
    Node-->>User: Response
```

## 2. **ClusterIP Service (Inter-Pod Communication)**

```mermaid
graph LR
    subgraph "Namespace: default"
        subgraph "Frontend Pod"
            FE[Frontend App<br/>:3000]
        end

        subgraph "Backend Service"
            SVC[backend-service<br/>ClusterIP: 10.96.0.10<br/>port: 80<br/>targetPort: 8080]
        end

        subgraph "Backend Pods"
            BE1[Backend Pod 1<br/>:8080<br/>IP: 10.244.1.5]
            BE2[Backend Pod 2<br/>:8080<br/>IP: 10.244.2.8]
        end
    end

    FE -->|"GET http://backend-service:80"| SVC
    SVC -->|"Load balances to"| BE1
    SVC -->|"Load balances to"| BE2

    style FE fill:#e1f5ff
    style SVC fill:#fff4e1
    style BE1 fill:#e1ffe1
    style BE2 fill:#e1ffe1
```

## 3. **All Service Types Comparison**

```mermaid
graph TB
    subgraph "ClusterIP (Default)"
        direction TB
        CIP_User[Internal Pods Only]
        CIP_Service[Service: my-app<br/>ClusterIP: 10.96.0.1<br/>port: 80]
        CIP_Pod[Pod containerPort: 8080]

        CIP_User -->|"http://my-app:80"| CIP_Service
        CIP_Service -->|"targetPort: 8080"| CIP_Pod
    end

    subgraph "NodePort"
        direction TB
        NP_User[External User]
        NP_Node[Any Node IP<br/>NodePort: 30080]
        NP_Service[Service<br/>port: 80]
        NP_Pod[Pod containerPort: 8080]

        NP_User -->|"http://NodeIP:30080"| NP_Node
        NP_Node -->|"port: 80"| NP_Service
        NP_Service -->|"targetPort: 8080"| NP_Pod
    end

    subgraph "LoadBalancer"
        direction TB
        LB_User[External User]
        LB[Cloud Load Balancer<br/>External IP]
        LB_Node[NodePort: 30080]
        LB_Service[Service<br/>port: 80]
        LB_Pod[Pod containerPort: 8080]

        LB_User -->|"http://LoadBalancerIP:80"| LB
        LB --> LB_Node
        LB_Node --> LB_Service
        LB_Service -->|"targetPort: 8080"| LB_Pod
    end

    style CIP_Service fill:#e1f5ff
    style NP_Service fill:#fff4e1
    style LB_Service fill:#e1ffe1
```

## 4. **Real Example with All Port Numbers**

```mermaid
graph TB
    subgraph "External Access"
        User[User Browser]
        LB[LoadBalancer<br/>External IP: 203.0.113.10:443]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Worker Node 192.168.1.100"
            NP[NodePort: 30443]
        end

        subgraph "Service Layer"
            SVC["Service: nginx-service<br/>Type: LoadBalancer<br/>port: 443<br/>targetPort: 8080<br/>nodePort: 30443"]
        end

        subgraph "Pod: nginx-deployment-abc123"
            Container["Container: nginx<br/>containerPort: 8080"]
            App["NGINX listening<br/>on 0.0.0.0:8080"]
        end
    end

    User -->|"https://203.0.113.10:443"| LB
    LB -->|"Forwards to"| NP
    NP -->|"kube-proxy routes to"| SVC
    SVC -->|"Selects pod and forwards to"| Container
    Container -.->|"Traffic reaches"| App

    style User fill:#ff6b6b
    style LB fill:#4ecdc4
    style SVC fill:#ffe66d
    style Container fill:#95e1d3
    style App fill:#a8e6cf
```

## Key Concepts Explained

### **Port Types:**

1. **`containerPort`** (Pod spec)
   - Port your application actually listens on inside the container
   - This is just documentation; the container exposes whatever port the app uses
   - Example: Your Node.js app listens on port 8080

2. **`targetPort`** (Service spec)
   - Which port on the Pod to forward traffic to
   - Must match the `containerPort` (or the actual port your app uses)
   - Defaults to the same value as `port` if not specified

3. **`port`** (Service spec)
   - Port the Service listens on (within the cluster)
   - What other pods use to reach this service
   - Example: `http://my-service:80`

4. **`nodePort`** (NodePort/LoadBalancer Service)
   - Port exposed on every node's IP (range: 30000-32767)
   - Allows external access via `NodeIP:nodePort`

## 5. **DNS Resolution Flow**

```mermaid
sequenceDiagram
    participant Frontend as Frontend Pod
    participant DNS as CoreDNS
    participant Service as backend-service
    participant Pod1 as Backend Pod 1
    participant Pod2 as Backend Pod 2

    Frontend->>DNS: Resolve "backend-service"
    DNS-->>Frontend: Returns ClusterIP 10.96.0.10
    Frontend->>Service: HTTP GET to 10.96.0.10:80
    Note over Service: Service has endpoints:<br/>10.244.1.5:8080<br/>10.244.2.8:8080
    Service->>Pod1: Round-robin to 10.244.1.5:8080
    Pod1-->>Service: Response
    Service-->>Frontend: Response

    Note over Frontend,Pod2: Next request
    Frontend->>Service: HTTP GET to 10.96.0.10:80
    Service->>Pod2: Round-robin to 10.244.2.8:8080
    Pod2-->>Service: Response
    Service-->>Frontend: Response
```

## Practical Example:

Here's a complete working example:

```yaml
# Pod with containerPort
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.21
      ports:
        - containerPort: 80 # NGINX listens on port 80
          name: http

---
# ClusterIP Service (inter-pod communication)
apiVersion: v1
kind: Service
metadata:
  name: nginx-clusterip
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
    - port: 8080 # Service exposed on port 8080
      targetPort: 80 # Forwards to container port 80
      name: http

---
# NodePort Service (external access)
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - port: 8080 # Service port (cluster internal)
      targetPort: 80 # Pod's container port
      nodePort: 30080 # External access port
      name: http
```

**How traffic flows:**

**External user** → `NodeIP:30080` (NodePort) → Service `port: 8080` → Pod `targetPort: 80` (containerPort) → NGINX app

**Internal pod** → `nginx-clusterip:8080` (Service port) → Pod `targetPort: 80` (containerPort) → NGINX app
