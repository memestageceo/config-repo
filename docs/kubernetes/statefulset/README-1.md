# Statefulset

Persistent Volume Claim Retention Policy

The .spec.persistentVolumeClaimRetentionPolicy field controls if and how PVCs are deleted during the lifecycle of a StatefulSet.

apiVersion: apps/v1
kind: StatefulSet
spec:
persistentVolumeClaimRetentionPolicy:
whenDeleted: Retain # Keeps PVCs when the StatefulSet is deleted
whenScaled: Delete # Deletes PVCs when the StatefulSet is scaled down

Note: This requires the StatefulSetAutoDeletePVC feature gate to be enabled on the API server.

Rollouts and Revisions

When .spec.template is updated, the controller creates a new ControllerRevision.

# List all controller revisions

kubectl get controllerrevisions

# View history of updates

kubectl rollout history statefulset/webapp

# Revert back to a specific revision

kubectl rollout undo sts/app --to-revision=3

Revision Limit: Control the number of retained revisions using .spec.revisionHistoryLimit.

Network Identity and DNS

Headless Service: Required for the network identity of pods.

Hostname Pattern: The constructed hostname is $(statefulset name)-$(ordinal).

FQDN: The unique identifier for each pod is $(podname).$(governing service domain).

DNS Latency: DNS can be outdated or cached (CoreDNS default is often 30s). For prompt discovery, query the Kubernetes API directly or decrease the CoreDNS cache TTL.

Pod Management & Lifecycle

Graceful Termination: To gracefully terminate, scale the sts to 0 before deleting.

Termination Warning: Do not set pod.Spec.TerminationGracePeriodSeconds to 0; this is unsafe for stateful workloads.

Ordinal Management:

Pods are labeled with apps.kubernetes.io/pod-index.

The label statefulset.kubernetes.io/pod-name stores the pod name.

Set .spec.ordinals.start to define a custom starting index for pod ordinals.

Readiness: Use .spec.minReadySeconds to specify the time a pod must run without crashing to be considered "Ready."

Update Strategies

Set the policy via .spec.updateStrategy.type.

Strategy

Description

RollingUpdate

(Default) Implements automated, rolling updates.

OnDelete

The controller will not automatically update pods. Manual pod deletion is required to trigger a replacement.

Advanced Rolling Update Config

maxUnavailable: Specify the maximum number of pods that can be unavailable during an update.

Bursting: If maxUnavailable > 1, the controller creates/terminates pods simultaneously.

The "Broken State" Risk: When using RollingUpdate with OrderedReady (default policy), an update can get stuck if a pod fails to become ready. This requires manual intervention (manual deletion of broken pods or a forced rollback).

General Rules

Volume Persistence: By default, deleting or scaling down a StatefulSet does not delete the associated volumes.

Management Policy: Control how pods are created (ordered vs. parallel) using .spec.podManagementPolicy.
