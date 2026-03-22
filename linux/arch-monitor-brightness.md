---
title: adjust brightness keybinding - arch hyprland
tags: arch, hyprland, keybinding, config
---
## Why this is the standard

* External monitors **do not use `/sys/class/backlight`** → `brightnessctl` won’t work ([ArchWiki][1])
* Wayland **doesn’t support xrandr brightness tricks** ([Ask Ubuntu][2])
* Only reliable way = **hardware control via DDC/CI (I2C bus)** ([ArchWiki][1])

👉 That’s exactly what `ddcutil` does.



## 1. Core backend

```bash
sudo pacman -S ddcutil i2c-tools
sudo modprobe i2c-dev
sudo modprobe i2c-nvidia-gpu
```

---

## 2. Permissions (required for smooth use)

```bash
sudo groupadd i2c 2>/dev/null
sudo usermod -aG i2c $USER
```

Optional (proper fix):

```bash
echo 'KERNEL=="i2c-[0-9]*", GROUP="i2c", MODE="0660"' | sudo tee /etc/udev/rules.d/99-i2c.rules
```

---

## 3. Detect monitors

```bash
ddcutil detect
```

---

## 4. Fast brightness control (important optimization)

Use bus number (this matters a LOT for responsiveness):

ddcutil -b 2 getvcp 10
ddcutil -b 3 getvcp 10


ddcutil -b 2 setvcp 10 50
ddcutil -b 3 setvcp 10 50

ddcutil -b 2 setvcp 10 + 5
ddcutil -b 3 setvcp 10 - 5

👉 Without `-b`, it’s noticeably slower (community reports confirm this) ([Reddit][3])

if fails without sudo, then:

```bash
sudo usermod -aG i2c $USER
```
---

## omarchy hyprland keybindings

Add this to your custom config:

```ini
# Remove Omarchy's existing brightness bindings
unbind = CTRL, F1
unbind = CTRL, F2

# Rebind to external monitor brightness (DDC/CI)

# Decrease
bind = CTRL, F1, exec, ddcutil -b 2 setvcp 10 - 5 && ddcutil -b 3 setvcp 10 - 5

# Increase
bind = CTRL, F2, exec, ddcutil -b 2 setvcp 10 + 5 && ddcutil -b 3 setvcp 10 + 5
```

---

# 🔧 Notes

* `unbind` ensures Omarchy’s Apple-specific brightness script does not run
* Using `&&` keeps both monitors in sync (like Twinkle Tray global slider)
* Your buses:

  * LG → `-b 2`
  * MSI → `-b 3`

---

# 🧠 Optional refinements

## 1. Faster response

```ini
bind = CTRL, F2, exec, ddcutil -b 2 --sleep-multiplier=0.2 setvcp 10 + 5 && ddcutil -b 3 --sleep-multiplier=0.2 setvcp 10 + 5
```

---

## 2. Separate control per monitor

```ini
# LG
bind = CTRL, F1, exec, ddcutil -b 2 setvcp 10 - 5
bind = CTRL, F2, exec, ddcutil -b 2 setvcp 10 + 5

# MSI
bind = CTRL SHIFT, F1, exec, ddcutil -b 3 setvcp 10 - 5
bind = CTRL SHIFT, F2, exec, ddcutil -b 3 setvcp 10 + 5
```
