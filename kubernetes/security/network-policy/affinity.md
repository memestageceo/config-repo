# Kubernetes Pod Assignment Reference

## Overview

Pod assignment allows you to constrain or prefer specific nodes for Pod scheduling using label selectors. Key methods include nodeSelector, Affinity/Anti-affinity, nodeName, and Pod topology spread constraints.

## KillerKoda

when using preferred affinity type, additional fields required - especially weight.

```yaml
# for podAffinity or podAntiAffinity
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: security
              operator: In
              values:
              - S2
          topologyKey: topology.kubernetes.io/zone

# for nodeAffinity
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: label-1
            operator: In
            values:
            - key-1

```

## Pod Priority and Preemption

Priority indicates the importance of a Pod relative to other Pods. If a Pod cannot be scheduled, the scheduler tries to preempt (evict) lower-priority Pods to make room.

### PriorityClass Object

A PriorityClass defines a mapping from a priority class name to the integer value of the priority.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false # If true, used for Pods without a priorityClassName
description: "Used for mission-critical service pods."
```

### Preemption Policies

- **Preempting (Default)**: Higher-priority Pods can evict lower-priority Pods to take their place on a node.
- **Non-preempting** (`preemptionPolicy: Never`): The Pod is placed at the front of the scheduling queue (ahead of lower-priority pods) but cannot evict existing pods. It must wait for resources to free up naturally.

### Priority and Affinity Interactions

- **Inter-Pod Affinity**: If a pending high-priority Pod has an affinity rule targeting a lower-priority Pod, the scheduler cannot satisfy that affinity if it preempts (removes) that lower-priority Pod.
- **Nominated Nodes**: When a Pod preempts others, the nominatedNodeName field in the Pod's status is set to that node. Note that nominatedNodeName and nodeName are not always the same until the Pod is actually bound.

### Built-in Classes

Kubernetes ships with two default high-priority classes:

- `system-cluster-critical`
- `system-node-critical`

## Node Affinity

Node affinity is specified in `.spec.affinity.nodeAffinity`.

### Types

- **requiredDuringSchedulingIgnoredDuringExecution**: Hard requirement (the scheduler cannot schedule the Pod unless the rule is met).
- **preferredDuringSchedulingIgnoredDuringExecution**: Soft requirement (the scheduler tries to find a node that meets the rule, but will still schedule if it can't). Uses weights (1-100) to prioritize nodes.

### Logic & Operators

- **OR Logic**: If multiple nodeSelectorTerms are specified, the Pod can be scheduled if any one term is satisfied.
- **AND Logic**: If multiple matchExpressions are specified within a single term, all must be satisfied.
- **Operators**: In, NotIn, Exists, DoesNotExist, Gt, Lt.

## Inter-pod Affinity and Anti-affinity

Specified via `affinity.podAffinity` or `affinity.podAntiAffinity`.

- **Affinity**: Co-locate Pods (e.g., placing a web server near a cache in the same zone).
- **Anti-affinity**: Spread Pods (e.g., ensuring replicas of a service aren't on the same node or in the same zone).

## Scheduler Profiles & Config

You can associate a profile with a specific node affinity using pluginConfig in the KubeSchedulerConfiguration. This addedAffinity is applied to all Pods using that schedulerName.

## Security & Node Labels

- **NodeRestriction Admission Plugin**: Prevents kubelets from modifying labels with the node-restriction.kubernetes.io/ prefix.
- **Node Taints**: While affinity attracts Pods, Taints repel Pods from specific nodes unless they have a matching toleration.
