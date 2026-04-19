---
title: My Git Profiles and SSH Keys Setup WSL Ubuntu
description: Separate work dir with its own git profile.
---

## Step 1 — Generate SSH Keys

```bash
# Personal key
ssh-keygen -t ed25519 -C "xxx@gmail.com" -f ~/.ssh/id_personal

# Work key (RSA required for Azure DevOps)
ssh-keygen -t rsa -b 4096 -C "xxx@work.com" -f ~/.ssh/id_work
```

## Step 2 — Configure SSH (`~/.ssh/config`)

```bash
vim ~/.ssh/config
```

```sshconfig
# Personal (GitHub)
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_personal
    IdentitiesOnly yes

# Work (Azure DevOps)
# PubkeyAcceptedAlgorithms is required because OpenSSH 8.8+ disables ssh-rsa by default
Host ssh.dev.azure.com
    HostName ssh.dev.azure.com
    User git
    IdentityFile ~/.ssh/id_work
    IdentitiesOnly yes
    PubkeyAcceptedAlgorithms +ssh-rsa
    HostkeyAlgorithms +ssh-rsa
```

Set correct permissions:

```bash
chmod 600 ~/.ssh/config
```

## Step 3 — Add Keys to the SSH Agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_personal
ssh-add ~/.ssh/id_work
```

## Step 4 — Add Public Keys to Git Providers

```bash
cat ~/.ssh/id_personal.pub   # add to your personal GitHub account
cat ~/.ssh/id_work.pub       # add to Azure DevOps
```

**Azure DevOps:** Go to `https://dev.azure.com/{your-org}` → **User Settings** (top-right avatar) → **SSH public keys** → **+ New Key** → paste `id_work.pub`.

## Step 5 — Global Git Config (`~/.gitconfig`)

```bash
vim ~/.gitconfig
```

```ini
[user]
    name = Joh Doe
    email = xxx@gmail.com

[includeIf "gitdir:work_dir"]
    path = ~/.gitconfig-work
```

> The trailing `/` in the `gitdir` path is required for directory matching to work.

---

## Step 6 — Work Git Config (`~/.gitconfig-work`)

```bash
vim ~/.gitconfig-work
```

```ini
[user]
    name = Tutenkhamen
    email = xxx@work.com
```

---

## Step 7 — Cloning Azure DevOps Repos

Azure DevOps SSH URLs follow this format:

```bash
git clone git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
```

For repos already cloned via HTTPS, switch them to SSH:

```bash
git remote set-url origin git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
```

---

## Step 8 — `~/.bashrc` Additions

```bash
vim ~/.bashrc
```

Add this block at the end:

```bash
# ── SSH Agent ────────────────────────────────────────────────────────────────
# Start agent only if not already running, then load both keys
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null
    ssh-add ~/.ssh/id_personal 2>/dev/null
    ssh-add ~/.ssh/id_work 2>/dev/null
fi

# ── Git profile helpers ───────────────────────────────────────────────────────
alias whoami-git='git config user.email'          # check active git identity
alias git-personal='git config user.email'        # just a reminder alias
```

Apply immediately without restarting the terminal:

```bash
source ~/.bashrc
```

---

## Verification

**Check active git identity** (run from inside a repo):
```bash
git config user.email
```
- Inside `work_dir/**` → `xxx@work.com`
- Anywhere else → `xxx@gmail.com`

**Test SSH connections:**
```bash
ssh -T git@github.com
# Expected: "Hi xxx! You've successfully authenticated..."

ssh -T git@ssh.dev.azure.com
# Expected: "remote: Shell access is not supported." ← this is normal, it means auth worked
```
