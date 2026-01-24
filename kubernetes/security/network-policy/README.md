# Kubernetes NetworkPolicy — Notes

## killerkoda

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: np
  namespace: space1
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: space2
    - ports:
        - port: 53
          protocol: TCP
        - port: 53
          protocol: UDP
```

## Selector Logic

- Empty `podSelector`: an empty `podSelector: {}` selects all pods within the namespace.
- Namespace & pod combinations:
  - Combining `namespaceSelector` and `podSelector` in a single item means the traffic must come from a pod with that label inside a namespace with that label (AND logic).
- Reserved labels:
  - `kubernetes.io/metadata.name` is a default label on namespaces and can target a specific namespace by name.

## Configuration Examples

### Combining Namespace and Pod Selectors

Allows ingress from pods labeled `role: client` only if they reside in namespaces labeled `user: alice`.

```yaml
# Example NetworkPolicy fragment
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            user: alice
        podSelector:
          matchLabels:
            role: client
```

### Allow All Ingress

Select all pods (`podSelector: {}`) and allow all sources.

```yaml
spec:
  podSelector: {}
  ingress:
    - {}
  policyTypes:
    - Ingress
```

### IP-Based Policies (CIDR)

Use `ipBlock` to allow traffic from network ranges, with optional exclusions.

```yaml
ingress:
  - from:
      - ipBlock:
          cidr: 172.17.0.0/16
          except:
            - 172.17.1.0/24
```

### Port Ranges

Use `endPort` to specify a range of ports.

```yaml
ports:
  - protocol: TCP
    port: 32000
    endPort: 32768
```

## Additional Notes

- Pay attention to list structure when combining selectors; incorrect indentation/listing changes semantics.
- Use `namespaceSelector` with `kubernetes.io/metadata.name` to target a namespace by name.
