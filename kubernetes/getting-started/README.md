---
title: Kubernetes controlplane setup with containerd and flannel
tags: kubeadm, flannel
---

Based on a real setup on Ubuntu. Commands are in order and safe to copy-paste. Gotchas and debug notes are included inline where things went wrong during the original setup.

## Prerequisites

Ubuntu VM (tested on amd64) with internet access and `sudo` privileges.

## System Update

```bash
sudo apt update && sudo apt upgrade -y
```

## Enable IP Forwarding

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system

# Verify it's now 1
sysctl net.ipv4.ip_forward
```

## Disable Swap

Kubernetes requires swap to be off.

```bash
sudo swapoff -a

# Comment out any swap entries to persist across reboots
sudo vim /etc/fstab

# Verify swap shows 0B total
free -h
```

## Install and Configure containerd

Download the binary from the [containerd GitHub releases](https://github.com/containerd/containerd/releases) and place it under `/usr/local/bin`, or install via apt.

Set up the systemd service:

```bash
sudo mkdir -p /usr/local/lib/systemd/system
# Place the containerd.service unit file here (from the containerd release tarball)

sudo systemctl daemon-reload
sudo systemctl enable --now containerd
sudo systemctl status containerd
```

> **Gotcha:** The original setup accidentally created the directory as `/usr/local/lib/system` instead of `/usr/local/lib/systemd/system`. If `systemctl enable containerd` fails, double-check the path.

Generate the default config and set the `systemd` cgroup driver (required when using kubeadm):

```bash
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Edit the config — find and set SystemdCgroup = true
sudo vim /etc/containerd/config.toml
```

The relevant section to update:

```toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
```

```bash
sudo systemctl restart containerd
```

## Install CNI Plugins

```bash
# Verify checksum first
sha256sum -c cni-plugins-linux-amd64-v1.9.0.tgz.sha256

sudo mkdir -p /opt/cni/bin
sudo tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.9.0.tgz

ls /opt/cni/bin
```

## Enable br_netfilter

> **Gotcha:** This was a key blocker. Flannel requires `br_netfilter` to be loaded so that iptables can see bridged traffic. Without this, flannel pods would start but networking between pods wouldn't work.

```bash
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/br_netfilter.conf

# Persist the bridge iptables sysctl settings
cat <<EOF | sudo tee -a /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

sudo sysctl --system

# Reboot to ensure all kernel modules and sysctl settings are active
sudo reboot
```

After reboot, verify:

```bash
lsmod | grep br_netfilter
```

## Install kubeadm, kubelet, kubectl

```bash
sudo apt-get update && sudo apt-get install -y kubelet kubeadm kubectl

# pin versions to avoid unintended upgrades
sudo apt-mark hold kubelet kubeadm kubectl
```

## Initialize the Cluster

> **Gotcha:** Before running `kubeadm init`, check that port 6443 is not already in use. During the original setup, a **kind** cluster was running on the host (mapped to the VM) and was holding port 6443, causing `kubeadm init` to fail. Delete any existing kind cluster first with `kind delete cluster`, then verify the port is free:
> ```bash
> sudo nc 127.0.0.1 6443 -zv -w 2
> # "Connection refused" is good — means nothing is listening
> ```

```bash
kubeadm init --pod-network-cidr 10.244.0.0/16
```

## Configure kubectl Access

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Optional: add a k alias
echo "alias k=kubectl" >> ~/.bashrc && source ~/.bashrc

kubectl get all -A
```

## Install Flannel CNI

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

kubectl -n kube-flannel get po -w
```

> **Gotcha:** If the flannel pod is stuck in `CrashLoopBackOff`, check logs with `kubectl -n kube-flannel logs <pod-name>`. The most common cause here was `br_netfilter` not being loaded (see Step 6). After enabling it and rebooting, flannel came up cleanly.

## Run a Test Pod

By default, the control plane node has a taint that prevents regular pods from scheduling. For a single-node cluster, either remove the taint:

```bash
kubectl describe node controlplane | grep -i Taint

kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

Or add a toleration in your pod spec:

```yaml
tolerations:
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
```

```bash
kubectl run nginx --image nginx --dry-run=client -o yaml > nginx.yaml
# Edit as needed, then:
kubectl apply -f nginx.yaml && kubectl get po -o wide
```

## Summary of Gotchas

| Issue | Symptom | Fix |
|---|---|---|
| `kind` cluster running on host | Port 6443 busy, `kubeadm init` fails | `kind delete cluster` before init |
| `br_netfilter` not loaded | Flannel pods crash, pod networking broken | `modprobe br_netfilter` + sysctl settings + reboot |
| Wrong systemd service path | `containerd` fails to enable | Ensure service file is in `/usr/local/lib/systemd/system/` |
| Control-plane taint | Test pods stay `Pending` | Remove taint or add toleration |
