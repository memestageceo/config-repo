---
title: WordPress on Kubernetes
description: Deploying and troubleshooting WordPress with MySQL on Kind.
sidebar_position: 7
tags: [kubernetes, wordpress, mysql, kind]
---

# Deploy WordPress with Kubernetes

- [x] create kind cluster
- [x] create namespace `wordpress`
- [x] create deployment and service for wordpress
- [ ] configure `extraPortMappings` in kind-config.yaml

`extraPortMappings` with `clusterip` does not expose the service. Earlier, gateway API was exposing the ClusterIP but we no longer have that in our cluster.

We can use NodePort or configure a load balancer, then the port mappings in kind configuration would work.

---

> Another dumb thing was `telescope neovim`. On double `leader`, it searches in cwd, so the cwd config wasn't the one I edited. This resulted in hours wasted. THANKS!
