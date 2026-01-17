```yaml
apiVersion: apps/v1
kind: StatefulSet
...
spec:
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Delete
...
```

````bash
# on spec.template update of sts, controller creates new controlrivision
k get controllerrivisions

# view history of updates
k rollout history statefulset/webapp

# revert back to particular rivision
k rollout undo sts/app --to-revision=3


- Deleting and/or scaling a StatefulSet down will not delete the volumes associated with the StatefulSet.
- For network identity of pods, StatefulSets require a Headless Service.
- To graceful termination of the sts/pods, scale sts to 0, then delete.

for pod status = ready, to specify time for which pod must run without its containers crashing, set `.spec.minReadySeconds`
sts applies ordinal value label on pods with key apps.kubernetes.io/pod-index

define start index of pod, set `.spec.ordians.start`

for sts, constructed hostname of pod is `$(statefulset name)-$(ordinal)`

matching DNS subdomain for unique identifier of each sts/pod is `$(podname).$(governing service domain)`

If you need to discover Pods promptly after they are created, you have a few options:
- Query the k8s API directly (eg, using a watch) rather than relying on DNS lookups - as DNS outdated and cached.
- Decrease the time of caching in your Kubernetes DNS provider (typically this means editing the config map for CoreDNS, which currently caches for 30 seconds).

sts label that stores value of pod name:  statefulset.kubernetes.io/pod-name

The StatefulSet should not specify a pod.Spec.TerminationGracePeriodSeconds of 0. This practice is unsafe

define policy how sts pods are managed: .spec.podManagementPolicy

For rolling updates when .spec.updateStrategy.rollingUpdate.maxUnavailable is greater than 1, the StatefulSet controller terminates and creates up to maxUnavailable Pods simultaneously (also known as "bursting")

When a StatefulSet's .spec.updateStrategy.type is set to OnDelete, the StatefulSet controller will not automatically update the Pods in a StatefulSet.

The RollingUpdate update strategy implements automated, rolling updates for the Pods in a StatefulSet.

control the maximum number of sts/Pods that can be unavailable during an update by specifying the .spec.updateStrategy.rollingUpdate.maxUnavailable

When using Rolling Updates with the default Pod Management Policy (OrderedReady), it's possible to get into a broken state that requires manual intervention to repair. requires forced rollback, manually delete broken pods to recreate them.

Control retained revisions for sts with .spec.revisionHistoryLimit

.spec.persistentVolumeClaimRetentionPolicy field controls if and how PVCs are deleted during the lifecycle of a StatefulSet. You must enable the StatefulSetAutoDeletePVC feature gate on the API server

---

```yaml
apiVersion: apps/v1
kind: StatefulSet
...
spec:
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Delete
...
````

```bash
# on spec.template update of sts, controller creates new controlrivision
k get controllerrivisions

# view history of updates
k rollout history statefulset/webapp

# revert back to particular rivision
k rollout undo sts/app --to-revision=3


- Deleting and/or scaling a StatefulSet down will not delete the volumes associated with the StatefulSet.
- For network identity of pods, StatefulSets require a Headless Service.
- To graceful termination of the sts/pods, scale sts to 0, then delete.

for pod status = ready, to specify time for which pod must run without its containers crashing, set `.spec.minReadySeconds`
sts applies ordinal value label on pods with key apps.kubernetes.io/pod-index

define start index of pod, set `.spec.ordians.start`

for sts, constructed hostname of pod is `$(statefulset name)-$(ordinal)`

matching DNS subdomain for unique identifier of each sts/pod is `$(podname).$(governing service domain)`

If you need to discover Pods promptly after they are created, you have a few options:
- Query the k8s API directly (eg, using a watch) rather than relying on DNS lookups - as DNS outdated and cached.
- Decrease the time of caching in your Kubernetes DNS provider (typically this means editing the config map for CoreDNS, which currently caches for 30 seconds).

sts label that stores value of pod name:  statefulset.kubernetes.io/pod-name

The StatefulSet should not specify a pod.Spec.TerminationGracePeriodSeconds of 0. This practice is unsafe

define policy how sts pods are managed: .spec.podManagementPolicy

For rolling updates when .spec.updateStrategy.rollingUpdate.maxUnavailable is greater than 1, the StatefulSet controller terminates and creates up to maxUnavailable Pods simultaneously (also known as "bursting")

When a StatefulSet's .spec.updateStrategy.type is set to OnDelete, the StatefulSet controller will not automatically update the Pods in a StatefulSet.

The RollingUpdate update strategy implements automated, rolling updates for the Pods in a StatefulSet.

control the maximum number of sts/Pods that can be unavailable during an update by specifying the .spec.updateStrategy.rollingUpdate.maxUnavailable

When using Rolling Updates with the default Pod Management Policy (OrderedReady), it's possible to get into a broken state that requires manual intervention to repair. requires forced rollback, manually delete broken pods to recreate them.

Control retained revisions for sts with .spec.revisionHistoryLimit

.spec.persistentVolumeClaimRetentionPolicy field controls if and how PVCs are deleted during the lifecycle of a StatefulSet. You must enable the StatefulSetAutoDeletePVC feature gate on the API server
```
