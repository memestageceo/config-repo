# Kustomization - with a K

> one `base` config to rule them all.

User overlays, transformers, and patches to modify the base configurations. Woohoo!

## general folder structure

```tree


```

---

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

# env: config.properties

#

# images:

# - name: nginx

# newName: caddy

# newTag: "2.2"
