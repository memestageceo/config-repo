# Kind hostPath to Pod hostPath

```yaml title="kind-config.yaml"
extraMounts:
  - hostPath: ./data
    containerPath: /home/ida/Apps/config-repo/wordpress/data
```

```yaml title="wp-deploy.yaml"
volumes:
  - name: wp-data
    hostPath:
      path: /home/data/wp-data
      type: DirectoryOrCreate

containers:
  volumeMounts:
    - name: wp-data
      mountPath: /var/www/html
```

`/var/www/html` -> `/home/data/wp-data` -> `/home/ida/.../wordpress/data`
`volumeMounts` -> `volumes.hostPath` -> `extraMounts.hostPath`
`wordpress container` -> `kind-control-plane container` -> `host filesystem`

---

## [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

- `volume access modes` to match PV & PVC.
- Disable dynamic provisioning: `storageClassName: ""`
- To enable dynamic storage provisioning based on storage class, the cluster administrator needs to enable the `DefaultStorageClass` admission controller on the API server

PV protected if

- PV Status: Terminating
- Finalizers: kubernetes.io/pv-protection

Volumes that were dynamically provisioned inherit the reclaim policy of their StorageClass, which defaults to Delete.

```yaml title=pvc.yaml
spec:
  storageClassName: "" # Empty string must be explicitly set otherwise default StorageClass will be set
  volumeName: foo-pv
```

```yaml title=pv.yaml
spec:
  storageClassName: ""
  claimRef:
  name: foo-pvc
  namespace: foo
```

In the CLI, the access modes are abbreviated to:

- RWO - ReadWriteOnce
- ROX - ReadOnlyMany
- RWX - ReadWriteMany
- RWOP - ReadWriteOncePod
