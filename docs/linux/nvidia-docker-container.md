---
title: NVIDIA GPU + Docker on Arch
description: Configuring NVIDIA Container Toolkit to pass GPU access into Docker containers on Arch Linux with Omarchy.
sidebar_position: 2
tags: [linux, arch, nvidia, docker, gpu]
---

## 1. Verify NVIDIA driver (host level)

Run:

```bash
nvidia-smi
```

**Expected:** GPU info (RTX 3060, driver version, CUDA version)

### Why this matters

Docker does not provide GPU drivers—it only passes them through. If this fails, nothing else will work.

## 2. Fix package mirror issues (Arch-specific)

You encountered:

```
404 error from stable-mirror.omarchy.org
```

### Fix used:

```bash
sudo pacman -Syy
```

### What this does

* Forces a **full refresh of package databases**
* Syncs your system with updated mirrors
* Fixes "package not found / 404" issues caused by stale mirrors

### Optional (better long-term fix)

```bash
sudo pacman -S reflector
sudo reflector --latest 10 --sort rate --save /etc/pacman.d/mirrorlist
```

## 3. Install NVIDIA Container Toolkit

```bash
sudo pacman -S nvidia-container-toolkit
```

### What this installs

* `libnvidia-container` → low-level GPU integration
* `nvidia-container-runtime` → Docker runtime for GPUs
* `nvidia-ctk` → configuration tool

### Why this is required

Docker does not natively understand GPUs. This toolkit bridges:

```
Docker → NVIDIA driver → GPU
```

## 4. Configure Docker to use NVIDIA runtime

```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### What this does

* Updates Docker config (`/etc/docker/daemon.json`)
* Registers NVIDIA as a valid runtime
* Enables `--gpus all` flag to work

## 5. (Modern Docker fix) CDI configuration

You initially hit:

```
failed to discover GPU vendor from CDI
```

This happens because newer Docker uses **CDI (Container Device Interface)**.

### Fix:

```bash
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
sudo systemctl restart docker
```

### What this does

* Creates a **device mapping spec** for GPUs
* Lets Docker discover GPUs in a standardized way

## 6. Test GPU inside Docker

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

### Expected result

You should see the same GPU output as on host.

## 7. Run your original container

```bash
sudo docker run --privileged --net=host --ipc=host \
  --ulimit memlock=-1:-1 --ulimit stack=-1:-1 \
  --gpus all --rm -it \
  nvcr.io/nvidia/pytorch:25.12-py3
```

## 8. Key concepts

### GPU passthrough chain

```
PyTorch (container)
   ↓
CUDA (container)
   ↓
NVIDIA Container Toolkit
   ↓
Host NVIDIA Driver
   ↓
RTX 3060
```

### Why CDI matters (new Docker behavior)

Old way: `--runtime=nvidia`

New way: `--gpus all` (uses CDI internally)

If CDI config is missing → you get the error you saw.

## 9. Minimal checklist (future quick setup)

```bash
# 1. Fix mirrors
sudo pacman -Syy

# 2. Install toolkit
sudo pacman -S nvidia-container-toolkit

# 3. Configure runtime
sudo nvidia-ctk runtime configure --runtime=docker

# 4. Enable CDI
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml

# 5. Restart Docker
sudo systemctl restart docker

# 6. Test
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

## 10. Common failure points

* `nvidia-smi` fails → driver issue
* Docker shows no runtimes → toolkit not configured
* CDI error → missing `/etc/cdi/nvidia.yaml`
* Permission issues → Docker not restarted
