---
title: Storage in Kind — hostPath, PV, PVC, and StorageClass
description: Mapping Kind hostPath mounts through to pod volumes, PV lifecycle, StorageClass provisioning, and StatefulSet VolumeClaimTemplates.
sidebar_position: 5
tags: [kubernetes, storage, pv, pvc, storageclass, kind, statefulset]
---

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

PV protected if:
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

### Mount a single file from a PVC

```yaml
volumeMounts:
  - name: config
    mountPath: /etc/nginx/nginx.conf
    subPath: nginx.conf

volumes:
  - name: config
    persistentVolumeClaim:
      claimName: task-pv-storage
```

### GID annotation

```yaml
annotations:
  pv.beta.kubernetes.io/gid: "1234"
```

- Only Pods with the same GID can write to the volume
- The GID is automatically added to Pods using the PV

---

```diff
     spec:
       volumes:
         - name: mysql-data
-          hostPath:
-            path: /home/data/mysql-data
-            type: DirectoryOrCreate
+          persistentVolumeClaim:
+            claimName: mysql-pvc
```

---

## StorageClass

> If you set the `storageclass.kubernetes.io/is-default-class` annotation to true on more than one StorageClass in your cluster, and you then create a PersistentVolumeClaim with no storageClassName set, Kubernetes uses the most recently created default StorageClass.

> The `volumeBindingMode` field controls when volume binding and dynamic provisioning should occur. When unset, `Immediate` mode is used by default.

For topology-constrained storage backends, use `WaitForFirstConsumer` to delay binding until a Pod is scheduled.

In **static provisioning**:
1. Admin creates PV manually with a storageClassName
2. User creates PVC with the same storageClassName
3. Kubernetes binds them based on matching storageClassName + other criteria

In **dynamic provisioning**:
1. User creates PVC with storageClassName
2. StorageClass provisioner automatically creates PV
3. They bind automatically

For `kind`, use provisioner `rancher.io/local-path`:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: sql-storage
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## StatefulSets with VolumeClaimTemplates

```diff
+  replicas: 3
+  # updates in reverse 3 to 0 to protect master
+  updateStrategy:
+    type: RollingUpdate
   selector:
     matchLabels:
       app: mysql
-  replicas: 1
```

```diff
-      volumes:
-        - name: mysql-data
-          persistentVolumeClaim:
-            claimName: mysql-pvc

+  volumeClaimTemplates:
+    - metadata:
+        name: mysql-data
+      spec:
+        accessModes: ["ReadWriteOnce"]
+        storageClassName: fast
+        resources:
+          requests:
+            storage: 1Gi
```
