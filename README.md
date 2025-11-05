# Kincony KC868-A8 · ESPHome firmware (with RF learning, 16 slots, and modern Web UI)

<p align="center">
  <a href="https://ozinfl.github.io/kc868-a8/">
    <img src="https://img.shields.io/badge/Install%20Firmware-ESP%20Web%20Tools-0a7cff?logo=espressif&logoColor=white&style=for-the-badge" alt="Install firmware with ESP Web Tools">
  </a>
</p>


> A production-ready ESPHome config for the **Kincony KC868-A8** PLC board:
> - **8 relays**, **8 digital inputs**, **LAN8720 Ethernet**, **2x analog inputs**
> - **433 MHz receiver/transmitter** support with **learn & replay**
> - **16 persistent RF keyfob slots** (save/clear/transmit), wildcard bit-length matching
> - **Web Server v3** “dashboard-style” UI with grouped entities
> - A1 analog threshold → **Relay 1 ON/OFF**; received keyfob code → **Relay 2 10s pulse**
> - One-click install via ESPHome Web or build via GitHub Actions + Pages

---

## Table of Contents

- [What’s new vs original](#whats-new-vs-original)
- [Hardware](#hardware)
- [Features](#features)
- [Web UI (v3)](#web-ui-v3)
- [Flashing / Installation](#flashing--installation)
- [RF Learning & Slots](#rf-learning--slots)
- [Analog Inputs](#analog-inputs)
- [Wiring Notes](#wiring-notes)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

---

## What’s new vs original

This repo started from the upstream KC868-A8 ESPHome project and template, but adds a bunch of functionality and a nicer UI:

- **433 MHz RF learn + replay**
  - **16 persistent slots**: store up to 16 keyfobs (code + bits), survive power loss
  - **Wildcard bit-length matching**: handles receivers that jitter the bit count
  - **“Dump RF Slots”** button for quick diagnostics
- **Actions bound to I/O**
  - A1 > 2.0 V → **Relay 1 ON**; A1 < 2.0 V → **Relay 1 OFF** (with hysteresis)
  - When any **saved keyfob** is received → **Relay 2 pulses 10 s**
- **Modern Web UI (Web Server v3)**
  - Entities grouped into cards (Relays, RF Controls, RF Settings, RF Status, Analog, Inputs, Advanced)
  - Internal helpers hidden by default for a “dashboard-y” feel
- **Stability niceties**
  - Preferences tuned so slot saves are quickly persisted
  - Clear logs that show learn/match results

> The original project uses the ESPHome project template and GitHub Pages to auto-build and host a flashing site. If you want that flow, use GitHub Actions + Pages as described in the ESPHome template repo. :contentReference[oaicite:1]{index=1}

---

## Hardware

- **Board:** Kincony **KC868-A8** PLC (tested on v1.6)
- **MCU:** ESP32 (board def: `esp32dev`)
- **Ethernet:** LAN8720 (MDC=GPIO23, MDIO=GPIO18, CLK=GPIO17, PHY addr=0)
- **I/O expanders:** PCF8574 @ `0x24` (relays), `0x22` (inputs)
- **433 MHz RF:**
  - **Receiver** on **GPIO15** (INPUT_PULLDOWN)
  - **Transmitter** on **GPIO2** (100% duty)
  - Protocols: rc_switch (common PT2262/SC2262 style) + raw capture

---

## Features

- **Relays (1–8)** exposed as switches
- **Inputs (1–8)** exposed as binary sensors (debounced)
- **Analog A1/A2** as voltage sensors (calibrated to 0–5 V)
- **RF learn** (Auto rc_switch or Raw) and **replay**
- **16 persistent slots** (code/bits), save/clear/transmit from UI
- **Runtime matching** of received rc_switch:
  - If matches any slot → **Relay 2 ON for 10 seconds**
- **A1 threshold logic**:
  - Above 2.05 V → Relay 1 ON
  - Below 1.95 V → Relay 1 OFF
- **Logging** only when A1/A2 values change (noise-friendly)

---

## Web UI (v3)

Uses ESPHome **Web Server v3** with sorting groups to make the stock device page feel like a mini dashboard:

- **Relays:** Relay 1..8 (Relay 8 doubles as a “learning LED” indicator)
- **RF Controls:** Start Learning, Transmit Learned, Learn→Save Slot, Transmit Slot, Clear Slot
- **RF Settings:** Protocol selector (Auto/Protocol 1–6/Raw), Pulse length (µs), Repeat count, Slot select
- **RF Status:** Learned status (type + bits + code or raw timing count)
- **Analog:** A1/A2 live voltage
- **Inputs:** Input 1..8 (Input 1 also starts learning)
- **Advanced:** Dump RF Slots (logs all slot contents)

> The web page is served by the firmware (no extra files to host). It’s fast, simple, and works great on mobile.

---

## Flashing / Installation

### Option A — ESPHome Dashboard (local)
1. Open your ESPHome dashboard and **Add device** → **Existing YAML**.
2. Paste `kc868-a8.yaml` from this repo.
3. Plug the KC868-A8 via USB (or use network OTA) and **Install**.

### Option B — GitHub Actions + GitHub Pages (in-browser flash)
This project follows the **ESPHome Project Template** pattern where CI builds firmware and GitHub Pages hosts a site with an **“Install”** button powered by **ESP Web Tools**. Steps (high-level):

1. Use the repository template, or configure your workflows (`.github/workflows/*.yml`) to build your YAML(s).
2. Enable **Pages** and point it at the **GitHub Actions** artifact.
3. Visit your Pages site and click **Install** to flash over WebUSB/WebSerial.

> For the general template flow, see the upstream template’s README (generate repo, tweak workflows, and deploy to Pages). :contentReference[oaicite:2]{index=2}

---

## RF Learning & Slots

- **Start Learning**
  - Choose **RF Protocol**:  
    - **Auto (rc_switch)** for common fixed-code keyfobs (preferred)  
    - **Raw** if your fob isn’t rc_switch-compatible
  - Click **Start RF Learning** (or press **Input 1**).
  - Relay 8 turns on during the 15 s learning window.
  - Press the keyfob once or twice near the receiver.
  - Learned status updates (rc_switch bits+code or raw count).

- **Save / Transmit / Clear**
  - Pick a **Slot** (1–16).
  - **Learn → Save Slot** (waits 15 s for a new learn, then saves).
  - **Transmit Slot** replays the saved code (using current pulse/rep settings).
  - **Clear Slot** wipes just that slot.
  - **Dump RF Slots** logs the full table for quick auditing.

- **Runtime behavior**
  - When a **received rc_switch** matches any saved slot (code match; **bits may be wildcarded** if saved as 0), **Relay 2** turns ON for **10 s** (then OFF).

---

## Analog Inputs

- **A1 Voltage**  
  Smoothed + calibrated to 0–5 V.  
  - **> 2.05 V** → **Relay 1 ON**  
  - **< 1.95 V** → **Relay 1 OFF**

- **A2 Voltage**  
  Smoothed + calibrated to 0–5 V.  
  - Rising above threshold in the YAML will **transmit the learned RF** (you can adjust which transmit helper script to use / thresholds if you want A2 to also act as a trigger source).

- Both A1 & A2 only **log** when their value **changes** ≥ 0.02 V, to keep logs clean.

---

## Wiring Notes

- **PCF8574**:
  - Outputs expander `0x24` → **Relays 1–8**
  - Inputs expander `0x22` → **Inputs 1–8**
- **Ethernet (LAN8720)** on GPIO23/18/17 (see YAML pins)
- **433 MHz**:
  - **RX** on **GPIO15** (pulldown)
  - **TX** on **GPIO2**

> If you see the receiver spamming noise, try better RF modules, a short antenna (e.g., ~17 cm for 433.92 MHz), and a clean 5 V supply to the receiver.

---

## Troubleshooting

- **RF won’t learn**
  - Ensure **RF Protocol = Auto (rc_switch)** first; if it still won’t learn, try **Raw**.
  - Some “rolling code” or encrypted fobs won’t work (this firmware targets simple fixed-code fobs).
- **Saved fob doesn’t trigger Relay 2**
  - Use **Dump RF Slots**; compare logs to `rc_switch rx: code=… bits=…`.
  - Bits are wildcarded if you saved a slot with `bits = 0`. If you saved a strict bit-length and it jitters, clear & re-save the slot (or set bits to 0 by editing).
- **Ethernet errors**
  - Double-check LAN8720 wiring and that nothing else uses those pins.
- **CORS from custom UI**
  - This firmware serves the built-in UI. If you host your own page elsewhere, either enable CORS on the device or serve it from the device to keep same-origin.

---

## Credits

- Original KC868-A8 ESPHome project template and CI/Pages approach inspired by **hzkincony/kc868-a8**, which itself is generated from the **ESPHome project template**. :contentReference[oaicite:3]{index=3}
- rc_switch protocols and raw timing support come from ESPHome’s `remote_receiver` / `remote_transmitter` components.

---

## License

- See `LICENSE` in this repo.
