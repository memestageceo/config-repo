# Kubernetes Notes

## pv pvc & I

Scenario	Command	Result
PV stuck in Released	kubectl edit pv <name> → remove claimRef	Status: Available
PVC stuck in Terminating	kubectl delete deployment <name> first	PVC can then delete
Need to reuse PV data	Remove claimRef + create new PVC	New PVC binds to existing PV

## gateway api

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-ui-to-evolution
  namespace: pokedex-core            # TARGET namespace (where Service lives)
spec:
  from:
  - group: gateway.networking.k8s.io  # HTTPRoute group
    kind: HTTPRoute                   # Source resource type
    namespace: pokedex-ui             # SOURCE namespace
  to:
  - group: ""                         # Core API (empty string)
    kind: Service                     # Target resource type
    name: evolution-engine            # Specific service (secure!)
```

```text
Before ReferenceGrant:
┌─────────────────┐          ┌──────────────────┐
│  pokedex-ui     │          │  pokedex-core    │
│                 │          │                  │
│ [HTTPRoute] ────X──────→   │ [Service]        │
│  trainer-api    │  BLOCKED │  evolution-      │
│  -route         │          │  engine          │
└─────────────────┘          └──────────────────┘

After ReferenceGrant:
┌─────────────────┐          ┌──────────────────┐
│  pokedex-ui     │          │  pokedex-core    │
│                 │          │                  │
│ [HTTPRoute] ────✅────→    │ [ReferenceGrant] │
│  trainer-api    │  ALLOWED │      +           │
│  -route         │          │ [Service]        │
│                 │          │  evolution-      │
│                 │          │  engine          │
└─────────────────┘          └──────────────────┘

# traffic mirroring

                  User Request
                       ↓
                  [Gateway]
                       ↓
                  [HTTPRoute]
                       ↓
         ┌─────────────┴─────────────┐
         ↓                           ↓
    [api-v1]                     [api-v2]
    Primary Backend              Mirror Backend
         ↓                           ↓
    Response sent               Response discarded
    to user ✅                  (testing only) 🔬


```

example: two deployments/svc
- svc: main, mirror
- requestMirror -> send request to both, but take response only from main.
```yaml
    filters:
    - type: RequestMirror
      requestMirror:
        backendRef:
          name: foo-v2
          port: 8080
```
Feature	Traffic Mirroring	Canary Deployment
User Impact	Zero - users never see mirror backend	Some users see new version
Response Handling	Mirror responses discarded	All responses sent to users
Risk Level	Zero risk	Low risk (affects canary %)
Use Case	Testing without user impact	Gradual rollout to users
Rollback	Delete filter	Adjust traffic weights

Feature	Traffic Mirroring	Blue/Green
Environments	Both active simultaneously	Switch between environments
Testing	Continuous with real traffic	Test in staging, then switch
Rollback	Remove mirror filter	Switch back to blue
Cost	Same (both running)	Same (both running)

## helm

```bash
helm get values release_name --all

helm show values repo/chart

# Generate template without CRDs
helm template argocd argocd/argo-cd \
  --version 9.1.4 \
  --namespace argocd \
  --skip-crds \
  > /root/argo-helm.yaml

```

```text
Pod Creation
    ↓
Kubelet calls CNI Plugin
    ↓
CNI Plugin allocates IP from IPAM
    ↓
Creates veth pair (pod ↔ node)
    ↓
Configures routing and iptables
    ↓
Pod has network connectivity

```

```sh
#!/bin/bash

# Static pods have ownerReferences with kind=Node (managed directly by kubelet).
# We iterate over all pods in all namespaces and filter by that owner kind.

kubectl get pods -A --no-headers 2>/dev/null | \
while read -r NAMESPACE NAME READY STATUS RESTARTS AGE; do

    OWNER_KIND=$(kubectl get pod "$NAME" -n "$NAMESPACE" \
        -o jsonpath='{.metadata.ownerReferences[0].kind}' 2>/dev/null)

    if [[ "$OWNER_KIND" == "Node" ]]; then
        printf "%-20s %-30s %-10s %-10s %s\n" \
            "$NAMESPACE" "$NAME" "$STATUS" "$RESTARTS" "$AGE"
    fi

done
```

```
grep -e vs -E
```

## Security & Authentication

### ServiceAccount Token Mounting

A security audit found that the `web-dashboard` Deployment has a non-compliant ServiceAccount token setup. The default automatic token mounting mechanism exposes credentials unnecessarily.

Fix: disable automatic token mounting on the ServiceAccount, then manually inject the token into the Deployment using a projected volume.

Using bitnami/kubectl image — exec into it and it works:

```sh
kubectl get pod --token="$token" --server="https://kubernetes:443" --insecure-skip-tls-verify
```

Reference: <https://chat.deepseek.com/a/chat/s/e6f2e853-5377-4b15-9e2c-2cd5553437d1>

### Authorization

If `kubectl get pod` gives an authorization error, check the kube-apiserver flag:

```sh
--authorization-mode=AlwaysDeny
```

### Certificate Management

```sh
kubeadm certs check-expiration
kubeadm certs renew
kubeadm config images list
```

**Flow:** CA renewed → All certs invalid → renew all → restart everything

Regenerate a deleted certificate (e.g. apiserver key/cert) using `kubeadm init phase`:

```sh
sudo kubeadm init phase certs apiserver  # generates crt/key
```

> I had no idea about managing certs with kubeadm this way — I'd used it to check expiration or renew, but never thought to regenerate a deleted certificate. The `init phase` approach was completely new to me.

#### CSR Workflow

1. Generate Private Key (4096-bit RSA)
2. Create CSR with CN and O fields
3. Submit CertificateSigningRequest to Kubernetes API
4. Admin approves: `kubectl certificate approve`
5. Extract signed certificate from CSR status
6. Valid X.509 Client Certificate
7. Authentication to Kubernetes API Server

```sh
openssl req -new \
  -key siddhi.shelke01.key \
  -out siddhi.shelke01.csr \
  -subj "/CN=siddhi.shelke01/O=gameforge-studios"

kubectl config set-credentials siddhi.shelke01 \
  --client-certificate=/root/gameforge-onboarding/siddhi.shelke01.crt \
  --client-key=/root/gameforge-onboarding/siddhi.shelke01.key \
  --embed-certs=true

# used --raw here. what's the diff vs --embed-certs?

kubectl config view --minify \
  --flatten \
  --context=siddhi-mecha-dev > /root/gameforge-onboarding/siddhi-kubeconfig.yaml
```

---

## Networking & DNS

### CoreDNS

- **What is the IP of the CoreDNS server that should be configured on pods to resolve services?**
- **What is the root domain/zone configured for this cluster?** (need to understand the Corefile)

What is `defaultMode` here?

```yaml
volumes:
  - configMap:
      defaultMode: 420
      items:
        - key: Corefile
          path: Corefile
      name: coredns
    name: config-volume
```

CoreDNS forwarding example:

```
forward . 8.8.8.8 1.1.1.1
nslookup kubernetes.io 8.8.8.8
```

### DNS / nslookup

For `nslookup`: if the record exists you get the FQDN and IP, otherwise `NXDOMAIN`.

```
Server:  172.20.0.10
Address: 172.20.0.10#53

Name:    mysql.payroll.svc.cluster.local
Address: 172.20.251.60
```

```sh
k exec pod/hr -- nslookup mysql.payroll.pod.cluster.local
# Server:  172.20.0.10
# Address: 172.20.0.10#53
# ** server can't find mysql.payroll.pod.cluster.local: NXDOMAIN
# command terminated with exit code 1
```

Note: pod DNS lookups use `<pod-ip>.<namespace>.pod.cluster.local` — using service FQDN format for pods won't work.

### Debugging Services

Reference: [Debug Services | Kubernetes](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)

- Test endpoints directly:
  ```sh
  for ep in 10.244.0.5:9376 10.244.0.6:9376 10.244.0.7:9376; do wget -qO- $ep; done
  for i in $(seq 1 3); do wget -qO- 10.0.1.175:80; done
  ```
- Check `nslookup kubernetes.default`
- If fully-qualified name lookups work but relative ones don't, check `/etc/resolv.conf` in the pod:
  ```
  nameserver 10.0.0.10
  search default.svc.cluster.local svc.cluster.local cluster.local example.com
  options ndots:5
  ```
  - `nameserver` must point to the cluster's DNS Service (passed via `--cluster-dns` kubelet flag)
  - `options ndots:5` must be high enough for the DNS client to consider search paths
  - Cluster suffix is set via `--cluster-domain` kubelet flag
- Check kube-proxy: `ps auxw | grep kube-proxy`
- Check kubelet: `ps auxw | grep kubelet`
- Check iptables rules:
  ```sh
  iptables-save | grep hostnames
  ```
  For each Service port there should be 1 rule in `KUBE-SERVICES` and one `KUBE-SVC-<hash>` chain. For each Pod endpoint, a small number of rules in `KUBE-SVC-<hash>` and one `KUBE-SEP-<hash>` chain.
- IPVS mode: `ipvsadm -ln`
- To debug kube-proxy, restart it with `-v=4` and check logs again.
- Hairpin mode must be `hairpin-veth` or `promiscuous-bridge` for endpoints to load-balance back to their own Service VIP.
- If node configuration errors appear, double-check Node configuration and installation steps.

### NetworkPolicy

Task: Create a NetworkPolicy `ingress-to-nptest` in the `default` namespace that allows ingress traffic from all sources to the `np-test-1` pod on port 80. A `default-deny` NetworkPolicy is currently blocking all ingress.

> Important: Don't delete any current objects deployed.

### Ingress

```sh
k create ingress critical-ingress \
  --rule=/pay*=pay-service:8282 \
  --annotation nginx.ingress.kubernetes.io/rewrite-target=/ \
  --annotation=nginx.ingress.kubernetes.io/ssl-redirect=false
```

### Traffic Splitting & Canary Deployments

Task: Configure `web-route` to split traffic — 80% to `web-service` and 20% to `web-service-v2`.

> Note: `web-gateway`, `web-service`, and `web-service-v2` have already been created.

Two approaches for canary deployments:

1. **Gateway API HTTPRoute weights** — 80%/20% split to stable and canary versions
2. **Single service with replica ratio** — `stable.replicas=8`, `canary.replicas=2`, routing round-robin via one service

Reference:
- <https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#create-horiz…>
- <https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-…>

### Gateway API — Bullet Train Example

Configure Kubernetes Gateway API for Bullet Train Services.

Official Kubernetes Documentation: [Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/), [HTTP Routing](https://gateway-api.sigs.k8s.io/guides/http-routing/)

The Japan Railway (JR) has deployed three microservices in `jp-bullet-train-app-prod`:

- `available` — Real-time train availability
- `books` — Booking status
- `travellers` — Passenger manifest

Expose these services externally using the Kubernetes Gateway API with TLS termination and path-based routing. Wait 1 minute for MetalLoadBalancer to set up the gateway.

#### Task 1: Create the Gateway

Create a Gateway named `bullet-train-gateway` in namespace `jp-bullet-train-gtw`:

- GatewayClassName: `nginx`
- Listener Protocol: `HTTPS`, Port: `443`, Hostname: `bullet.train.io`
- TLS Mode: `Terminate`
- TLS Certificate: reference existing Secret `bullet-train-tls` in the same namespace

> Note: The TLS secret `bullet-train-tls` has already been created in `jp-bullet-train-gtw`.

#### Task 2: Create the HTTPRoute

Create an HTTPRoute named `bullet-train-route` in namespace `jp-bullet-train-gtw`:

- Parent Gateway: `bullet-train-gateway`
- Hostname: `bullet.train.io`
- Routes (PathPrefix match):
  - `/available` → `available:80` in `jp-bullet-train-app-prod`
  - `/books` → `books:80` in `jp-bullet-train-app-prod`
  - `/travellers` → `travellers:80` in `jp-bullet-train-app-prod`

#### Task 3: Configure Local DNS

Edit `/etc/hosts` and add an entry mapping `bullet.train.io` to the Gateway's LoadBalancer IP, then test with `curl -k`.

#### Task 4: Validation Test

```bash
#!/bin/bash
echo "Testing Available Trains:"
curl -sk https://bullet.train.io/available | jq

echo -e "\nTesting Bookings:"
curl -sk https://bullet.train.io/books | jq

echo -e "\nTesting Travellers:"
curl -sk https://bullet.train.io/travellers | jq
```

### Topology Spread Constraints

Reference: <https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/>

Use to:
- Distribute pods evenly across nodes/zones
- Avoid single-node concentration
- Improve high availability

```
Without topologySpreadConstraints:
-----------------------------------
Scheduler → May place all Pods on one node
  tokyo-a-server: 7 Pods ❌ (all eggs in one basket)
  tokyo-b-server: 0 Pods

With topologySpreadConstraints (maxSkew: 1, minDomains: 2):
------------------------------------------------------------
Scheduler → Balances Pods across domains
  tokyo-a-server: 4 Pods ✓
  tokyo-b-server: 3 Pods ✓
  Difference: 1 (satisfies maxSkew: 1)
```

---

## Workloads & Scheduling

### Deployments

- The controllers for a deploy are in conflict and behave unexpectedly when ~~multiple deployments have the same labels or selectors~~.
- The ~~pod-template-hash~~ label is added by the Deployment controller to every ReplicaSet it creates or adopts.
- A Deployment's rollout is triggered if and only if ~~the Deployment's Pod template (`.spec.template`) is changed~~, e.g. labels or container images are updated.
- To check rollout status: ~~`kubectl rollout status deployment/nginx-deployment`~~
- Deployment ensures at most 125% of desired Pods are up (25% max surge) by default.
  - `StrategyType: RollingUpdate`, `MinReadySeconds: 0`, `RollingUpdateStrategy: 25% max unavailable, 25% max surge`
- Kubernetes doesn't count ~~terminating Pods~~ when calculating `availableReplicas` (must be between `replicas - maxUnavailable` and `replicas + maxSurge`).
- If you update a Deployment mid-rollout, it creates ~~a new ReplicaSet~~ and starts scaling it up, rolling over the previous one (added to old ReplicaSets and scaled down).
- A Deployment's ~~label selector~~ is immutable after creation.
- All rollout history is kept by default (configurable via revision history limit).
- When rolling back, only the ~~Pod template~~ part is rolled back.
- `CHANGE-CAUSE` is copied from the ~~`kubernetes.io/change-cause`~~ annotation to its revisions upon creation:
  ```sh
  kubectl annotate deployment/nginx-deployment kubernetes.io/change-cause="image updated to 1.16.1"
  kubectl annotate deployment nginx-deploy kubernetes.io/change-cause="Updated nginx image to 1.17"
  ```
- To undo to a specific revision: ~~`kubectl rollout undo deployment/nginx-deployment --to-revision=2`~~
- To pause updates: ~~`kubectl rollout pause`~~
- When multiple RS exist for a Deployment and an update arrives, replicas are distributed via ~~proportional scaling~~:
  - If the autoscaler increments replicas to 15 (adding 5), proportional scaling spreads them across all ReplicaSets. Bigger proportions go to RS with more replicas, smaller to RS with fewer. Leftovers go to the RS with the most replicas. RS with zero replicas are not scaled up.

### Horizontal Pod Autoscaler (HPA)

Task: Create HPA `api-hpa` for deployment `api-deployment` in namespace `api`.

- Metric: custom metric `requests_per_second`, targeting average value of **1000 req/s** across all pods
- Min replicas: 1, Max replicas: 20

> Note: Ignore errors about `requests_per_second` not being tracked in metrics-server.

Reference: <https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/>

### Taints & Tolerations

Task:
1. Taint `node01` as Unschedulable
2. Create pod `dev-redis` (image: `redis:alpine`) — should NOT be scheduled on `node01`
3. Create pod `prod-redis` (image: `redis:alpine`) — WITH toleration to schedule on `node01`

Toleration: `key=env_type`, `value=production`, `operator=Equal`, `effect=NoSchedule`

### Resource Field References

```yaml
- name: APP_MEM_REQUEST
  valueFrom:
    resourceFieldRef:
      containerName: frontend-app
      resource: requests.memory
      divisor: 1Mi
```

> `divisor` is new to me — requires investigation!

### Pod Network CIDR

Task: Identify the pod subnet configured cluster-wide (`podSubnet` in kubeadm config). Output the CIDR in `x.x.x.x/x` format to `/root/pod-cidr.txt`.

> Note: Use `podSubnet` from the `kubeadm-config` ConfigMap, not the per-node CIDR from `kubectl get node`.

---

## Debugging & Troubleshooting

### CNI Plugin Not Initialized

When a CNI plugin isn't initialized, check:

1. Events on the node
2. Logs of CoreDNS
3. `journalctl -u kubelet | grep -i cni`

Example error:

```
Apr 08 03:08:53 controlplane kubelet[2296]: E0408 03:08:53.478960 2296 kubelet.go:3130] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady message:Network plugin returns error: cni plugin not initialized"
```

> Lesson: In a task where all pods were in `Pending` state, I checked `kube-system`, saw weave running, and assumed CNI was configured — but it wasn't. `/etc/cni/net.d` had no configuration. Should have checked kubelet logs sooner.

### kube-proxy Troubleshooting

**Troubleshooting Test 2:** Two-tier application not displaying the green success page. Diagnose and fix. Stick to the given architecture — use the same names and port numbers. Feel free to edit, delete, or recreate objects as necessary.

- Is kube-proxy running?
- Was the kube-proxy DaemonSet edited correctly?

Steps taken:
- Checked pods & services — all running
- Found `kube-proxy` FAILED in `kube-system` namespace
- Checked pod logs → `../../configuration.conf not found`
- Checked DS and CM for kube-proxy → found the issue

The ConfigMap had `config.conf: ...` so the file name is `config.conf`, but the DS was referencing a wrong path. Fixed the file name in the kube-proxy DS → resolved!

### kubectl debug

Reference: [Determine the Reason for Pod Failure | Kubernetes](https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/)

**Termination messages:**

- Kubernetes reads from `terminationMessagePath` (default: `/dev/termination-log`)
- Custom path: `terminationMessagePath: "/tmp/my-log"`
- `terminationMessagePolicy: FallbackToLogsOnError` — uses last chunk of container log if termination file is empty and container exited with error
- Example: `args: ["-c", "sleep 10 && echo Sleep expired > /dev/termination-log"]`

Init containers running shell scripts can print commands as they execute — use `set -x` at the beginning of the Bash script.

**Ephemeral debug container:**

```sh
kubectl debug -it ephemeral-demo --image=busybox:1.28 --target=ephemeral-demo
# --target targets the process namespace of another container
# (required since kubectl run doesn't enable process namespace sharing)
```

**Copy pod for debugging:**

```sh
kubectl debug myapp -it --image=ubuntu --share-processes --copy-to=myapp-debug
kubectl attach
# --share-processes: allows containers in this Pod to see processes from other containers

kubectl debug myapp -it --copy-to=myapp-debug --container=myapp -- sh
kubectl debug myapp --copy-to=myapp-debug --set-image=*=ubuntu
# *=ubuntu: change the image of all containers to ubuntu
```

**Debug a node:**

```sh
kubectl debug node/mynode -it --image=ubuntu
# Node's root filesystem is mounted at /host
# Runs in host IPC, Network, and PID namespaces (not privileged by default)
# For privileged: create pod manually or use --profile=sysadmin

kubectl debug --profile=sysadmin node/NODE_NAME -it --image=ubuntu:latest
apt-get update && apt-get install -y tcpdump
tcpdump -i any -n
```

**Debug pod with sysadmin profile:**

```sh
kubectl debug --profile=sysadmin pod/POD_NAME -n NAMESPACE -it --image=ubuntu:latest
grep Cap /proc/self/status
kubectl get pod myapp -o jsonpath='{.spec.ephemeralContainers[0].securityContext}'

kubectl debug -it myapp --image=busybox:1.28 --target=myapp --profile=general --custom=custom-profile.yaml
```

**Worker node log locations:**

- `/var/log/kubelet.log` — kubelet logs (responsible for running containers)
- `/var/log/kube-proxy.log` — kube-proxy logs (directing traffic to Service endpoints)

---

## Cluster Setup & Maintenance

### kubeadm init

```sh
sudo kubeadm init \
  --apiserver-advertise-address=10.244.253.190/32 \
  --apiserver-cert-extra-sans=controlplane \
  --pod-network-cidr=172.17.0.0/16 \
  --service-cidr=172.20.0.0/16
```

Kubernetes version pinned: `version="1.34.0-1.1"`

### CRI / sysctl Setup

```sh
sudo systemctl is-active cri-docker.socket
sudo ls -la /run/cri-dockerd.sock
sudo crictl --runtime-endpoint unix:///run/cri-dockerd.sock version

sudo tee /etc/sysctl.d/99-kubernetes-cri.conf <<EOF
net.bridge.bridge-nf-call-iptables = 1
net.ipv6.conf.all.forwarding = 1
net.ipv4.ip_forward = 1
net.netfilter.nf_conntrack_max = 131072
EOF

sudo sysctl --system
sudo sysctl -p /etc/sysctl.d/99-kubernetes-cri.conf
```

---

## Tips & Quick Reference

### Common Mistakes

Most mistakes are **not** knowledge gaps. Mine were:

- Forgetting `sysctl -p`
- Adding extra fields not asked for
- Misreading *colocated* vs *sidecar*:
  - **colocated**: configured as a regular container
  - **sidecar**: `initContainer` with `restartPolicy: Always`

### Useful Commands

```sh
# Compare local YAML with live object
diff <(cat nginx.yaml) <(kubectl get pod nginx -o yaml)

# Check endpoint slices for a service
kubectl get endpointslices -l kubernetes.io/service-name=SERVICE_NAME

# Check kube-proxy process
ps auxw | grep kube-proxy

# Specify the editor for kubectl edit
export EDITOR=vim   # or set KUBE_EDITOR
```

**Create resources from a directory and filter by type:**

```sh
kubectl get $(kubectl create -f docs/concepts/cluster-administration/nginx/ -o name | grep service/)

# Alternative with xargs
kubectl create -f docs/concepts/cluster-administration/nginx/ -o name | grep service/ | xargs -i kubectl get '{}'
```

**Using `hostPort`:** When you bind a Pod to a `hostPort`, there are a limited number of places it can be scheduled. In most cases `hostPort` is unnecessary — use a Service object instead. If required, you can only schedule as many Pods as there are nodes in your cluster.

**Pod stuck in Terminating:** Check if the cluster has any `ValidatingWebhookConfiguration` or `MutatingWebhookConfiguration` that target `UPDATE` operations for pod resources.
