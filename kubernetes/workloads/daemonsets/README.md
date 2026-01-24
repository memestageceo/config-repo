DaemonSets
Because the DaemonSet controller sets the node.kubernetes.io/unschedulable:NoSchedule toleration automatically, Kubernetes can run DaemonSet Pods on nodes that are marked as unschedulable.
If you use a DaemonSet to provide an important node-level function, such as cluster networking, it is helpful that Kubernetes places DaemonSet Pods on nodes before they are ready. For example, without that special toleration, you could end up in a deadlock situation where the node is not marked as ready because the network plugin is not running there, and at the same time the network plugin is not running on that node because the node is not yet ready.
Cluster Networking
Networking is a central part of Kubernetes, but it can be challenging to understand exactly how it is expected to work. There are 4 distinct networking problems to address:
Highly-coupled container...
