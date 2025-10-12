# KC868-A8 · ESPHome firmware (with RF learning, 16 slots, and modern Web UI)

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
This proj


IO pin wiring (RX on GPIO15, TX on GPIO2)

A1 threshold → Relay1 ON/OFF (with hysteresis) + “log on change”

A2 threshold → transmit learned RF

Learning via UI button or DI1 (Relay8 shows learning window)

10-second pulse on Relay2 when any stored keyfob (up to 16 slots) is heard

16-slot RC code book (save / transmit / clear from web UI)

Slot status lines (Empty or bits/code)

UI sliders for RF Repeat and Pulse Length

Safe on_boot turning Relay2 off
