---
title: Linux Journey notes and stuff
tags: linux
created: 2026-03-04
---

## 📂 File & Directory Operations

| Command | Description |
| --- | --- |
| `cd -` | Switch to the previous directory. |
| `ls -r` | List files in reverse order. |
| `touch -r f1.txt f2.txt` | Set `f2.txt` timestamp to match `f1.txt`. |
| `touch -d "YYYY-MM-DD"` | Set a specific date/time for a file. |
| `file <filename>` | Determine the file type (e.g., JPEG, ASCII text). |
| `cp -i` | Interactive copy (prompts before overwriting). |
| `mv -t <dir> <files>` | Move multiple files into a target directory. |
| `mv -b` | Create a backup (`~file`) if a destination file exists. |

### Creating Files via Standard Input

```bash
cat > newfile.txt
# Type your text, then press Ctrl+D on a new line to save.
# Warning: '>' overwrites existing files.

```

---

## 👤 User & Group Management

### Authentication & Privilege

- **`su`**: Substitute user (defaults to root).
- **`sudo`**: Execute a command as another user (usually root).
- **`/etc/sudoers`**: The configuration file for sudo access. **Always** edit this using `visudo` to prevent syntax errors that could lock you out.

### System Identity Files

- **`/etc/passwd`**: Maps usernames to UIDs.
- Format: `username:password:uid:gid:comment:home_dir:shell`


- **`/etc/shadow`**: Stores encrypted passwords and aging policies. Requires sudo to read.
- **`/etc/group`**: Contains the list of all user groups.

### User Commands

```bash
sudo useradd bob        # Create user
sudo useradd -r bob     # Create system user (no home dir)
sudo passwd bob         # Set/change password

```

---

## 🔐 Permissions & Ownership

### Permission Structure

`d | rwx | r-x | r-x`
*(Type | Owner | Group | Others)*

- **u** (user), **g** (group), **o** (others), **a** (all).
- **Read (4), Write (2), Execute (1)**.

### Commands

```bash
chmod ug+w myfile       # Add write permission for owner and group
chmod 755 myfile        # rwxr-xr-x (Owner: all, Group/Other: read/execute)
chmod -R 777 /dir       # Recursive full permissions (dangerous!)

sudo chown patty:whales file  # Change owner to 'patty' and group to 'whales'

```

### Special Permissions

- **SUID (4000):** Process runs with the file owner's privileges. (`chmod u+s`)
- **SGID (2000):** Process runs with the file group's privileges; new files in a dir inherit the group ID. (`chmod g+s`)
- **Sticky Bit (1000):** Only the file owner can delete their own files within a directory (e.g., `/tmp`). (`chmod +t`)

> [!NOTE]
> **umask:*- Defines default permissions for new files. A umask of `022` results in `644` for files (removes write access for group/others).

---

## ⚙️ Process Management

### Identity & Identification

- **Real UID:** The user who launched the process.
- **Effective UID:** The UID used to determine access rights (can be changed via SUID).
- **Saved UID:** Allows switching back and forth between Real and Effective UIDs.

### Monitoring Processes

- **`ps aux`**:
- `a`: All users.
- `u`: User-oriented format.
- `x`: Includes processes without a terminal (daemons marked with `?`).


- **`ps -ef`**: Full listing including Parent Process ID (PPID).
- **`top`**: Real-time view of system processes.

### Lifecycle & Signals

1. **Fork:*- Parent creates an identical child process.
2. **Execve:*- Child replaces its memory space with a new program.
3. **Init (PID 1):*- The ultimate parent of all processes.

| Signal | Command | Effect |
| --- | --- | --- |
| `15` | `kill -15 <pid>` | **SIGTERM**: Graceful termination (allows cleanup). |
| `9` | `kill -9 <pid>` | **SIGKILL**: Forced termination (immediate). |
| `0` | `kill -0 <pid>` | Check if process exists and if you have permission to signal it. |

---

## ⏳ Job Control & Priority

### Background vs. Foreground

- `&`: Run command in background.
- `Ctrl + Z`: Suspend current foreground process.
- `jobs`: List active jobs.
- `bg %1`: Move job 1 to background.
- `fg %1`: Move job 1 to foreground.

### Process Niceness (Priority)

Range is -20 (highest) to 19 (lowest).

- `nice -n 5 <command>`: Start a process with lower priority.
- `renice 10 -p <pid>`: Change priority of an existing process.

---

## 📦 Package & Archive Management

### Compression & Archiving

```bash
gzip file               # Compress (creates file.gz)
gunzip file.gz          # Decompress
tar -cvf archive.tar f1 f2    # Create tarball
tar -xvf archive.tar          # Extract tarball
tar -czvf archive.tar.gz f1   # Create compressed tar.gz

```

### Package Managers

| Task | Debian (`dpkg`/`apt`) | Red Hat (`rpm`/`yum`) |
| --- | --- | --- |
| **Install*- | `dpkg -i pkg.deb` | `rpm -i pkg.rpm` |
| **Remove*- | `dpkg -r pkg.deb` | `rpm -e pkg.rpm` |
| **List*- | `dpkg -l` | `rpm -qa` |

### Compiling from Source

1. `tar -xzvf package.tar.gz`
2. `./configure` (Checks dependencies)
3. `make` (Compiles code)
4. `sudo make install` (Installs to system)
5. *Alternative:- `sudo checkinstall` (Creates a package for easier removal later).

