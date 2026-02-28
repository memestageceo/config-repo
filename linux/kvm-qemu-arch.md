---
title: KVM/QEMU VM Setup on Arch Linux
description: A reference guide for spinning up Ubuntu VMs with sudo virsh — accessible via sudo virsh console and SSH.
tags:
  - arch
  - kvm
  - qemu
  - libvirt
  - virtualization
---

# KVM/QEMU VM Setup on Arch Linux

A reference guide for spinning up Ubuntu VMs with `sudo virsh` — accessible via `sudo virsh console` and SSH.

## 1. Install Packages

```bash
sudo pacman -S qemu-full libvirt virt-manager virt-viewer dnsmasq \
  openbsd-netcat libguestfs cloud-image-utils
```

> `bridge-utils` is deprecated. `iproute2` (installed by default) replaces it.

---

## 2. Configure libvirt to Use nftables

Edit `/etc/libvirt/network.conf`:

```bash
sudo nano /etc/libvirt/network.conf
```

Set:

```ini
firewall_backend = "nftables"
```

If VMs are **not assigned an IP**, try switching to iptables:

```bash
sudo systemctl start iptables.service
sudo systemctl enable iptables.service
sudo systemctl restart libvirtd.service
```

Then edit again:

```bash
sudo nano /etc/libvirt/network.conf
```

Set:

```ini
firewall_backend = "iptables"
```

---

## 3. Enable Services

```bash
sudo systemctl enable --now libvirtd
sudo systemctl enable --now iptables   # needed for NAT rules
```

---

## 4. Add Your User to the libvirt Group

```bash
sudo usermod -aG libvirt $USER
```

Log out and back in, or:

```bash
newgrp libvirt
```

---

## 5. Enable the Default NAT Network

```bash
sudo virsh net-start default
sudo virsh net-autostart default
```

Verify:

```bash
sudo virsh net-list --all
```

---

## 6. Get the Ubuntu Cloud Base Image

```bash
wget -P /var/lib/libvirt/images/ \
  https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
```

Keep this as a shared base — all VMs will use it as a backing file.

---

## 7. Create a VM

### 7a. Create the Disk Overlay

```bash
sudo qemu-img create -f qcow2 \
  -b /var/lib/libvirt/images/noble-server-cloudimg-amd64.img \
  -F qcow2 \
  /var/lib/libvirt/images/<vmname>.qcow2 <size>G
```

---

### 7b. Create cloud-init Config

```bash
# user-data
cat > /tmp/user-data <<EOF
#cloud-config
users:
  - name: aditya
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat ~/.ssh/id_ed25519.pub)
EOF
```

```bash
# meta-data
cat > /tmp/meta-data <<EOF
instance-id: <vmname>
local-hostname: <vmname>
EOF
```

---

### 7c. Build the Seed ISO

```bash
cloud-localds /var/lib/libvirt/images/<vmname>-seed.iso \
  /tmp/user-data /tmp/meta-data
```

---

### 7d. Install the VM

```bash
sudo virt-install \
  --name <vmname> \
  --memory <ram> \
  --vcpus <vcpus> \
  --disk path=/var/lib/libvirt/images/<vmname>.qcow2,format=qcow2 \
  --disk path=/var/lib/libvirt/images/<vmname>-seed.iso,device=cdrom \
  --os-variant ubuntu24.04 \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --import \
  --noautoconsole
```

---

# Examples

---

## controlplane

**2 vCPU • 4GB RAM • 15GB disk**

```bash
# Disk
sudo qemu-img create -f qcow2 \
  -b /var/lib/libvirt/images/noble-server-cloudimg-amd64.img \
  -F qcow2 \
  /var/lib/libvirt/images/controlplane.qcow2 15G
```

```bash
# cloud-init
cat > /tmp/user-data <<EOF
#cloud-config
users:
  - name: aditya
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat ~/.ssh/id_ed25519.pub)
EOF
```

```bash
cat > /tmp/meta-data <<EOF
instance-id: controlplane
local-hostname: controlplane
EOF
```

```bash
cloud-localds /var/lib/libvirt/images/controlplane-seed.iso \
  /tmp/user-data /tmp/meta-data
```

```bash
# Install
sudo virt-install \
  --name controlplane \
  --memory 4096 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/controlplane.qcow2,format=qcow2 \
  --disk path=/var/lib/libvirt/images/controlplane-seed.iso,device=cdrom \
  --os-variant ubuntu24.04 \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --import \
  --noautoconsole
```

---

## node01

**2 vCPU • 2GB RAM • 10GB disk**

```bash
# Disk
sudo qemu-img create -f qcow2 \
  -b /var/lib/libvirt/images/noble-server-cloudimg-amd64.img \
  -F qcow2 \
  /var/lib/libvirt/images/node01.qcow2 10G
```

```bash
# cloud-init
cat > /tmp/user-data <<EOF
#cloud-config
users:
  - name: aditya
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat ~/.ssh/id_ed25519.pub)
EOF
```

```bash
cat > /tmp/meta-data <<EOF
instance-id: node01
local-hostname: node01
EOF
```

```bash
cloud-localds /var/lib/libvirt/images/node01-seed.iso \
  /tmp/user-data /tmp/meta-data
```

```bash
# Install
sudo virt-install \
  --name node01 \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/node01.qcow2,format=qcow2 \
  --disk path=/var/lib/libvirt/images/node01-seed.iso,device=cdrom \
  --os-variant ubuntu24.04 \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --import \
  --noautoconsole
```

---

## 8. Access the VM

```bash
# Serial console (Ctrl+] to exit)
sudo virsh console <vmname>
```

```bash
# Get IP
sudo virsh net-dhcp-leases default
```

```bash
# SSH
ssh aditya@<ip>
```

---

## 9. Common `virsh` Commands

```bash
sudo virsh list --all
sudo virsh start <vmname>
sudo virsh shutdown <vmname>                   # graceful
sudo virsh destroy <vmname>                    # force off
sudo virsh undefine <vmname> --remove-all-storage
sudo virsh snapshot-create-as <vmname> snap1
sudo virsh dominfo <vmname>
```
