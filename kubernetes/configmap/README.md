---
title: Kubernetes ConfigMap Notes
description: Reference guide for working with Kubernetes ConfigMaps
category: kubernetes
tags:
  - kubernetes
  - configmap
  - configuration
  - k8s
version: 1.0
last_updated: 2026-01-16
---

# Kubernetes ConfigMap Notes

## Using ConfigMaps as Environment Variables

### Single environment variable from ConfigMap

```yaml
env:
  - name: CONFIGMAP_USERNAME
    valueFrom:
      configMapKeyRef:
        name: myconfigmap
        key: username
```

### All keys from ConfigMap as environment variables

```yaml
envFrom:
  - configMapRef:
      name: myconfigmap
```

> [!IMPORTANT]
> ConfigMaps consumed as environment variables are NOT updated automatically and require a pod restart to reflect changes.

## Using ConfigMaps as Volumes

### Basic volume mount

```yaml
volumes:
  - name: foo
    configMap:
      name: myconfigmap

volumeMounts:
  - name: foo
    mountPath: "/etc/foo"
    readOnly: true
```

### Mounting specific keys as files

```yaml
volumes:
  - name: config
    configMap:
      name: game-demo
      items:
        - key: "game.properties"
          path: "game.properties"
        - key: "user-interface.properties"
          path: "user-interface.properties"
```

> **Note:** If you omit the items array entirely, every key in the ConfigMap becomes a file with the same name as the key.

### How volume mounting works

1. **Define Volumes:** Set volumes at the Pod level (`.spec.volumes[]`)
2. **Reference ConfigMap:** Set `.spec.volumes[].configMap.name` to reference your ConfigMap
3. **Container Mount:** Add `.spec.containers[].volumeMounts[]` to each container that needs the data
4. **Security:** Specify `.spec.containers[].volumeMounts[].readOnly = true`
5. **Pathing:** Set `.spec.containers[].volumeMounts[].mountPath` to an unused directory name
6. **File Creation:** Each key in the ConfigMap data map becomes a filename under the specified mountPath

## ConfigMap Updates

| Method               | Update Behavior                                                                     |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Volume Mounts**    | Projected keys are eventually updated automatically after the ConfigMap is modified |
| **subPath Mounts**   | A container using a ConfigMap as a subPath volume mount will NOT receive updates    |
| **Environment Vars** | These are NOT updated automatically and require a pod restart                       |

## Immutable ConfigMaps

### Making a ConfigMap immutable

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-immutable-config
immutable: true
data:
  key: value
```

### Important notes about immutability

- **Permanent:** Once a ConfigMap is marked as immutable, it is NOT possible to revert this change
- **Locked Data:** You cannot mutate the contents of the data or binaryData fields
- **Recreation:** To change values, you must delete and recreate the ConfigMap
- **Performance:** Immutability significantly reduces the load on the API server by closing watches for these resources
