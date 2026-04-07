---
title: SSH Keys and GPG for GitHub
description: Generating ed25519 SSH keys, configuring the SSH agent on Arch Linux, and setting up GPG signing for Git commits.
sidebar_position: 1
tags: [linux, arch, ssh, gpg, github]
---

Below is a cleaner, beginner-friendly version of your notes with only the essential steps and minimal explanation.

---

# SSH Keys (for GitHub login)

## 1. Generate Key

```bash
ssh-keygen -t ed25519 -a 100 -C "your_email@example.com"
```

* `ed25519` → modern, secure algorithm
* `-a 100` → stronger protection
* `-C` → your GitHub email

When asked:

* Save as default: `~/.ssh/id_ed25519`
* Set a strong passphrase

---

## 2. Start SSH Agent (Arch Linux)

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Optional: auto-start agent in `~/.zshrc` or `~/.bashrc`

```bash
if ! pgrep -u "$USER" ssh-agent > /dev/null; then
    eval "$(ssh-agent -s)"
fi
```

---

## 3. Copy Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the output.

---

## 4. Add to GitHub

Go to:

**GitHub → Settings → SSH and GPG Keys → New SSH Key**

Paste your public key.

---

# GPG Keys (for signing commits)

Used to verify that commits are really from you (shows "Verified" badge on GitHub).

---

## 1. Install GnuPG (Arch)

```bash
sudo pacman -S gnupg
```

Generate key:

```bash
gpg --full-generate-key
```

---

## 2. Recommended Options

Choose:

* Key type → **ECC (sign only)**
* Curve → **Curve 25519**
* Usage → **Sign and Certify**
* Expiration → 1 year
* Name → Your GitHub name
* Email → Must match GitHub
* Set strong passphrase

---

## 3. Find Your Key ID

```bash
gpg --list-secret-keys --keyid-format=long
```

Example output:

```
sec   ed25519/ABCD1234EF567890 2026-02-28
```

`ABCD1234EF567890` = Your KEY ID

---

## 4. Export Public Key

```bash
gpg --armor --export YOUR_KEY_ID
```

Copy everything between:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
...
-----END PGP PUBLIC KEY BLOCK-----
```

---

## 5. Add GPG Key to GitHub

**GitHub → Settings → SSH and GPG Keys → New GPG Key**

Paste the key.

---

## 6. Enable Commit Signing

```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global gpg.program gpg
```

Test:

```bash
git commit -S -m "test signed commit"
```

Push and check GitHub → should show **Verified**.
