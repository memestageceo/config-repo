# Deploy wordpress with kubernetes

- [x] create kind cluster
- [x] create namespace `wordpress`
- [x] create deployment and service for wordpress
- [] configure `extraPortMappings` in [](./kind-config.yaml)

`extraPortMappings` with `clusterip` does not expose the service. Earlier, gateway api was exposing the clusterip but we no longer have that in our cluster.

we can use nodeport or configure a load balancer, then the port mappings in kind configuration would work

---

Another dumb thing was `telescope neovim`. on double `leader`, it searches in rwd, so the cwd config wasn't the one i edited.

This resulted in hours wasted. THANKS!

```bash
├── kind-config.yaml # EDITED LIKE AN IDIOT
├── README.md
└── wordpress
    ├── compose.yaml
    ├── data
    ├── deploy.yaml
    ├── kind-config.yaml
    ├── kind2.yaml
    ├── ns.yaml
    └── README.md
```

---

A PV can have a class, which is specified by setting the storageClassName attribute to the name of a StorageClass. A PV of a particular class can only be bound to PVCs requesting that class. A PV with no storageClassName has no class and can only be bound to PVCs that request no particular class.

If the MutablePVNodeAffinity feature gate is enabled in your cluster, the .spec.nodeAffinity field of a PersistentVolume is mutable. This allows cluster administrators or external storage controller to update the node affinity of a PersistentVolume when the data is migrated, without interrupting the running pods.
