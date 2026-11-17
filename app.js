(() => {
"use strict";

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
let reduced = false;
try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
const MINUS = "−";
const euro = (n, dp = 2) => (n < 0 ? MINUS : "") + "€" + Math.abs(n).toFixed(dp);
function trimNum(x) {
  if (x >= 100) return String(Math.round(x));
  if (x >= 10) return String(Math.round(x * 10) / 10);
  return String(Math.round(x * 100) / 100);
}
function shortEuro(n) {
  const a = Math.abs(n), s = n < 0 ? MINUS : "";
  if (a >= 1e9) return s + "€" + trimNum(a / 1e9) + "B";
  if (a >= 1e6) return s + "€" + trimNum(a / 1e6) + "M";
  if (a >= 1e3) return s + "€" + trimNum(a / 1e3) + "k";
  return s + "€" + Math.round(a);
}
const pct1 = x => String(Math.round(x * 10) / 10);
const clamp = (x, lo, hi, d) => (typeof x === "number" && isFinite(x)) ? Math.min(hi, Math.max(lo, x)) : d;
function roundNice(x) { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; }
function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function niceDate(iso) { const p = iso.split("-").map(Number); return p[2] + " " + MONTHS[p[1] - 1] + " " + p[0]; }
function fillRange(el) { const p = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100; el.style.setProperty("--p", p + "%"); }
function setRadio(name, val) { for (const r of $$('input[name="' + name + '"]')) r.checked = r.value === String(val); }

/* ---------- local storage (one device, best effort) ---------- */
const LS_STATE = "fowm-blueprint/state", LS_UI = "fowm-blueprint/ui";
let lsOK = false;
try { localStorage.setItem("fowm-blueprint/t", "1"); localStorage.removeItem("fowm-blueprint/t"); lsOK = true; } catch (e) {}
function lsGet(k) { if (!lsOK) return null; try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function lsSet(k, v) { if (!lsOK) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ---------- saved state: ticks, gates, weekly numbers, kitchen tests ---------- */
const KPI_KEYS = ["taste", "buy", "conv", "reorder", "churn", "kept", "cac", "cafe", "cash"];
const TEST_V = ["A", "B", "C", "D"];
const blank = () => ({ v: 1, tasks: {}, gates: {}, raise: {}, kpi: {}, kpiAt: null, tests: {} });
let state = blank();

function clean(d) {
  const out = blank();
  if (!d || typeof d !== "object") return out;
  const flags = (m, re) => { const r = {}; if (m && typeof m === "object") for (const k of Object.keys(m)) if (m[k] === true && re.test(k)) r[k] = true; return r; };
  out.tasks = flags(d.tasks, /^s[0-6]-\d{1,2}$/);
  out.gates = flags(d.gates, /^[0-5]$/);
  out.raise = flags(d.raise, /^r[1-6]$/);
  if (d.kpi && typeof d.kpi === "object") for (const k of KPI_KEYS) { const n = d.kpi[k]; if (typeof n === "number" && isFinite(n)) out.kpi[k] = n; }
  if (typeof d.kpiAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.kpiAt)) out.kpiAt = d.kpiAt;
  if (d.tests && typeof d.tests === "object") for (const v of TEST_V) {
    const t = d.tests[v];
    if (!t || typeof t !== "object") continue;
    const o = {};
    for (const f of ["h", "taste"]) if (typeof t[f] === "number" && isFinite(t[f])) o[f] = t[f];
    for (const f of ["s5", "s10", "clumps", "curdle"]) if (typeof t[f] === "boolean") o[f] = t[f];
    if (Object.keys(o).length) out.tests[v] = o;
  }
  return out;
}

/* ---------- saving: on this phone only, like the other apps ---------- */
const writable = true;
function setStatus() {
  const t = lsOK ? "Progress saves on this phone." : "Progress won't be kept after you close the app.";
  for (const el of $$("[data-save-status]")) el.textContent = t;
}
function changed() { lsSet(LS_STATE, state); setStatus(); }

/* ---------- stages, cup and next up ---------- */
const STAGES = $$(".stage").map(li => ({
  li, n: Number(li.dataset.stage), title: li.dataset.title,
  details: $("details", li),
  tasks: $$("input[data-task]", li).map(i => i.dataset.task),
  hasGate: !!$("input[data-gate]", li),
  gateText: ($(".gate-text", li) || { textContent: "" }).textContent,
  count: $(".st-count", li)
}));
const TOTAL = STAGES.reduce((a, s) => a + s.tasks.length + (s.hasGate ? 1 : 0), 0);
const FOAM_TOP0 = 280, FOAM_RANGE = 230;
const yAt = f => FOAM_TOP0 - FOAM_RANGE * f;
const foamEl = $("#foam");
let foamY = FOAM_TOP0, foamRAF = 0;
function foamTo(p, animate) {
  const target = yAt(p);
  cancelAnimationFrame(foamRAF);
  if (!animate || reduced) { foamY = target; foamEl.setAttribute("transform", "translate(0 " + foamY.toFixed(1) + ")"); return; }
  const from = foamY, t0 = performance.now(), dur = 1100;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    foamY = from + (target - from) * e;
    foamEl.setAttribute("transform", "translate(0 " + foamY.toFixed(1) + ")");
    if (k < 1) foamRAF = requestAnimationFrame(step);
  };
  foamRAF = requestAnimationFrame(step);
}
const SVGNS = "http://www.w3.org/2000/svg";
const dots = [];
(function buildRuler() {
  const ruler = $("#ruler");
  const mk = (tag, attrs) => { const el = document.createElementNS(SVGNS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };
  ruler.appendChild(mk("line", { x1: 258, y1: yAt(0), x2: 258, y2: yAt(1), class: "rule" }));
  ruler.appendChild(mk("line", { x1: 252, y1: yAt(0), x2: 264, y2: yAt(0), class: "rule" }));
  let cum = 0;
  for (const s of STAGES) {
    const w = s.tasks.length + (s.hasGate ? 1 : 0);
    const f0 = cum / TOTAL, f1 = (cum + w) / TOTAL; cum += w;
    ruler.appendChild(mk("line", { x1: 252, y1: yAt(f1), x2: 264, y2: yAt(f1), class: "rule" }));
    const g = mk("g", { class: "dot" });
    const ym = yAt((f0 + f1) / 2);
    g.appendChild(mk("circle", { cx: 282, cy: ym, r: 11.5 }));
    const t = mk("text", { x: 282, y: ym, dy: "0.35em" }); t.textContent = s.n; g.appendChild(t);
    ruler.appendChild(g); dots.push(g);
  }
})();

function progress() {
  let done = 0;
  const per = STAGES.map(s => {
    const d = s.tasks.filter(t => state.tasks[t]).length;
    const g = s.hasGate && state.gates[s.n] ? 1 : 0;
    done += d + g;
    return { d, complete: s.hasGate ? g === 1 : d === s.tasks.length };
  });
  let current = per.findIndex(p => !p.complete);
  if (current < 0) current = STAGES.length;
  return { done, per, current };
}
let lastCurrent = -1;
function renderProgress(animate, userAction) {
  const { done, per, current } = progress();
  const pct = Math.round(done / TOTAL * 100);
  $("#meterPct").textContent = pct + "%";
  $("#meterFill").style.width = pct + "%";
  $("#meter").setAttribute("aria-label", "Plan progress: " + pct + "%");
  $("#doneN").textContent = done;
  $("#totalN").textContent = TOTAL;
  foamTo(done / TOTAL, animate);
  STAGES.forEach((s, i) => {
    s.count.textContent = per[i].d + "/" + s.tasks.length;
    s.li.classList.toggle("is-now", i === current);
    s.li.classList.toggle("is-done", per[i].complete);
    dots[i].setAttribute("class", "dot" + (per[i].complete ? " done" : i === current ? " now" : ""));
  });
  $("#cupStage").textContent = current < STAGES.length ? "You're in Stage " + STAGES[current].n + ": " + STAGES[current].title : "Every stage is done";
  if (current < STAGES.length) {
    const noneOpen = !STAGES.some(s => s.details.open);
    if (noneOpen || (userAction && current !== lastCurrent)) STAGES[current].details.open = true;
  }
  lastCurrent = current;
  return current;
}
function renderChecks() {
  for (const el of $$("input[data-task]")) el.checked = !!state.tasks[el.dataset.task];
  for (const el of $$("input[data-gate]")) el.checked = !!state.gates[el.dataset.gate];
  for (const el of $$("input[data-raise]")) el.checked = !!state.raise[el.dataset.raise];
}
function renderNext(current) {
  const list = $("#nextList"), intro = $("#nextIntro"), gp = $("#gatePrompt");
  list.textContent = "";
  if (current >= STAGES.length) { intro.textContent = "Every step is done. Next: prepare the sale (see Exit)."; gp.hidden = true; return; }
  const s = STAGES[current];
  const open = s.tasks.filter(t => !state.tasks[t]);
  if (open.length) {
    intro.textContent = "Stage " + s.n + ": " + s.title + ". " + open.length + (open.length === 1 ? " step" : " steps") + " left.";
    for (const id of open.slice(0, 5)) {
      const src = $('input[data-task="' + id + '"]', s.li).closest("label");
      const li = document.createElement("li");
      const lab = src.cloneNode(true);
      const inp = $("input", lab); inp.checked = false; inp.disabled = !writable;
      li.appendChild(lab); list.appendChild(li);
    }
    gp.hidden = true;
  } else {
    intro.textContent = "Every step in Stage " + s.n + " is done. Check the gate before you move on.";
    $("#gateText").textContent = s.gateText;
    const gb = $("#gateBox");
    gb.dataset.gate = String(s.n); gb.checked = !!state.gates[s.n]; gb.disabled = !writable;
    gp.hidden = !s.hasGate;
  }
}
function renderRaise() {
  const n = ["r1", "r2", "r3", "r4", "r5", "r6"].filter(k => state.raise[k]).length;
  const pill = $("#readyPill");
  pill.textContent = n === 6 ? "Ready" : n + " of 6";
  pill.className = "pill " + (n === 6 ? "go" : "none");
  $("#readyBar").style.width = (n / 6 * 100) + "%";
}

/* ---------- weekly number check ---------- */
const KPIS = [
  { id: "taste", name: "Blind taste test",
    fields: [{ k: "taste", label: "Average taste", unit: "/10", step: "0.1", min: 0, max: 10 }, { k: "buy", label: "Would buy at €29.90", unit: "%", step: "1", min: 0, max: 100 }],
    lines: "Green: 7+, and 6 in 10 would buy. Yellow: 6 to 7. Red: under 6.",
    grade: v => v.taste === undefined ? null : v.taste < 6 ? "stop" : (v.taste >= 7 && v.buy !== undefined && v.buy >= 60) ? "go" : "fix",
    fix: "Don't sell. Go back to the kitchen tests and the manufacturer. Nothing downstream can fix a product people don't love." },
  { id: "conv", name: "Website visitors who buy",
    fields: [{ k: "conv", label: "Visitors who buy", unit: "%", step: "0.1", min: 0, max: 100 }],
    lines: "Green: 2.5%+. Yellow: 1.5–2.5%. Red: under 1.5%.",
    grade: v => v.conv === undefined ? null : v.conv >= 2.5 ? "go" : v.conv >= 1.5 ? "fix" : "stop",
    fix: "Watch 10 people use your site on their phone. Fix the first thing that confuses them. Usually that's the price, the photos or the delivery cost." },
  { id: "reorder", name: "Customers who reorder within 90 days",
    fields: [{ k: "reorder", label: "Reorder rate", unit: "%", step: "1", min: 0, max: 100 }],
    lines: "Green: 40%+. Yellow: 30–40%. Red: under 30%.",
    grade: v => v.reorder === undefined ? null : v.reorder >= 40 ? "go" : v.reorder >= 30 ? "fix" : "stop",
    fix: "Call 10 customers who didn't reorder and ask why. Taste, price and \"I forgot\" each have a different fix: recipe, bundle price, or reminder emails." },
  { id: "churn", name: "Subscribers who cancel each month",
    fields: [{ k: "churn", label: "Cancel rate", unit: "%", step: "0.1", min: 0, max: 100 }],
    lines: "Green: under 5%. Yellow: 5–8%. Red: over 8%.",
    grade: v => v.churn === undefined ? null : v.churn < 5 ? "go" : v.churn <= 8 ? "fix" : "stop",
    fix: "Add \"skip a delivery\" and \"pause\" before \"cancel\". Ask every person who cancels for the reason." },
  { id: "kept", name: "Kept per order, before ads",
    fields: [{ k: "kept", label: "Kept per order", unit: "€", pre: true, step: "0.01", min: -100, max: 1000 }],
    lines: "Green: €7+. Yellow: €4–7. Red: under €4. The calculator above works this out.",
    grade: v => v.kept === undefined ? null : v.kept >= 7 ? "go" : v.kept >= 4 ? "fix" : "stop",
    fix: "Raise the price, push bundles, or renegotiate whey and shipping. Don't buy ads until it's green." },
  { id: "cac", name: "Cost to win one customer",
    fields: [{ k: "cac", label: "Cost per new customer", unit: "€", pre: true, step: "0.01", min: 0, max: 1000 }],
    lines: "Green: under the first order's kept money. Yellow: up to 3 orders' kept money. Red: more than 3 orders' kept money.",
    grade: v => v.cac === undefined ? null : v.kept === undefined ? "need" : v.kept <= 0 ? (v.cac > 0 ? "stop" : "go") : v.cac < v.kept ? "go" : v.cac <= 3 * v.kept ? "fix" : "stop",
    fix: "Stop paid ads. Go back to creators on commission and cafés, where you only pay when someone buys." },
  { id: "cafe", name: "Protein freddos per café per week",
    fields: [{ k: "cafe", label: "Per café, per week", unit: "", step: "1", min: 0, max: 10000 }],
    lines: "Green: 20+. Yellow: 10–20. Red: under 10.",
    grade: v => v.cafe === undefined ? null : v.cafe >= 20 ? "go" : v.cafe >= 10 ? "fix" : "stop",
    fix: "Change the menu card and train the staff. If it's still red after 2 more weeks, move on to a different café." },
  { id: "cash", name: "Months of cash left",
    fields: [{ k: "cash", label: "Months left", unit: "months", step: "0.5", min: 0, max: 240 }],
    lines: "Cash in the bank divided by what you lose each month. Green: 6+. Yellow: 3–6. Red: under 3.",
    grade: v => v.cash === undefined ? null : v.cash >= 6 ? "go" : v.cash >= 3 ? "fix" : "stop",
    fix: "Cut everything except product and customers. Start talking to investors before it gets there, not after." }
];
const PILL = { go: ["go", "Green: keep going"], fix: ["fix", "Yellow: fix it"], stop: ["stop", "Red: stop and change"], need: ["none", "Add kept per order"], none: ["none", "Not measured"] };
function buildKPI() {
  const ul = $("#kpi");
  for (const K of KPIS) {
    const li = document.createElement("li"); li.dataset.k = K.id;
    const head = document.createElement("div"); head.className = "kpi-head";
    const nm = document.createElement("span"); nm.className = "kpi-name"; nm.textContent = K.name;
    const pill = document.createElement("span"); pill.className = "pill none";
    head.append(nm, pill);
    const box = document.createElement("div"); box.className = "kpi-in";
    for (const f of K.fields) {
      const lab = document.createElement("label");
      const cap = document.createElement("span"); cap.textContent = f.label;
      const wrap = document.createElement("span"); wrap.className = "num";
      const inp = document.createElement("input");
      inp.type = "number"; inp.inputMode = "decimal"; inp.step = f.step; inp.min = f.min; inp.max = f.max; inp.placeholder = "–";
      inp.dataset.kpi = f.k; inp.disabled = !writable;
      const u = document.createElement("em"); u.textContent = f.unit;
      if (f.pre) wrap.append(u, inp); else { wrap.append(inp); if (f.unit) wrap.append(u); }
      lab.append(cap, wrap); box.appendChild(lab);
    }
    const lines = document.createElement("p"); lines.className = "kpi-lines"; lines.textContent = K.lines;
    const fx = document.createElement("p"); fx.className = "kpi-fix"; fx.hidden = true;
    li.append(head, box, lines, fx); ul.appendChild(li);
  }
}
function renderKPI(fillInputs) {
  const v = state.kpi;
  if (fillInputs) for (const inp of $$("input[data-kpi]")) {
    if (document.activeElement === inp) continue;
    const n = v[inp.dataset.kpi]; inp.value = n === undefined ? "" : String(n);
  }
  let g = 0, y = 0, r = 0, none = 0, pick = null;
  for (const K of KPIS) {
    const li = $('#kpi li[data-k="' + K.id + '"]');
    const grade = K.grade(v);
    const p = PILL[grade || "none"];
    const pill = $(".pill", li); pill.className = "pill " + p[0]; pill.textContent = p[1];
    const fx = $(".kpi-fix", li);
    if (grade === "fix" || grade === "stop") { fx.hidden = false; fx.textContent = (grade === "stop" ? "Do this now: " : "To fix it: ") + K.fix; }
    else fx.hidden = true;
    if (grade === "go") g++; else if (grade === "fix") y++; else if (grade === "stop") r++; else none++;
    if (grade === "stop" && (!pick || pick.g !== "stop")) pick = { g: grade, K };
    else if (grade === "fix" && !pick) pick = { g: grade, K };
  }
  const tally = $("#tally"); tally.textContent = "";
  const add = (cls, text) => { const s = document.createElement("span"); s.className = "pill " + cls; s.textContent = text; tally.appendChild(s); };
  if (g) add("go", g + " green"); if (y) add("fix", y + " yellow"); if (r) add("stop", r + " red"); if (none) add("none", none + " not measured");
  const one = $("#oneFix"); one.textContent = "";
  if (pick) { const b = document.createElement("b"); b.textContent = "This week's one fix: " + pick.K.name.toLowerCase() + ". "; one.append(b, pick.K.fix); }
  else if (g) one.textContent = "Everything you measured is green. Keep going.";
  else one.textContent = "Type in a number to see where you stand.";
  $("#kpiDate").textContent = state.kpiAt ? "Last updated " + niceDate(state.kpiAt) + "." : "";
}

/* ---------- kitchen test log ---------- */
const TESTS = [
  { v: "A", what: "Whey isolate + flavour", why: "Should foam best" },
  { v: "B", what: "Version A + a tiny pinch of xanthan gum", why: "Thicker foam that lasts longer" },
  { v: "C", what: "Your current 50/50 whey and pea + coconut", why: "The control to beat" },
  { v: "D", what: "The winner, lightly sweetened", why: "Plain may taste flat on a freddo" }
];
const YN = [
  { f: "s5", q: "Still foamy after 5 minutes?" },
  { f: "s10", q: "Still foamy after 10 minutes?" },
  { f: "clumps", q: "Any clumps?" },
  { f: "curdle", q: "Curdles in a hot latte?" }
];
function numField(v, f, label, unit, step, min, max) {
  const row = document.createElement("label"); row.className = "t-field";
  const cap = document.createElement("span"); cap.textContent = label;
  const wrap = document.createElement("span"); wrap.className = "num";
  const inp = document.createElement("input");
  inp.type = "number"; inp.inputMode = "decimal"; inp.step = step; inp.min = min; inp.max = max; inp.placeholder = "–";
  inp.dataset.test = v; inp.dataset.f = f; inp.disabled = !writable;
  const u = document.createElement("em"); u.textContent = unit;
  wrap.append(inp, u); row.append(cap, wrap);
  return row;
}
function ynField(v, f, q) {
  const row = document.createElement("div"); row.className = "t-field";
  const id = "q-" + v + "-" + f;
  const cap = document.createElement("span"); cap.id = id; cap.textContent = q;
  const seg = document.createElement("span"); seg.className = "seg"; seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-labelledby", id);
  for (const [val, txt] of [["yes", "Yes"], ["no", "No"]]) {
    const lab = document.createElement("label");
    const inp = document.createElement("input");
    inp.type = "radio"; inp.className = "vh"; inp.name = "t-" + v + "-" + f; inp.value = val;
    inp.dataset.test = v; inp.dataset.f = f; inp.disabled = !writable;
    const s = document.createElement("span"); s.textContent = txt;
    lab.append(inp, s); seg.appendChild(lab);
  }
  row.append(cap, seg);
  return row;
}
function buildTests() {
  const box = $("#tests");
  TESTS.forEach((T, i) => {
    const d = document.createElement("details"); d.className = "test"; d.dataset.v = T.v; if (i === 0) d.open = true;
    const sum = document.createElement("summary");
    const row = document.createElement("div"); row.className = "t-row";
    const tv = document.createElement("span"); tv.className = "tv"; tv.textContent = T.v;
    const what = document.createElement("span"); what.className = "t-what"; what.textContent = T.what;
    const why = document.createElement("span"); why.className = "t-why"; why.textContent = T.why;
    const res = document.createElement("span"); res.className = "t-res";
    what.append(why, res); row.append(tv, what); sum.appendChild(row); d.appendChild(sum);
    const body = document.createElement("div"); body.className = "t-body";
    body.appendChild(numField(T.v, "h", "Foam height after 20 seconds", "cm", "0.1", 0, 30));
    for (const q of YN) body.appendChild(ynField(T.v, q.f, q.q));
    body.appendChild(numField(T.v, "taste", "Taste, from 1 to 10", "/10", "1", 1, 10));
    d.appendChild(body); box.appendChild(d);
  });
}
function renderTests(fill) {
  if (fill) for (const inp of $$("input[data-test]")) {
    const t = state.tests[inp.dataset.test] || {}, val = t[inp.dataset.f];
    if (inp.type === "number") { if (document.activeElement !== inp) inp.value = val === undefined ? "" : String(val); }
    else inp.checked = val !== undefined && val === (inp.value === "yes");
  }
  let any = false;
  for (const T of TESTS) {
    const t = state.tests[T.v] || {};
    const bits = [];
    if (t.taste !== undefined) bits.push("taste " + t.taste + "/10");
    if (t.h !== undefined) bits.push(t.h + " cm of foam");
    if (t.clumps === true) bits.push("clumps");
    if (t.s5 === false) bits.push("foam gone by 5 minutes");
    if (Object.keys(t).length) any = true;
    const txt = bits.length ? bits.join(", ") : (Object.keys(t).length ? "Partly logged" : "Not tested yet");
    $('.test[data-v="' + T.v + '"] .t-res').textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  const cands = TESTS.filter(T => { const t = state.tests[T.v] || {}; return t.taste !== undefined && t.clumps !== true && t.s5 !== false; })
    .sort((a, b) => { const x = state.tests[a.v], y = state.tests[b.v]; return (y.taste - x.taste) || ((y.h || 0) - (x.h || 0)) || ((y.s10 === true) - (x.s10 === true)); });
  const lead = cands[0];
  for (const d of $$(".test")) d.classList.toggle("lead-v", !!lead && d.dataset.v === lead.v);
  const lt = $("#leaderText"); lt.textContent = "";
  if (lead) {
    const b = document.createElement("b"); b.textContent = "Version " + lead.v;
    lt.append("Winning so far: ", b, ". " + TESTS.find(T => T.v === lead.v).what + ".");
  } else lt.textContent = any ? "No version passes yet. Each logged one has clumps, lost its foam by 5 minutes, or has no taste score." : "Log a test to see which version is winning.";
}

/* ---------- events for saved state ---------- */
let nextTimer = 0;
function setFlag(group, id, on) { if (on) state[group][id] = true; else delete state[group][id]; }
document.addEventListener("change", e => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !writable) return;
  if (t.dataset.task) {
    setFlag("tasks", t.dataset.task, t.checked);
    renderChecks();
    const cur = renderProgress(true, true);
    clearTimeout(nextTimer);
    if (t.closest("#nextList")) nextTimer = setTimeout(() => renderNext(progress().current), reduced ? 250 : 800);
    else renderNext(cur);
    changed();
  } else if ("gate" in t.dataset) {
    setFlag("gates", t.dataset.gate, t.checked);
    renderChecks();
    const cur = renderProgress(true, true);
    clearTimeout(nextTimer);
    if (t.id === "gateBox") nextTimer = setTimeout(() => renderNext(progress().current), reduced ? 250 : 800);
    else renderNext(cur);
    changed();
  } else if (t.dataset.raise) {
    setFlag("raise", t.dataset.raise, t.checked); renderRaise(); changed();
  } else if (t.dataset.test && t.type === "radio") {
    const v = t.dataset.test;
    state.tests[v] = Object.assign({}, state.tests[v], { [t.dataset.f]: t.value === "yes" });
    renderTests(false); changed();
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !writable) return;
  if (t.dataset.kpi) {
    const raw = t.value.trim(), n = raw === "" ? NaN : Number(raw);
    if (isFinite(n)) state.kpi[t.dataset.kpi] = n; else delete state.kpi[t.dataset.kpi];
    state.kpiAt = todayISO();
    renderKPI(false); changed();
  } else if (t.dataset.test && t.type === "number") {
    const v = t.dataset.test, raw = t.value.trim(), n = raw === "" ? NaN : Number(raw);
    const o = Object.assign({}, state.tests[v]);
    if (isFinite(n)) o[t.dataset.f] = n; else delete o[t.dataset.f];
    if (Object.keys(o).length) state.tests[v] = o; else delete state.tests[v];
    renderTests(false); changed();
  }
});
let clrArm = 0;
$("#kpiClear").addEventListener("click", () => {
  const b = $("#kpiClear");
  if (!clrArm) {
    b.textContent = "Tap again to clear all the numbers";
    clrArm = setTimeout(() => { clrArm = 0; b.textContent = "Clear this week's numbers"; }, 3500);
    return;
  }
  clearTimeout(clrArm); clrArm = 0; b.textContent = "Clear this week's numbers";
  state.kpi = {}; state.kpiAt = null; renderKPI(true); changed();
});

/* ---------- calculators (remembered on this device only) ---------- */
const COST = { gramsWPI: 340, other: 0.60, markup: 1.30, pack: 1.40, feePct: 0.021, feeFix: 0.30 };
const pouchCost = whey => (whey * COST.gramsWPI / 1000 + COST.other) * COST.markup + COST.pack;
const savedUI = lsGet(LS_UI) || {};
const sc = savedUI.calc || {}, sv = savedUI.val || {}, sd = savedUI.dil || {};
const ui = {
  calc: {
    price: clamp(sc.price, 19.9, 39.9, 29.9),
    units: [1, 2, 3].includes(sc.units) ? sc.units : 2,
    disc: [0, 10, 15, 20, 25].includes(sc.disc) ? sc.disc : 0,
    vat: [24, 13].includes(sc.vat) ? sc.vat : 24,
    whey: clamp(sc.whey, 15, 40, 27),
    ship: clamp(sc.ship, 0, 6, 3.5)
  },
  budget: savedUI.budget === "15" ? "15" : "3",
  val: { s: clamp(sv.s, 0, 1000, 325), m: clamp(sv.m, 0, 40, 15), own: clamp(sv.own, 5, 100, 100), hot: sv.hot === true },
  dil: { raise: clamp(sd.raise, 25000, 2000000, 150000), pre: clamp(sd.pre, 0, 1000, 316), own: clamp(sd.own, 10, 100, 100) }
};
let uiTimer = 0;
const saveUI = () => { clearTimeout(uiTimer); uiTimer = setTimeout(() => lsSet(LS_UI, ui), 250); };

const PRESETS = { old: { price: 24.9, units: 1, disc: 0 }, single: { price: 29.9, units: 1, disc: 0 }, double: { price: 29.9, units: 2, disc: 0 }, sub: { price: 29.9, units: 2, disc: 10 } };
function calcOrder(c) {
  const gross = c.price * c.units * (1 - c.disc / 100);
  const net = gross / (1 + c.vat / 100);
  const unit = pouchCost(c.whey);
  const product = unit * c.units;
  const fee = gross * COST.feePct + COST.feeFix;
  const kept = net - product - fee - c.ship;
  return { gross, net, vat: gross - net, unit, product, fee, ship: c.ship, kept };
}
function renderCalc() {
  const c = ui.calc, o = calcOrder(c);
  const pr = $("#cPrice"), wh = $("#cWhey"), sh = $("#cShip");
  pr.value = c.price; wh.value = c.whey; sh.value = c.ship;
  [pr, wh, sh].forEach(fillRange);
  setRadio("units", c.units); setRadio("disc", c.disc); setRadio("vat", c.vat);
  $("#oPrice").textContent = euro(c.price);
  $("#oWhey").textContent = euro(c.whey) + " a kilo";
  $("#oShip").textContent = euro(c.ship);
  $("#cServing").textContent = "That's " + euro(c.price * (1 - c.disc / 100) / 20) + " a serving" + (c.disc ? " after the discount" : "") + ". A café protein freddo costs €4.60.";
  $("#cKept").textContent = euro(o.kept);
  const grade = o.kept >= 7 ? "go" : o.kept >= 4 ? "fix" : "stop";
  const pill = $("#cPill");
  pill.className = "pill " + grade;
  pill.textContent = grade === "go" ? "Green: €7+ an order" : grade === "fix" ? "Yellow: €4 to €7" : o.kept < 0 ? "Red: you lose money" : "Red: under €4";
  $("#cPer").textContent = (o.kept < 0 ? "Lost" : "Kept") + " on an order of " + c.units + (c.units > 1 ? " pouches" : " pouch") + ", before ads." + (c.units > 1 ? " That's " + euro(o.kept / c.units) + " a pouch." : "");
  const parts = [
    ["VAT", o.vat, "var(--seg-vat)"],
    ["Product", o.product, "var(--seg-product)"],
    ["Card fee", o.fee, "var(--seg-fee)"],
    ["Shipping and box", o.ship, "var(--seg-ship)"],
    [o.kept < 0 ? "You lose" : "You keep", o.kept, "var(--accent)"]
  ];
  const base = Math.max(o.gross, o.vat + o.product + o.fee + o.ship);
  const stack = $("#cStack"); stack.textContent = "";
  for (const [, val, col] of parts) {
    if (val <= 0) continue;
    const s = document.createElement("span"); s.style.width = (val / base * 100) + "%"; s.style.background = col; stack.appendChild(s);
  }
  const leg = $("#cLegend"); leg.textContent = "";
  const row = (label, val, col, cls) => {
    const li = document.createElement("li"); if (cls) li.className = cls;
    const sw = document.createElement("span"); sw.className = "sw"; if (col) sw.style.background = col;
    const l = document.createElement("span"); l.textContent = label;
    const b = document.createElement("b"); b.textContent = euro(val);
    li.append(sw, l, b); leg.appendChild(li);
  };
  row("The customer pays", o.gross, null);
  parts.slice(0, 4).forEach(([l, v, col]) => row(l, v, col));
  row(parts[4][0], o.kept, "var(--accent)", "kept-row");
  const cost = $("#cCost"); cost.textContent = "";
  const li = (text) => { const el = document.createElement("li"); el.textContent = text; cost.appendChild(el); };
  const wpi = c.whey * COST.gramsWPI / 1000, ing = wpi + COST.other;
  li("Whey isolate: 340g at " + euro(c.whey) + " a kilo = " + euro(wpi) + ".");
  li("Other ingredients (flavour, sweetener, phosphate, gum): about " + euro(COST.other) + ".");
  li("Manufacturer's blending, filling and margin: about +30%, so " + euro(ing * (COST.markup - 1)) + ".");
  li("Printed pouch, scoop and delivery to you: about " + euro(COST.pack) + ".");
  li("Total: about " + euro(o.unit) + " a pouch.");
  $("#cCac").textContent = o.kept > 0
    ? "With the calculator's numbers right now: spend at most " + euro(o.kept) + " to win a customer today, and up to about " + euro(o.kept * 3) + " once 30%+ reorder."
    : "With the calculator's numbers right now you lose money on every order, so don't pay anything to win customers yet.";
  for (const b of $$("[data-preset]")) {
    const p = PRESETS[b.dataset.preset];
    b.setAttribute("aria-pressed", String(Math.abs(p.price - c.price) < 0.001 && p.units === c.units && p.disc === c.disc));
  }
}
$("#cPrice").addEventListener("input", e => { ui.calc.price = Math.round(Number(e.target.value) * 100) / 100; renderCalc(); saveUI(); });
$("#cWhey").addEventListener("input", e => { ui.calc.whey = Number(e.target.value); renderCalc(); saveUI(); });
$("#cShip").addEventListener("input", e => { ui.calc.ship = Number(e.target.value); renderCalc(); saveUI(); });
for (const name of ["units", "disc", "vat"]) for (const r of $$('input[name="' + name + '"]')) r.addEventListener("change", () => { ui.calc[name] = Number(r.value); renderCalc(); saveUI(); });
for (const b of $$("[data-preset]")) b.addEventListener("click", () => { Object.assign(ui.calc, PRESETS[b.dataset.preset]); renderCalc(); saveUI(); });

/* budget */
const BUDGET = [
  { what: "Kitchen tests and manufacturer samples", a: 400, b: 600 },
  { what: "Blind tastings, waitlist, creators (free product)", a: 300, b: 2000 },
  { what: "EU trademark, 2–3 classes", a: 900, b: 1050, bn: "Plus a trademark search" },
  { what: "Company, accountant, social security (from month 4)", a: 0, an: "Not yet", b: 2000 },
  { what: "Food technologist, label check, EFET", a: 400, b: 500 },
  { what: "Lab test", a: 0, an: "Not yet", b: 500 },
  { what: "First production run", a: 0, an: "Not yet", b: 7000, bn: "About 500 pouches" },
  { what: "Shopify, email app, shipping boxes", a: 150, b: 600 },
  { what: "Left over", a: 850, an: "Safety money", b: 400, bn: "Roughly what's left", spare: true }
];
function renderBudget() {
  const big = ui.budget === "15", total = big ? 15000 : 3000;
  setRadio("budget", ui.budget);
  const ul = $("#budget"); ul.textContent = "";
  for (const r of BUDGET) {
    const amt = big ? r.b : r.a, note = big ? r.bn : r.an;
    const li = document.createElement("li"); if (r.spare) li.className = "spare";
    const name = document.createElement("span"); name.textContent = r.what;
    if (note) { const w = document.createElement("span"); w.className = "when"; w.textContent = note; name.appendChild(w); }
    const a = document.createElement("span"); a.className = "amt"; a.textContent = "€" + amt.toLocaleString("en-US");
    const tr = document.createElement("span"); tr.className = "track";
    const i = document.createElement("i"); i.style.width = (amt / total * 100) + "%"; tr.appendChild(i);
    li.append(name, a, tr); ul.appendChild(li);
  }
}
for (const r of $$('input[name="budget"]')) r.addEventListener("change", () => { ui.budget = r.value; renderBudget(); saveUI(); });

/* valuation */
const salesFrom = s => roundNice(50000 * Math.pow(10000, s / 1000));
const sliderFromSales = x => Math.round(1000 * Math.log10(x / 50000) / 4);
function renderVal() {
  const v = ui.val, sales = salesFrom(v.s), hotOK = sales >= 15e6, hot = v.hot && hotOK;
  const sl = $("#vSales"), mg = $("#vMargin"), ow = $("#vOwn"), hs = $("#vHot");
  sl.value = v.s; mg.value = v.m; ow.value = v.own; [sl, mg, ow].forEach(fillRange);
  hs.checked = hot; hs.disabled = !hotOK;
  $("#vHotHint").textContent = hotOK ? "Bidding wars push big, fast-growing brands to 3–4 × yearly sales, or more." : "Bidding wars happen for big, fast-growing brands, so this only counts from €15M of sales a year.";
  const profit = sales * v.m / 100;
  let lo, hi, how;
  if (hot) { lo = sales * 3; hi = sales * 4; how = "A hot brand with several giants bidding sells for about 3–4 × yearly sales, or more."; }
  else if (sales < 5e6) { lo = profit * 2.5; hi = profit * 4.5; how = "A small brand run by you sells for 2.5–4.5 × yearly owner profit. Here that profit is " + shortEuro(profit) + " a year."; }
  else if (sales < 15e6) { lo = profit * 3.5; hi = profit * 5.5; how = "A medium brand with a team sells for 3.5–5.5 × yearly profit. Here that profit is " + shortEuro(profit) + " a year."; }
  else { lo = sales * 0.5; hi = sales * 1.9; how = "A big, growing brand bought by a food giant sells for 0.5–1.9 × yearly sales."; }
  $("#oSales").textContent = shortEuro(sales);
  $("#oMargin").textContent = v.m + "%";
  $("#oOwn").textContent = v.own + "%";
  if (lo <= 0) {
    $("#vVal").textContent = "€0";
    $("#vHow").textContent = "With no profit, a small brand is worth very little to a buyer.";
    $("#vShare").textContent = "";
  } else {
    $("#vVal").textContent = shortEuro(lo) + " to " + shortEuro(hi);
    $("#vHow").textContent = how;
    $("#vShare").textContent = "Your " + v.own + "%: " + shortEuro(lo * v.own / 100) + " to " + shortEuro(hi * v.own / 100) + ", before tax (see tax below).";
  }
  for (const b of $$("[data-sales]")) b.setAttribute("aria-pressed", String(Number(b.dataset.sales) === sales));
}
$("#vSales").addEventListener("input", e => { ui.val.s = Number(e.target.value); renderVal(); saveUI(); });
$("#vMargin").addEventListener("input", e => { ui.val.m = Number(e.target.value); renderVal(); saveUI(); });
$("#vOwn").addEventListener("input", e => { ui.val.own = Number(e.target.value); renderVal(); saveUI(); });
$("#vHot").addEventListener("change", e => { ui.val.hot = e.target.checked; renderVal(); saveUI(); });
for (const b of $$("[data-sales]")) b.addEventListener("click", () => { ui.val.s = sliderFromSales(Number(b.dataset.sales)); renderVal(); saveUI(); });

/* dilution */
const preFrom = s => roundNice(250000 * Math.pow(80, s / 1000));
function renderDil() {
  const d = ui.dil, pre = preFrom(d.pre), share = d.raise / (pre + d.raise), after = d.own * (1 - share);
  const r = $("#dRaise"), p = $("#dPre"), o = $("#dOwn");
  r.value = d.raise; p.value = d.pre; o.value = d.own; [r, p, o].forEach(fillRange);
  $("#oRaise").textContent = shortEuro(d.raise);
  $("#oPre").textContent = shortEuro(pre);
  $("#oDOwn").textContent = d.own + "%";
  const sp = pct1(share * 100);
  $("#dInv").textContent = sp + "%";
  const pill = $("#dPill");
  pill.className = "pill " + (share > 0.2 ? "stop" : "go");
  pill.textContent = share > 0.2 ? "More than 20% in one round" : "20% or less: fine";
  $("#dText").textContent = "Investors get " + sp + "% of Fowm for " + shortEuro(d.raise) + ", because " + shortEuro(d.raise) + " ÷ " + shortEuro(pre + d.raise) + " = " + sp + "%. You go from " + d.own + "% to " + pct1(after) + "%." + (share > 0.2 ? " Raise less, or wait until Fowm is worth more." : "");
}
$("#dRaise").addEventListener("input", e => { ui.dil.raise = Number(e.target.value); renderDil(); saveUI(); });
$("#dPre").addEventListener("input", e => { ui.dil.pre = Number(e.target.value); renderDil(); saveUI(); });
$("#dOwn").addEventListener("input", e => { ui.dil.own = Number(e.target.value); renderDil(); saveUI(); });

/* glossary search */
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const gItems = $$("#gloss > div").map(d => ({ d, t: norm(d.textContent) }));
$("#gq").addEventListener("input", e => {
  const q = norm(e.target.value.trim());
  let n = 0;
  for (const it of gItems) { const on = !q || it.t.includes(q); it.d.hidden = !on; if (on) n++; }
  $("#glossEmpty").hidden = n > 0;
});

/* weekly routine bars */
for (const i of $$(".bars i[data-w]")) i.style.width = i.dataset.w + "%";

/* ---------- views, picked by #hash ---------- */
const VIEWS = ["plan", "product", "money", "grow", "exit", "legal", "words"];
function route(scroll) {
  const h = (location.hash || "").slice(1);
  const v = VIEWS.includes(h) ? h : "plan";
  for (const s of $$(".view")) s.classList.toggle("on", s.dataset.view === v);
  for (const a of $$(".tabs a")) { if (a.getAttribute("href") === "#" + v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
  const tabs = $(".tabs"), act = $('.tabs a[aria-current="page"]');
  if (act) {
    const left = (act.offsetLeft - tabs.offsetLeft) - (tabs.clientWidth - act.offsetWidth) / 2;
    try { tabs.scrollTo({ left, behavior: reduced ? "auto" : "smooth" }); } catch (e) { tabs.scrollLeft = left; }
  }
  if (scroll) window.scrollTo(0, 0);
}
addEventListener("hashchange", () => route(true));

/* ---------- first paint ---------- */
function renderAll(animate) {
  renderChecks();
  const cur = renderProgress(animate, false);
  renderNext(cur);
  renderKPI(true);
  renderTests(true);
  renderRaise();
}
buildKPI();
buildTests();
const cached = lsGet(LS_STATE);
if (cached) state = clean(cached);
route(false);
renderAll(true);
renderCalc();
renderBudget();
renderVal();
renderDil();
setStatus();

/* links to other sites open in Safari, so the app stays put */
for (const a of $$('a[href^="http"]')) { a.target = "_blank"; a.rel = "noopener"; }

/* works offline after the first visit */
if ("serviceWorker" in navigator) addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
})();
