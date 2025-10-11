/* KC868-A8 Control Panel (ESPHome web_server)
   Works with the YAML you built (switches, numbers, selects, buttons, text_sensors)
   No external deps, all vanilla JS.
*/

const $ = (sel) => document.querySelector(sel);
const slotsEl = $("#slots");
const relaysEl = $("#relays");
const statusEl = $("#status");
const dot = $("#netDot");

let BASE = ""; // http://<ip>

const MAP = {
  // Switches (IDs from YAML)
  switches: ["relay1","relay2","relay3","relay4","relay5","relay6","relay7","relay8"],

  // Binary sensors (guessed by names used in YAML)
  binarySensors: ["input1","input2","input3","input4","input5","input6","input7","input8"],

  // Sensors
  sensors: ["a1_volts","a2_volts"],

  // Numbers (template numbers) - IDs are exact from YAML
  numbers: ["rf_repeat","rf_pulse_len","slot_select","rf_min_bits","rf_min_raw_timings","rf_quiet_ms"],

  // Select
  selects: ["rf_protocol_select"],

  // Text sensors
  textSensors: ["learned_status", ...Array.from({length:16}, (_,i)=>`slot_${String(i+1).padStart(2,"0")}`)],

  /* Buttons → template buttons (endpoints are /button/<id>/press)
     We must guess the sanitized object_id from the button's name in YAML.
     If you changed names, adjust these IDs.
  */
  buttons: {
    start_learning: "start_rf_learning_ui",
    tx_learned: "transmit_learned_433",
    save_slot: "save_learned_slot",            // if your name used an arrow, we fall back below too
    tx_slot: "transmit_slot",
    clear_slot: "clear_slot",
    learn_to_slot: "learn_to_selected_slot"
  },

  // Fallback alternative IDs (if your device had arrow char → in the name)
  buttonFallbacks: {
    save_slot: ["save_learned_→_slot","save_learned___slot","save_learned_slot"]
  }
};

// ---------- Helpers ----------
async function getJSON(path) {
  const url = `${BASE}${path}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function postJSON(path, body = {}) {
  const url = `${BASE}${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json().catch(() => ({}));
}
function setNet(ok) {
  dot.style.background = ok ? "var(--ok)" : "var(--warn)";
  dot.style.boxShadow = ok ? "0 0 10px var(--ok)" : "0 0 10px var(--warn)";
}
function say(s) { statusEl.textContent = s; }

// ---------- Switch UI ----------
function makeRelayToggle(id) {
  const wrap = document.createElement("div");
  wrap.className = "toggle";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = id;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch";
  input.id = `sw_${id}`;
  input.addEventListener("change", async () => {
    try {
      const state = input.checked ? "ON" : "OFF";
      await postJSON(`/switch/${id}`, { state });
      say(`${id} → ${state}`);
    } catch (e) {
      say(`Switch error: ${e.message}`);
      input.checked = !input.checked; // revert
    }
  });
  wrap.append(label, input);
  return wrap;
}

async function refreshRelays() {
  for (const id of MAP.switches) {
    try {
      const j = await getJSON(`/switch/${id}`);
      const el = $(`#sw_${id}`);
      if (el) el.checked = !!j.value;
    } catch { /* ignore missing */ }
  }
}

// ---------- Binary sensors / Sensors / Text ----------
async function refreshInputs() {
  for (let i=0;i<MAP.binarySensors.length;i++) {
    const id = MAP.binarySensors[i];
    const el = $(`#in${i+1}`);
    if (!el) continue;
    try {
      const j = await getJSON(`/binary_sensor/${id}`);
      el.textContent = j.state ?? (j.value ? "ON" : "OFF");
    } catch { el.textContent = "—"; }
  }
}
async function refreshSensors() {
  const map = { a1_volts: "#a1", a2_volts: "#a2" };
  for (const id of MAP.sensors) {
    try {
      const j = await getJSON(`/sensor/${id}`);
      const el = $(map[id]);
      if (el) el.textContent = j.state !== undefined ? `${(+j.state).toFixed(3)} V` : "—";
    } catch { /* ignore */ }
  }
}
async function refreshText() {
  try {
    const j = await getJSON(`/text_sensor/learned_status`);
    $("#learned_status").textContent = j.state ?? "—";
  } catch { $("#learned_status").textContent = "—"; }

  // slots 01..16
  slotsEl.innerHTML = "";
  for (let i=1;i<=16;i++) {
    const id = `slot_${String(i).padStart(2,"0")}`;
    const card = document.createElement("div");
    card.className = "slider";
    const title = document.createElement("div");
    title.innerHTML = `<span class="muted">Slot ${String(i).padStart(2,"0")}</span>`;
    const value = document.createElement("div");
    value.className = "mono";
    value.textContent = "—";
    card.append(title, value);
    slotsEl.append(card);
    try {
      const j = await getJSON(`/text_sensor/${id}`);
      value.textContent = j.state ?? "—";
    } catch {
      value.textContent = "Empty / unavailable";
    }
  }
}

// ---------- Numbers / Selects ----------
async function setNumber(id, val) {
  await postJSON(`/number/${id}`, { value: Number(val) });
}
async function setSelect(id, option) {
  await postJSON(`/select/${id}`, { option });
}
async function loadNumber(id, inputEl) {
  try {
    const j = await getJSON(`/number/${id}`);
    if (j.state !== undefined) inputEl.value = j.state;
  } catch {}
}
async function loadSelect(id, selEl) {
  try {
    const j = await getJSON(`/select/${id}`);
    if (j.state) selEl.value = j.state;
  } catch {}
}

// ---------- Buttons (template buttons trigger scripts) ----------
async function pressButton(objectId) {
  // endpoint: /button/<id>/press
  return postJSON(`/button/${objectId}/press`, {});
}
async function pressButtonWithFallback(key) {
  const id = MAP.buttons[key];
  try {
    await pressButton(id);
    return;
  } catch {}
  const fallbacks = MAP.buttonFallbacks[key] || [];
  for (const alt of fallbacks) {
    try { await pressButton(alt); return; } catch {}
  }
  throw new Error(`Button ${key} not found (tried: ${[id, ...(MAP.buttonFallbacks[key]||[])].join(", ")})`);
}

// ---------- Connect / Refresh ----------
async function connectAndInit() {
  const ip = $("#ip").value.trim();
  if (!ip) { say("Enter your device IP first"); return; }
  BASE = ip.startsWith("http") ? ip : `http://${ip}`;
  say("Connecting…");

  // Create relay toggles once
  relaysEl.innerHTML = "";
  MAP.switches.forEach(id => relaysEl.appendChild(makeRelayToggle(id)));

  try {
    // Load numbers/selects
    await Promise.all([
      loadSelect("rf_protocol_select", $("#rf_protocol_select")),
      loadNumber("rf_pulse_len", $("#rf_pulse_len")),
      loadNumber("rf_repeat", $("#rf_repeat")),
      loadNumber("slot_select", $("#slot_select")),
      loadNumber("rf_min_bits", $("#rf_min_bits")),
      loadNumber("rf_min_raw_timings", $("#rf_min_raw_timings")),
      loadNumber("rf_quiet_ms", $("#rf_quiet_ms")),
    ]);
    // First refresh pass
    await Promise.all([refreshRelays(), refreshInputs(), refreshSensors(), refreshText()]);
    setNet(true);
    say(`Connected to ${BASE}`);
  } catch (e) {
    setNet(false);
    say(`Connect failed: ${e.message}`);
  }
}
async function refreshAll() {
  if (!BASE) return;
  try {
    await Promise.all([refreshRelays(), refreshInputs(), refreshSensors(), refreshText()]);
    setNet(true);
    say("Refreshed");
  } catch (e) {
    setNet(false);
    say(`Refresh failed: ${e.message}`);
  }
}

// ---------- Wire up events ----------
$("#connect").addEventListener("click", connectAndInit);
$("#refresh").addEventListener("click", refreshAll);

// numbers/selects on change
$("#rf_protocol_select").addEventListener("change", async (e) => {
  try { await setSelect("rf_protocol_select", e.target.value); say("Protocol set"); } catch (err) { say(err.message); }
});
$("#rf_pulse_len").addEventListener("change", async (e) => {
  try { await setNumber("rf_pulse_len", e.target.value); say("Pulse length set"); } catch (err) { say(err.message); }
});
$("#rf_repeat").addEventListener("change", async (e) => {
  try { await setNumber("rf_repeat", e.target.value); say("Repeat set"); } catch (err) { say(err.message); }
});
$("#slot_select").addEventListener("change", async (e) => {
  try { await setNumber("slot_select", e.target.value); say("Slot selected"); } catch (err) { say(err.message); }
});

// squelch sliders + live label
function wireSlider(id, labelId) {
  const el = $(id), lab = $(labelId);
  const setLab = () => lab.textContent = el.value;
  setLab();
  el.addEventListener("input", setLab);
  el.addEventListener("change", async () => {
    try { await setNumber(el.id, el.value); say(`${el.id} = ${el.value}`); } catch (e) { say(e.message); }
  });
}
wireSlider("#rf_min_bits", "#rf_min_bits_val");
wireSlider("#rf_min_raw_timings", "#rf_min_raw_timings_val");
wireSlider("#rf_quiet_ms", "#rf_quiet_ms_val");

// buttons → scripts
$("#btn_start_learn").addEventListener("click", async () => {
  try { await pressButtonWithFallback("start_learning"); say("Learning started"); } catch (e) { say(e.message); }
});
$("#btn_tx_learned").addEventListener("click", async () => {
  try { await pressButtonWithFallback("tx_learned"); say("TX learned sent"); } catch (e) { say(e.message); }
});
$("#btn_save_slot").addEventListener("click", async () => {
  try { await pressButtonWithFallback("save_slot"); say("Saved to slot"); await refreshText(); } catch (e) { say(e.message); }
});
$("#btn_tx_slot").addEventListener("click", async () => {
  try { await pressButtonWithFallback("tx_slot"); say("TX slot sent"); } catch (e) { say(e.message); }
});
$("#btn_clear_slot").addEventListener("click", async () => {
  try { await pressButtonWithFallback("clear_slot"); say("Slot cleared"); await refreshText(); } catch (e) { say(e.message); }
});
$("#btn_learn_to_slot").addEventListener("click", async () => {
  try {
    await pressButtonWithFallback("learn_to_slot");
    say("Learning → Slot sequence triggered");
    // give it ~16s then refresh the slot status
    setTimeout(refreshText, 16500);
  } catch (e) { say(e.message); }
});

// Auto-refresh every 5s
setInterval(() => { if (BASE) refreshAll(); }, 5000);

// Optional: remember last IP in localStorage
const last = localStorage.getItem("kc868_ip");
if (last) $("#ip").value = last;
$("#ip").addEventListener("change", (e) => localStorage.setItem("kc868_ip", e.target.value.trim()));
