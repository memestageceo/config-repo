---
title: Kustomize
description: Using Kustomize with base configs, overlays, transformers, namePrefix, nameSuffix, and commonAnnotations.
sidebar_position: 1
tags: [kubernetes, kustomize, gitops, configuration]
---

# Kustomization - with a K

> one `base` config to rule them all.

Use overlays, transformers, and patches to modify the base configurations.

## General folder structure

```
base/
  kustomization.yaml
  deployment.yaml
  service.yaml
overlays/
  dev/
    kustomization.yaml
  prod/
    kustomization.yaml
```

## Example base kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# resources to be managed by Kustomize
resources:
  - ./deploy.yaml
  - ./service.yaml

commonAnnotations:
  app: kustom-annotation

namePrefix: kustom-

nameSuffix: -v1

labels:
  - includeSelectors: true
    pairs:
      app: webapp

# better in overlays as environment specific
# + keeps base lean
# configMapGenerator:
# - name: kustom-map
#   env: config.properties
#
# images:
# - name: nginx
#   newName: caddy
#   newTag: "2.2"
```
