# Role-Based Access Control (RBAC) — Core Concepts

Role-based access control (RBAC) regulates access to resources based on users' roles. It uses the `rbac.authorization.k8s.io` API group.

## API Objects

The RBAC API defines four Kubernetes objects:

- **Role** — Namespaced permissions.
- **ClusterRole** — Cluster-wide permissions or permissions for non-resource URLs.
- **RoleBinding** — Grants permissions within a specific namespace.
- **ClusterRoleBinding** — Grants permissions cluster-wide.

## Key Rules

- **Additive only:** Permissions are purely additive; there are no "deny" rules.
- **Immutable `roleRef`:** Once a binding is created, the `roleRef` cannot be changed.
- **Discovery:** Default cluster role bindings allow public access to basic API info. Disable with `--anonymous-auth=false`.

## Configuration & Enabling RBAC

Enable RBAC by starting the API server with:

```text
--authorization-mode=...,RBAC
```

Or via an authorization configuration file:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AuthorizationConfiguration
authorizers:
  - type: RBAC
```

## Roles and Aggregation

### Aggregated ClusterRoles

Aggregated ClusterRoles allow a "parent" ClusterRole to automatically inherit rules from other ClusterRoles using label selectors.

Example: the parent role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring
aggregationRule:
  clusterRoleSelectors:
    - matchLabels:
        rbac.example.com/aggregate-to-monitoring: "true"
rules: [] # Automatically filled by control plane
```

Example: a contributor role that aggregates to system roles

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: aggregate-cron-tabs-edit
  labels:
    rbac.authorization.k8s.io/aggregate-to-admin: "true"
    rbac.authorization.k8s.io/aggregate-to-edit: "true"
rules:
  - apiGroups: ["stable.example.com"]
    resources: ["crontabs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Resource & URL Scoping

Specific resources and names:

```yaml
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["my-configmap"] # Limit to specific instance
```

Non-resource URLs (useful for health/logging endpoints):

```yaml
rules:
  - nonResourceURLs: ["/healthz", "/healthz/*"]
    verbs: ["get", "post"]
```

## User & Service Account Identifiers

- ServiceAccount usernames are prefixed with `system:serviceaccount:` (singular).
- ServiceAccount groups are prefixed with `system:serviceaccounts:` (plural).

## Common CLI Commands (kubectl)

Creating roles & bindings:

```bash
# Non-resource URL ClusterRole
kubectl create clusterrole "foo" --verb=get --non-resource-url=/logs/*

# Aggregated ClusterRole
kubectl create clusterrole monitoring --aggregation-rule="rbac.example.com/aggregate-to-monitoring=true"

# Bind to a ServiceAccount
kubectl create rolebinding my-sa-view \
  --clusterrole=view \
  --serviceaccount=my-namespace:my-sa \
  --namespace=my-namespace

# Bind to all ServiceAccounts in a namespace
kubectl create rolebinding serviceaccounts-view \
  --clusterrole=view \
  --group=system:serviceaccounts:my-namespace \
  --namespace=my-namespace

# Management examples
kubectl auth reconcile
kubectl get clusterroles system:discovery -o yaml
```

## Security & Escalation Prevention

Kubernetes prevents privilege escalation by restricting who can create/update roles. You can modify a role only if one of the following applies:

- You already have all permissions contained in that role at the same scope.
- You have the `escalate` verb on the `roles` or `clusterroles` resource.
- You have the `bind` verb on a referenced role to create a binding.
