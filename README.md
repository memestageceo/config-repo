# Kubernetes Learning Highlights

[![Netlify Status](https://api.netlify.com/api/v1/badges/2eaa1a2e-9c8f-4aa0-9507-9745171a88c4/deploy-status)](https://app.netlify.com/projects/docsops/deploys)

important:

- [sidecar with shell script](./kubernetes/k8s-exercises/01/06.yaml): the shell scripts I made were totally wrong, leading to repeated errors. And I was wrong about the sidecar container sequence.

## 1. Network Policies

Control traffic flow at the IP address or port level (OSI Layer 3/4). Requires a network plugin that supports enforcement.

### Key Concepts

- **Selection**: Uses `podSelector`, `namespaceSelector` (using labels like `kubernetes.io/metadata.name`), or `ipBlock`.
- **Empty podSelector**: Selects all pods in the namespace.
- **Egress/Ingress**: Define allowed destinations (`to`) or sources (`from`).

### Example: NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: np
  namespace: space1
spec:
  podSelector: {} # Selects all pods in space1
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              user: alice
          podSelector:
            matchLabels:
              role: client
        - ipBlock:
            cidr: 172.17.0.0/16
            except:
              - 172.17.1.0/24
      ports:
        - protocol: TCP
          port: 32000
          endPort: 32768
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: space2
      ports:
        - port: 53
          protocol: TCP
        - port: 53
          protocol: UDP
```

---

## 2. RBAC (Role-Based Access Control)

Regulates access based on roles. Permissions are strictly additive (no "deny" rules).

### Components

- **Role / ClusterRole**: Define a set of permissions (rules).
- **RoleBinding / ClusterRoleBinding**: Grant permissions to users, groups, or service accounts.
- **Aggregation**: Combine multiple ClusterRoles using `aggregationRule`.

### Service Accounts

- **User prefix**: `system:serviceaccount:` (singular).
- **Group prefix**: `system:serviceaccounts:` (plural).

### CLI Operations

```bash
# Verify permissions
kubectl auth can-i list pods --as=system:serviceaccount:dev:foo -n prod

# Create Roles and Bindings
kubectl create clusterrole "foo" --verb=get --non-resource-url=/logs/*
kubectl create rolebinding my-sa-view --clusterrole=view --serviceaccount=my-namespace:my-sa -n my-namespace

# View system discovery roles
kubectl get clusterroles system:discovery -o yaml
```

### Aggregation Example

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.example.com/aggregate-to-monitoring: "true"
rules: [] # Control plane fills this automatically
```

---

## 3. Scheduling & Node Selection

### Selection Methods

1. **nodeSelector**: Simple label matching.
2. **Affinity/Anti-affinity**: Expressive rules (Required vs. Preferred).
3. **nodeName**: Direct scheduling to a specific node.
4. **Topology Spread Constraints**: Control distribution across zones/hosts.

### Node Affinity Types

- `requiredDuringSchedulingIgnoredDuringExecution`: Hard requirement.
- `preferredDuringSchedulingIgnoredDuringExecution`: Soft requirement (uses `weight` 1-100).
- **Multiple terms**: Terms in `nodeSelectorTerms` are **ORed**.

### PriorityClasses

Defines importance and preemption behavior.

- `value`: Higher is more important.
- `preemptionPolicy`: `PreemptLowerPriority` (default) or `Never`.
- `globalDefault`: Applies to pods without a `priorityClassName`.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
preemptionPolicy: Never # Placed in queue ahead of others, but won't preempt
globalDefault: false
```

---

## 4. Admission Controllers

Plugins that intercept requests to the API server after authentication but before object persistence.

### Configuration

- **Enable**: `kube-apiserver --enable-admission-plugins=NamespaceLifecycle,LimitRanger...`
- **Disable**: `kube-apiserver --disable-admission-plugins=PodNodeSelector,AlwaysDeny...`
- **Check Status**: `ps -ef | grep kube-apiserver | grep admission-plugins`

### Important Plugins

- **NamespaceLifecycle**: Ensures requests to non-existent namespaces are rejected and prevents deletion of default namespaces (`default`, `kube-system`, `kube-public`). *Replaces deprecated NamespaceExists and NamespaceAutoProvision.*
- **NodeRestriction**: Prevents kubelets from modifying specific labels.
- **Mutating/Validating Webhooks**: Allow external custom logic.

---

## 5. Pod & Container Configuration

### Downward API

Expose pod or container metadata to the environment.

```yaml
env:
  - name: MY_NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  - name: MY_CPU_REQUEST
    valueFrom:
      resourceFieldRef:
        containerName: test-container
        resource: requests.cpu
```

### Projected Volumes

Map multiple volume sources into a single directory.

```yaml
volumes:
  - name: all-data
    projected:
      sources:
        - serviceAccountToken:
            path: token
        - configMap:
            name: app-config
            items:
              - key: log-level
                path: log-level.txt
        - secret:
            name: db-secret
            items:
              - key: username
                path: nested/db/user # Nested directory structure
```

### Image Pull Secrets

Required for private registries.

```bash
# Create secret from docker login
kubectl create secret docker-registry myregistrykey \
  --docker-server=<registry> \
  --docker-username=<user> \
  --docker-password=<pass>
```

```yaml
spec:
  imagePullSecrets:
    - name: myregistrykey
  containers:
    - name: foo
      image: janedoe/awesomeapp:v1
```

### Security Context

- **Pod level**: Applies to all containers (e.g., `fsGroup`).
- **Container level**: Supports `capabilities` (e.g., `NET_ADMIN`, `SYS_TIME`).

```yaml
securityContext:
  capabilities:
    add: ["NET_ADMIN", "SYS_TIME"]
```

---

## 6. Cluster Administration & Troubleshooting

### Networking Discovery

```bash
# Find node interface for specific IP
ip a | grep -B2 192.23.97.3

# Check etcd connections
netstat -anp | grep etcd

# CNI locations
# Binaries: /opt/cni/bin/
# Config: /etc/cni/net.d/

# Find IP Ranges
# Pod CIDR: Found in CNI config files in /etc/cni/net.d/
# Service IP Range: --service-ip-range flag in kube-apiserver.yaml
```

### System Configuration

- **Sysctl**: `sudo sysctl --write net.ipv4.ip_forward=1` (required for `kubeadm init`).
- **Kubelet**: Check `service kubelet status` for flags and config paths.
- **Metrics Server (Kind)**: Patch to allow insecure TLS.

  ```bash
  kubectl patch deployment metrics-server -n kube-system --type='json' \
    -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
  ```

---

## 7. Helm & Operations

### Helm Commands

```bash
helm history <release>           # Check versions
helm rollback <release> [ver]    # Rollback to previous or specific version
helm upgrade <release> <chart> --version="x.x.x"
```

### Advanced Kubectl & Command Chaining

```bash
# Recursive apply
kubectl apply -f project/k8s/ --recursive
kubectl apply -f project/k8s/development --recursive

# Chain multiple commands to get created resources
kubectl get $(kubectl create -f docs/concepts/cluster-administration/nginx/ -o name | grep service/)
kubectl create -f docs/concepts/cluster-administration/nginx/ -o name | grep service/ | xargs -i kubectl get '{}'

# Autoscale based on CPU (requires metrics server)
kubectl autoscale deployment/my-nginx --min=1 --max=3
```

### Updating Without Outage (Rolling Updates)

1. **Initial Deployment**:

   ```bash
   kubectl create deployment my-nginx --image=nginx:1.14.2
   ```

2. **Configure Scaling & Strategy**:

   ```bash
   # Set replicas
   kubectl scale --replicas 1 deployments/my-nginx --subresource='scale' --type='merge' -p '{"spec":{"replicas": 1}}'

   # Set maxSurge to 100% for faster rolling update
   kubectl patch deployment my-nginx --type='merge' -p '{"spec":{"strategy":{"rollingUpdate":{"maxSurge": "100%" }}}}'
   ```

3. **Perform Update**:

   ```bash
   # Update image using edit or patch
   kubectl edit deployment/my-nginx
   # OR
   kubectl patch deployment my-nginx -p '{"spec":{"template":{"spec":{"containers":[{"name":"nginx","image":"nginx:1.16.1"}]}}}}'
   ```

4. **Monitor Rollout**:

   ```bash
   # Deployment status
   kubectl rollout status deployment/my-deployment --timeout 10m

   # StatefulSet status (no watch)
   kubectl rollout status statefulsets/backing-stateful-component --watch=false
   ```

### Best Practices for Readiness & Startup

- **Startup Probes**: Use for apps with heavy initial CPU spikes.
- **Readiness Probes**: Use `initialDelaySeconds` to allow CPU spikes to subside before reporting ready.
- **HPA Tuning**: Set `--horizontal-pod-autoscaler-cpu-initialization-period` to cover the expected startup duration.

---

## 8. Storage

- **VolumeBindingMode: WaitForFirstConsumer**: Used in `local-path` storage classes to delay binding until a Pod is scheduled.
- **hostPath**: Use `type: DirectoryOrCreate` to ensure the path exists on the host.

```yaml
hostPath:
  path: /log
  type: DirectoryOrCreate
```

---

Networking and Ports

Used netstat -p vs netstat -nptl; the -nptl variant helped identify the port used by the scheduler.

---

Container Runtime Endpoint

There was an issue identifying the container runtime endpoint. The relevant configuration is located at:

/var/lib/kubelet/config.yaml

---

Node Networking

To find the IP address and subnet mask of the control plane node’s primary interface:

ip addr show eth0

---

kube-proxy Mode

To determine which proxy mode kube-proxy is using:

kubectl -n kube-system logs kube-proxy-aser | head

---

CoreDNS (Corefile Understanding)

Need a clearer understanding of the Corefile, especially the root domain (.) and how requests are handled.

Corefile: |
  .:53 {
      errors
      health {
          lameduck 5s
      }
      ready
      kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
          ttl 30
      }
      prometheus :9153
      forward . /etc/resolv.conf {
          max_concurrent 1000
      }
      cache 30
      loop
      reload
      loadbalance
  }

---

Helm

Upgrade command used:

helm upgrade dazzling-web bitnami/nginx --version=18.3.6

---

Strategic Merge Patch (Delete Container)

To remove a container from a Deployment using a patch:

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  template:
    spec:
      containers:
        - $patch: delete
          name: Memcached

---

ConfigMap Volume Mount Gotcha

When mounting a ConfigMap as a volume, the filename comes from the key, not the value.

In this case:

ConfigMap entry: .data.config.conf: kubeconfig.conf

Mounted file name becomes: config.conf

The issue occurred because the configuration referenced the wrong filename.

---

JSONPath in kubectl

Discovered conditional expressions in JSONPath; needs more practice.

Example:

kubectl config view \
  --kubeconfig=my-kube-config \
  -o jsonpath="{.contexts[?(@.context.user=='aws-user')].name}" \
  > /opt/outputs/aws-context-name

Reference:
<https://kubernetes.io/docs/reference/kubectl/jsonpath/>
