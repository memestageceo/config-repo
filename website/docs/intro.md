---
title: Introduction
description: DevOps and Kubernetes reference documentation covering cluster setup, networking, security, storage, debugging, and Linux system guides.
tags: [kubernetes, devops, introduction]
sidebar_position: 1
---

# DevOps & K8s Docs

A practical reference for Kubernetes, Linux, and DevOps tooling.

## What's in here

| Section | Topics |
|---------|--------|
| **Kubernetes** | Cluster setup, ConfigMaps, Networking, Security (RBAC, NetworkPolicy), Services, Storage, Workloads (HPA, DaemonSets), StatefulSets, Kustomize, Exercises |
| **Debugging** | Kubernetes debugging workflows, application troubleshooting |
| **Linux & System** | Arch Linux, KVM/QEMU, NVIDIA + Docker, SSH/GPG, display config |
| **WordPress** | Deploying and troubleshooting WordPress on Kind |

## How the sidebar works

Docs are organized using numbered folders and files. The numbers control sort order and are stripped from display:

- `01-kubernetes/` → **Kubernetes**
- `01-getting-started.md` → **Getting Started**

To add a new doc, drop a `.md` file into the appropriate folder with:

1. A numeric prefix for ordering (`01-`, `02-`, etc.)
2. A frontmatter block at the top

```md
---
title: My New Doc
description: What this page covers
tags: [kubernetes, networking]
---
```
