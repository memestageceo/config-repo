---
title: Introduction
description: A collection of DevOps tools, hands-on walkthroughs, and reference guides for Kubernetes, Linux, and infrastructure.
sidebar_position: 1
tags: [kubernetes, devops, overview]
---

# Introduction

A Collection of tools, hands-on walkthroughs with source code.
The Ultimate Swiss Army knife for DevOps, Developers and Platform Engineers

## What's in here

| Section | Topics |
|---------|--------|
| **Kubernetes** | Cluster setup, ConfigMaps, Networking/Ingress, Security (RBAC, NetworkPolicy), Services, Storage, Workloads (HPA, DaemonSets), StatefulSets, Kustomize, Exercises |
| **Debugging** | Kubernetes debugging workflows, WordPress/MySQL troubleshooting |
| **Services & Storage** | Service port diagrams, PV/PVC/StorageClass, Kind hostPath |
| **Linux** | Arch Linux guides — KVM/QEMU, NVIDIA + Docker, SSH/GPG, monitor brightness |
| **WordPress** | Deploying and troubleshooting WordPress on Kind |

## How to add docs

Drop a `.md` file into the right folder with frontmatter:

```yaml
---
title: My Page Title
description: One-line summary
tags: [kubernetes, networking]
sidebar_position: 1
---
```

The folder structure becomes the sidebar automatically — no config files needed.
