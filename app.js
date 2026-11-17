(() => {
"use strict";

/* ================================================================
   Fowm Plan 2
   Today, Plan, Numbers, Contacts, Guide. Everything saves on this phone.
   ================================================================ */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
let reduced = false;
try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v; // our own static markup only
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "data") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
function svgEl(markup) { const t = document.createElement("template"); t.innerHTML = markup.trim(); return t.content.firstElementChild; }
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs) { const el = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]); return el; }

const MINUS = "−";
const euro = (n, dp = 2) => (n < 0 ? MINUS : "") + "€" + Math.abs(n).toFixed(dp);
function trimNum(x) {
  if (x >= 100) return String(Math.round(x));
  if (x >= 10) return String(Math.round(x * 10) / 10);
  return String(Math.round(x * 100) / 100);
}
function shortEuro(n) {
  const a = Math.abs(n), sg = n < 0 ? MINUS : "";
  if (a >= 1e9) return sg + "€" + trimNum(a / 1e9) + "B";
  if (a >= 1e6) return sg + "€" + trimNum(a / 1e6) + "M";
  if (a >= 1e3) return sg + "€" + trimNum(a / 1e3) + "k";
  return sg + "€" + Math.round(a);
}
const fmtNum = (n) => { const r = Math.round(n * 10) / 10; return (r < 0 ? MINUS : "") + String(Math.abs(r)); };
const clamp = (x, lo, hi, d) => (typeof x === "number" && isFinite(x)) ? Math.min(hi, Math.max(lo, x)) : d;
function roundNice(x) { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; }
const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
const uid = () => "c-" + (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 10);

const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const parseISO = (t) => { const p = t.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dShort = (d) => d.getDate() + " " + MON[d.getMonth()];
const today = () => new Date();
const thisWeek = () => isoOf(mondayOf(today()));

const ICON = {
  chev: '<svg class="chev" viewBox="0 0 9 15" aria-hidden="true"><path d="M1.5 1.5l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="8" r="2.6" fill="var(--latte-2)" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="16" r="2.6" fill="var(--latte-2)" stroke="currentColor" stroke-width="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  x: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
const CH_ICON = {
  start: '<path d="M8 23.5V5.5m0 0h11.5l-2.6 4 2.6 4H8"/>',
  market: '<circle cx="14" cy="14" r="9"/><path d="M5 14h18M14 5c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S11.4 7.6 14 5z"/>',
  foam: '<path d="M11.5 4.5h5M12.5 4.5v6.2l-5.4 9.4a2 2 0 0 0 1.7 3h10.4a2 2 0 0 0 1.7-3l-5.4-9.4V4.5M9.6 17.2h8.8"/>',
  money: '<path d="M19.5 8.8a7 7 0 1 0 0 10.4M6.5 12.6h8.8M6.5 15.6h7.6"/>',
  selling: '<path d="M7 10h14l-1.1 12.5H8.1zM10.5 10V8.6a3.5 3.5 0 0 1 7 0V10"/>',
  brands: '<path d="M14 4.8l2.7 5.6 6.1.8-4.4 4.3 1.1 6.1L14 18.7l-5.5 2.9 1.1-6.1-4.4-4.3 6.1-.8z"/>',
  raising: '<ellipse cx="14" cy="8.5" rx="7.5" ry="3"/><path d="M6.5 8.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5M6.5 13.5v5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-5"/>',
  exit: '<circle cx="10" cy="14" r="4.5"/><path d="M14.5 14h9M20 14v3.5M23.5 14v2.5"/>',
  legal: '<path d="M14 4.6l8 3v6.2c0 4.9-3.3 8.6-8 9.9-4.7-1.3-8-5-8-9.9V7.6z"/><path d="M10.6 14.2l2.3 2.3 4.6-4.7"/>',
  mistakes: '<path d="M14 5.2l9.2 16.3H4.8z"/><path d="M14 11v4.6M14 18.6v.1"/>',
  words: '<path d="M7 7.5h14M7 12.5h14M7 17.5h9"/>',
  sources: '<path d="M12.3 15.7a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1.4 1.4M15.7 12.3a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1.4-1.4"/>'
};
const chIcon = (k) => svgEl(`<svg viewBox="0 0 28 28" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${CH_ICON[k]}</g></svg>`);

/* ---------- the plan ---------- */
const STAGES = [
  { n: 0, title: "Decide and protect", when: "17 Nov – 15 Dec 2026",
    gate: "You've picked the best kitchen recipe, emailed 8 manufacturers and decided how to protect the name.",
    steps: [
      ["s0-1", 'Write one line and pin it above your desk: "Fowm = protein foam for your freddo. Athens first. €29.90 for 20 servings."'],
      ["s0-2", 'Book a trademark attorney\'s opinion on "Fowm" (see Legal in the Guide). Decide: file the word, file the logo, or adjust the name.'],
      ["s0-3", "Get quotes from 2 food technologists. Confirm Fowm is sold as a food, not a supplement."],
      ["s0-4", "Order unflavoured whey isolate and run kitchen tests A–D (log them in Numbers, under Tests). Film every test for content."],
      ["s0-5", "Write the one-page manufacturer brief and email 8 manufacturers (track them in Contacts)."],
      ["s0-6", 'Change the planned website price to €29.90 and the subscription to a 2-pouch pack at 10% off. Keep "launching soon".']
    ] },
  { n: 1, title: "Samples and blind tests", when: "Mid-Dec 2026 – mid-Feb 2027",
    gate: "One sample scores 7/10 or more, 6 in 10 tasters would buy at €29.90, and 300+ people are on the waitlist.",
    steps: [
      ["s1-1", "Get samples from at least 3 manufacturers and run the foam test on each."],
      ["s1-2", "Run a blind test with 30–50 people in real freddos: at the gym, at school, at a friendly café. Log every taster in Numbers, under Tests."],
      ["s1-3", "Collect an email from every taster. Post the journey 3 times a week on @getfowm."],
      ["s1-4", "Choose the manufacturer. Get the price per kg at 250, 500 and 1,000 kg, the minimum order and the lead time, plus formula ownership in writing."],
      ["s1-5", 'Line up 10 creators (your girlfriend first) and 3 cafés that say "yes, we\'ll try it".'],
      ["s1-6", "Get courier quotes from BOX NOW and ACS, and put the real shipping cost into the per-order calculator."]
    ] },
  { n: 2, title: "Company and first batch", when: "Mid-Feb – mid-Apr 2027",
    gate: "The stock is in your hands, the lab result matches the label, and 100 pre-orders are paid.",
    steps: [
      ["s2-1", "Set up the IKE, the accountant, a business bank account and myDATA."],
      ["s2-2", "File the trademark if it isn't filed yet. If you filed before the company existed, ask the attorney how to move it into the company."],
      ["s2-3", "Register with EFET, and with the EOAN packaging register and a recycling scheme."],
      ["s2-4", "Get the Greek back label approved by the technologist, then print 500 pouches."],
      ["s2-5", "Order the first batch of 250–500 pouches. Get the lab test and the shelf-life data."],
      ["s2-6", "Set up Shopify Payments, the BOX NOW plugin, the legal pages, and product pages with all mandatory food information."],
      ["s2-7", "Open pre-orders to the waitlist at a founder price no lower than €27.90, so you still keep about €4 a pouch."]
    ] },
  { n: 3, title: "Launch in Athens", when: "Mid-Apr – Jul 2027, freddo season",
    gate: "You have 500 customers, 30%+ reorder within 90 days, you keep €5+ per order, and 3 cafés sell 20+ a week.",
    steps: [
      ["s3-1", "Ship every pre-order within 48 hours, and message every customer personally."],
      ["s3-2", "Ask every customer for a review and a 10-second video."],
      ["s3-3", "Start the creator programme: 30 creators on 10% commission."],
      ["s3-4", 'Start the café pilots: 5 cafés with a "Protein Freddo" menu card.'],
      ["s3-5", "Turn on subscriptions."],
      ["s3-6", "Every Monday, do the check-in in Numbers."]
    ] },
  { n: 4, title: "Prove repeat, prepare the move", when: "Aug – Dec 2027",
    gate: "40%+ reorder within 90 days, sales have grown 3 months in a row, and you keep €7+ per order.",
    steps: [
      ["s4-1", "Before you leave for university, hand daily packing to a fulfilment warehouse or a paid helper. Keep customers, creators and cafés yourself."],
      ["s4-2", "List on Skroutz, sign 20 more cafés and pitch one café chain."],
      ["s4-3", "Launch the second flavour."],
      ["s4-4", "Order a bigger second batch of 1,000–2,000 pouches to cut the cost per pouch."],
      ["s4-5", "Meet a Greece–Canada tax adviser before you become a Canadian resident."],
      ["s4-6", "Apply to the Elevate Greece registry."]
    ] },
  { n: 5, title: "Raise and expand", when: "2028",
    gate: "Shops reorder without you chasing them, and your first investors are in.",
    steps: [
      ["s5-1", "Raise a small angel round if your numbers are green (see Raising money in the Guide)."],
      ["s5-2", "If you're in Montreal, apply to the Dobson Cup and Futurpreneur."],
      ["s5-3", "Launch in Canada with English and French labels."],
      ["s5-4", "Get into gyms, pharmacies and health shops in Greece."],
      ["s5-5", "Hire your first person, for operations."]
    ] },
  { n: 6, title: "Scale and sell", when: "2029 onward", gate: null,
    steps: [
      ["s6-1", "Enter supermarkets once your cost per pouch is low enough (see Selling it in the Guide)."],
      ["s6-2", "Enter the US."],
      ["s6-3", "Build a team that runs Fowm without you."],
      ["s6-4", "Spend 12–24 months preparing the sale (see Selling the company in the Guide), then run an auction for buyers."]
    ] }
];
const BUILTIN = new Map();
STAGES.forEach(st => st.steps.forEach(([id, text]) => BUILTIN.set(id, { id, text, stage: st.n, own: false })));

const ROUTINE = [
  ["Do the check-in and pick this week's one fix", "Monday", 1],
  ["Film and post content", "Twice a week", 5],
  ["Answer customers, creators and messages", "Daily", 5],
  ["Visit cafés and gyms", "Once a week", 4],
  ["Manufacturer, stock and recipe work", "Once a week", 3],
  ["Money, accountant and admin", "Friday", 2]
];

const KPIS = [
  { id: "taste", name: "Blind taste test",
    fields: [{ k: "taste", label: "Average taste", unit: "/10", min: 0, max: 10 }, { k: "buy", label: "Would buy at €29.90", unit: "%", min: 0, max: 100 }],
    lines: "Green: 7+, and 6 in 10 would buy. Yellow: 6 to 7. Red: under 6.",
    grade: v => v.taste === undefined ? null : v.taste < 6 ? "stop" : (v.taste >= 7 && v.buy !== undefined && v.buy >= 60) ? "go" : "fix",
    fix: "Don't sell. Go back to the kitchen tests and the manufacturer. Nothing downstream can fix a product people don't love." },
  { id: "conv", name: "Website visitors who buy",
    fields: [{ k: "conv", label: "Visitors who buy", unit: "%", min: 0, max: 100 }],
    lines: "Green: 2.5%+. Yellow: 1.5–2.5%. Red: under 1.5%.",
    grade: v => v.conv === undefined ? null : v.conv >= 2.5 ? "go" : v.conv >= 1.5 ? "fix" : "stop",
    fix: "Watch 10 people use your site on their phone. Fix the first thing that confuses them. Usually that's the price, the photos or the delivery cost." },
  { id: "reorder", name: "Customers who reorder within 90 days",
    fields: [{ k: "reorder", label: "Reorder rate", unit: "%", min: 0, max: 100 }],
    lines: "Green: 40%+. Yellow: 30–40%. Red: under 30%.",
    grade: v => v.reorder === undefined ? null : v.reorder >= 40 ? "go" : v.reorder >= 30 ? "fix" : "stop",
    fix: 'Call 10 customers who didn\'t reorder and ask why. Taste, price and "I forgot" each have a different fix: recipe, bundle price, or reminder emails.' },
  { id: "churn", name: "Subscribers who cancel each month",
    fields: [{ k: "churn", label: "Cancel rate", unit: "%", min: 0, max: 100 }],
    lines: "Green: under 5%. Yellow: 5–8%. Red: over 8%.",
    grade: v => v.churn === undefined ? null : v.churn < 5 ? "go" : v.churn <= 8 ? "fix" : "stop",
    fix: 'Add "skip a delivery" and "pause" before "cancel". Ask every person who cancels for the reason.' },
  { id: "kept", name: "Kept per order, before ads",
    fields: [{ k: "kept", label: "Kept per order", unit: "€", pre: true, min: -100, max: 1000 }],
    lines: "Green: €7+. Yellow: €4–7. Red: under €4.",
    grade: v => v.kept === undefined ? null : v.kept >= 7 ? "go" : v.kept >= 4 ? "fix" : "stop",
    fix: "Raise the price, push bundles, or renegotiate whey and shipping. Don't buy ads until it's green." },
  { id: "cac", name: "Cost to win one customer",
    fields: [{ k: "cac", label: "Cost per new customer", unit: "€", pre: true, min: 0, max: 1000 }],
    lines: "Green: under the first order's kept money. Yellow: up to 3 orders' kept money. Red: more than 3 orders' kept money.",
    grade: v => v.cac === undefined ? null : v.kept === undefined ? "need" : v.kept <= 0 ? (v.cac > 0 ? "stop" : "go") : v.cac < v.kept ? "go" : v.cac <= 3 * v.kept ? "fix" : "stop",
    fix: "Stop paid ads. Go back to creators on commission and cafés, where you only pay when someone buys." },
  { id: "cafe", name: "Protein freddos per café per week",
    fields: [{ k: "cafe", label: "Per café, per week", unit: "", min: 0, max: 10000 }],
    lines: "Green: 20+. Yellow: 10–20. Red: under 10.",
    grade: v => v.cafe === undefined ? null : v.cafe >= 20 ? "go" : v.cafe >= 10 ? "fix" : "stop",
    fix: "Change the menu card and train the staff. If it's still red after 2 more weeks, move on to a different café." },
  { id: "cash", name: "Months of cash left",
    fields: [{ k: "cash", label: "Months left", unit: "months", min: 0, max: 240 }],
    lines: "Cash in the bank divided by what you lose each month. Green: 6+. Yellow: 3–6. Red: under 3.",
    grade: v => v.cash === undefined ? null : v.cash >= 6 ? "go" : v.cash >= 3 ? "fix" : "stop",
    fix: "Cut everything except product and customers. Start talking to investors before it gets there, not after." }
];
const KPI_KEYS = ["taste", "buy", "conv", "reorder", "churn", "kept", "cac", "cafe", "cash"];
const PILL = { go: ["go", "Green: keep going"], fix: ["fix", "Yellow: fix it"], stop: ["stop", "Red: stop and change"], need: ["none", "Add kept per order"], none: ["none", "Not measured"] };
const CHART_META = {
  taste: { name: "Average taste", unit: "/10", band: [7, 10] }, buy: { name: "Would buy at €29.90", unit: "%", band: [60, 100] },
  conv: { name: "Visitors who buy", unit: "%", band: [2.5, null] }, reorder: { name: "Reorder within 90 days", unit: "%", band: [40, 100] },
  churn: { name: "Subscribers who cancel", unit: "%", band: [0, 5] }, kept: { name: "Kept per order", unit: "€", band: [7, null] },
  cac: { name: "Cost to win a customer", unit: "€", band: null }, cafe: { name: "Freddos per café a week", unit: "", band: [20, null] },
  cash: { name: "Months of cash left", unit: " mo", band: [6, null] }
};

const KTESTS = [
  { v: "A", what: "Whey isolate + flavour", why: "Should foam best" },
  { v: "B", what: "Version A + a tiny pinch of xanthan gum", why: "Thicker foam that lasts longer" },
  { v: "C", what: "Your current 50/50 whey and pea + coconut", why: "The control to beat" },
  { v: "D", what: "The winner, lightly sweetened", why: "Plain may taste flat on a freddo" }
];
const KYN = [["s5", "Still foamy after 5 minutes?"], ["s10", "Still foamy after 10 minutes?"], ["clumps", "Any clumps?"], ["curdle", "Curdles in a hot latte?"]];

const CTYPES = {
  maker: { label: "Manufacturers", one: "manufacturer", statuses: ["To contact", "Emailed", "Samples coming", "Samples in", "Quoted", "Chosen", "Not a fit"],
    empty: "Add the 8 manufacturers you email in Stage 0, then track samples and quotes here.",
    fields: [
      { k: "where", label: "Country or city", type: "text" },
      { k: "email", label: "Email", type: "email" },
      { k: "phone", label: "Phone", type: "tel" },
      { k: "p250", label: "Price per kg at 250 kg", type: "num", pre: "€" },
      { k: "p500", label: "Price per kg at 500 kg", type: "num", pre: "€" },
      { k: "p1000", label: "Price per kg at 1,000 kg", type: "num", pre: "€" },
      { k: "moq", label: "Minimum order", type: "num", unit: "kg" },
      { k: "lead", label: "Lead time", type: "num", unit: "weeks" },
      { k: "foam", label: "Your foam test score for their sample", type: "num", unit: "/10" },
      { k: "owns", label: "You own the formula, in writing", type: "yn" }
    ] },
  cafe: { label: "Cafés", one: "café", statuses: ["To visit", "Pitched", "Trial", "Selling", "Stopped"],
    empty: "Add the cafés you want on board. Log each one's protein freddos a week to see which ones work.",
    fields: [
      { k: "area", label: "Area", type: "text" },
      { k: "person", label: "Contact person", type: "text" },
      { k: "phone", label: "Phone", type: "tel" },
      { k: "week", label: "Protein freddos a week", type: "num" },
      { k: "start", label: "Started on", type: "date" }
    ] },
  creator: { label: "Creators", one: "creator", statuses: ["To ask", "Asked", "Said yes", "Posting", "Stopped"],
    empty: "Add the creators you want to work with, starting with your girlfriend. Track codes and orders here.",
    fields: [
      { k: "handle", label: "Handle", type: "text", ph: "@name" },
      { k: "platform", label: "Platform", type: "choice", options: ["Instagram", "TikTok", "Both"] },
      { k: "code", label: "Discount code", type: "text" },
      { k: "comm", label: "Commission", type: "num", unit: "%" },
      { k: "orders", label: "Orders from their code", type: "num" }
    ] }
};

const CHAPTERS = [
  ["start", "Start here", "The plan in eight lines, and the honest odds"],
  ["market", "The market", "Why protein foam, why Greece, and who else is out there"],
  ["foam", "Making the foam", "How foam works, manufacturers, packaging, first checks"],
  ["money", "The money math", "Price, VAT, what you keep and the numbers to watch"],
  ["selling", "Selling it", "Champions, creators, cafés, Skroutz, then shops"],
  ["brands", "Winning brands", "What Grüns, Poppi, Grenade and others did"],
  ["raising", "Raising money", "When you're ready, and the cheapest money first"],
  ["exit", "Selling the company", "How brands become worth millions, tax, and the sale"],
  ["legal", "Legal", "Trademark, company, EFET, labels and claims"],
  ["mistakes", "Mistakes that kill brands", "Read this before every big decision"],
  ["words", "Word list", "Every business word, explained simply"],
  ["sources", "Sources", "The pages behind every number"]
];

/* ---------- storage ---------- */
const KEY = "fowm-plan/v2", UIKEY = "fowm-plan/ui";
let lsOK = false;
try { localStorage.setItem("fowm-plan/t", "1"); localStorage.removeItem("fowm-plan/t"); lsOK = true; } catch (e) {}
const readLS = (k) => { if (!lsOK) return null; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };

const blank = () => ({ v: 2, tasks: {}, gates: {}, custom: {}, notes: {}, raise: {}, checkins: {}, tests: {}, tasters: [], contacts: [], seen: {} });
const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
const str = (x, max) => typeof x === "string" ? x.slice(0, max) : "";
const finite = (x) => typeof x === "number" && isFinite(x);
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_STEP = /^(s[0-6]-\d{1,2}|c-[a-z0-9]{4,16})$/;

function cleanState(d) {
  const o = blank();
  if (!isObj(d)) return o;
  const flags = (m, re) => { const r = {}; if (isObj(m)) for (const k of Object.keys(m)) if (m[k] === true && re.test(k)) r[k] = true; return r; };
  o.tasks = flags(d.tasks, RE_STEP);
  o.gates = flags(d.gates, /^[0-5]$/);
  o.raise = flags(d.raise, /^r[1-6]$/);
  if (isObj(d.custom)) for (const k of Object.keys(d.custom)) {
    if (!/^[0-6]$/.test(k) || !Array.isArray(d.custom[k])) continue;
    const list = d.custom[k].filter(x => isObj(x) && /^c-[a-z0-9]{4,16}$/.test(x.id) && str(x.text, 400).trim()).slice(0, 60).map(x => ({ id: x.id, text: str(x.text, 400) }));
    if (list.length) o.custom[k] = list;
  }
  if (isObj(d.notes)) for (const k of Object.keys(d.notes)) { const t = str(d.notes[k], 3000); if (RE_STEP.test(k) && t.trim()) o.notes[k] = t; }
  if (isObj(d.checkins)) for (const k of Object.keys(d.checkins)) {
    const e = d.checkins[k]; if (!RE_DATE.test(k) || !isObj(e)) continue;
    const v = {}; if (isObj(e.v)) for (const kk of KPI_KEYS) if (finite(e.v[kk])) v[kk] = e.v[kk];
    o.checkins[k] = { d: RE_DATE.test(e.d) ? e.d : k, v, note: str(e.note, 2000), done: e.done === true };
  }
  if (isObj(d.tests)) for (const v of ["A", "B", "C", "D"]) {
    const t = d.tests[v]; if (!isObj(t)) continue;
    const r = {};
    for (const f of ["h", "taste"]) if (finite(t[f])) r[f] = t[f];
    for (const f of ["s5", "s10", "clumps", "curdle"]) if (typeof t[f] === "boolean") r[f] = t[f];
    if (Object.keys(r).length) o.tests[v] = r;
  }
  if (Array.isArray(d.tasters)) o.tasters = d.tasters.filter(t => isObj(t) && Number.isInteger(t.score) && t.score >= 1 && t.score <= 10 && typeof t.buy === "boolean")
    .slice(0, 1000).map(t => ({ id: /^c-[a-z0-9]{4,16}$/.test(t.id) ? t.id : uid(), s: Number.isInteger(t.s) && t.s >= 1 && t.s <= 5 ? t.s : 1, score: t.score, buy: t.buy, d: RE_DATE.test(t.d) ? t.d : isoOf(today()), who: str(t.who, 24) }));
  if (Array.isArray(d.contacts)) o.contacts = d.contacts.filter(c => isObj(c) && CTYPES[c.type] && str(c.name, 80).trim()).slice(0, 500).map(c => {
    const T = CTYPES[c.type], f = {};
    if (isObj(c.f)) for (const fd of T.fields) {
      const x = c.f[fd.k];
      if (fd.type === "num") { if (finite(x)) f[fd.k] = x; }
      else if (fd.type === "yn") { if (typeof x === "boolean") f[fd.k] = x; }
      else if (fd.type === "date") { if (typeof x === "string" && RE_DATE.test(x)) f[fd.k] = x; }
      else if (fd.type === "choice") { if (fd.options.includes(x)) f[fd.k] = x; }
      else { const t = str(x, 160); if (t.trim()) f[fd.k] = t; }
    }
    return { id: /^c-[a-z0-9]{4,16}$/.test(c.id) ? c.id : uid(), type: c.type, name: str(c.name, 80), status: T.statuses.includes(c.status) ? c.status : T.statuses[0], f, note: str(c.note, 3000), t: typeof c.t === "string" ? c.t.slice(0, 30) : "" };
  });
  if (isObj(d.seen)) for (const k of Object.keys(d.seen)) if (/^[0-6]$/.test(k) && RE_DATE.test(d.seen[k])) o.seen[k] = d.seen[k];
  return o;
}

function loadState() {
  const cur = readLS(KEY);
  if (isObj(cur) && cur.v === 2) return cleanState(cur);
  const st = blank();
  const old = readLS("fowm-blueprint/state"); // version 1 of this app
  if (isObj(old)) {
    const c = cleanState({ tasks: old.tasks, gates: old.gates, raise: old.raise, tests: old.tests });
    Object.assign(st, { tasks: c.tasks, gates: c.gates, raise: c.raise, tests: c.tests });
    if (isObj(old.kpi) && Object.keys(old.kpi).length) {
      const day = typeof old.kpiAt === "string" && RE_DATE.test(old.kpiAt) ? old.kpiAt : isoOf(today());
      const wk = isoOf(mondayOf(parseISO(day)));
      st.checkins[wk] = cleanState({ checkins: { [wk]: { d: day, v: old.kpi, note: "", done: false } } }).checkins[wk];
    }
  }
  return st;
}
let S = loadState();

const UI_DEFAULT = { numTab: "checkin", calcTab: "order", conTab: "maker", tSample: 1, open: {},
  calc: { price: 29.9, units: 2, disc: 0, vat: 24, whey: 27, ship: 3.5 }, budget: "3",
  val: { s: 325, m: 15, own: 100, hot: false }, dil: { raise: 150000, pre: 316, own: 100 } };
function loadUI() {
  const u = readLS(UIKEY) || {}, old = readLS("fowm-blueprint/ui") || {};
  const src = isObj(u.calc) ? u : Object.assign({}, u, { calc: old.calc, budget: old.budget, val: old.val, dil: old.dil });
  const c = isObj(src.calc) ? src.calc : {}, v = isObj(src.val) ? src.val : {}, dl = isObj(src.dil) ? src.dil : {};
  return {
    numTab: ["checkin", "tests", "calc"].includes(src.numTab) ? src.numTab : "checkin",
    calcTab: ["order", "budget", "value", "round"].includes(src.calcTab) ? src.calcTab : "order",
    conTab: CTYPES[src.conTab] ? src.conTab : "maker",
    tSample: Number.isInteger(src.tSample) && src.tSample >= 1 && src.tSample <= 5 ? src.tSample : 1,
    open: isObj(src.open) ? Object.fromEntries(Object.entries(src.open).filter(([k, x]) => /^[0-6]$/.test(k) && typeof x === "boolean")) : {},
    calc: { price: clamp(c.price, 19.9, 39.9, 29.9), units: [1, 2, 3].includes(c.units) ? c.units : 2, disc: [0, 10, 15, 20, 25].includes(c.disc) ? c.disc : 0,
      vat: [24, 13].includes(c.vat) ? c.vat : 24, whey: clamp(c.whey, 15, 40, 27), ship: clamp(c.ship, 0, 6, 3.5) },
    budget: src.budget === "15" ? "15" : "3",
    val: { s: clamp(v.s, 0, 1000, 325), m: clamp(v.m, 0, 40, 15), own: clamp(v.own, 5, 100, 100), hot: v.hot === true },
    dil: { raise: clamp(dl.raise, 25000, 2000000, 150000), pre: clamp(dl.pre, 0, 1000, 316), own: clamp(dl.own, 10, 100, 100) }
  };
}
const UI = loadUI();

let saveTimer = 0, uiTimer = 0;
function writeState() { saveTimer = 0; if (!lsOK) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save. Your phone's storage may be full."); } }
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(writeState, 120); }
function saveUI() { clearTimeout(uiTimer); uiTimer = setTimeout(() => { if (lsOK) try { localStorage.setItem(UIKEY, JSON.stringify(UI)); } catch (e) {} }, 200); }
function flush() { if (saveTimer) { clearTimeout(saveTimer); writeState(); } }
addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); else if (view === "today") renderToday(); });

/* ---------- progress ---------- */
function stepsOf(n) {
  const st = STAGES[n];
  const list = st.steps.map(([id, text]) => ({ id, text, stage: n, own: false }));
  for (const c of (S.custom[n] || [])) list.push({ id: c.id, text: c.text, stage: n, own: true });
  return list;
}
function findStep(id) {
  if (BUILTIN.has(id)) return BUILTIN.get(id);
  for (const k of Object.keys(S.custom)) { const c = S.custom[k].find(x => x.id === id); if (c) return { id, text: c.text, stage: Number(k), own: true }; }
  return null;
}
function progress() {
  let done = 0, total = 0;
  const per = STAGES.map(st => {
    const steps = stepsOf(st.n);
    const d = steps.filter(x => S.tasks[x.id]).length;
    const hasGate = !!st.gate, g = hasGate && S.gates[st.n] ? 1 : 0;
    done += d + g; total += steps.length + (hasGate ? 1 : 0);
    return { n: st.n, steps, d, w: steps.length + (hasGate ? 1 : 0), complete: hasGate ? g === 1 : (steps.length > 0 && d === steps.length) };
  });
  let current = per.findIndex(p => !p.complete);
  if (current < 0) current = STAGES.length;
  return { done, total, per, current };
}
let lastComplete = null;
function checkBadges(fromUser) {
  const p = progress();
  const now = p.per.map(x => x.complete);
  if (fromUser && lastComplete) {
    const newly = now.findIndex((c, i) => c && !lastComplete[i]);
    if (newly >= 0 && !S.seen[newly]) { S.seen[newly] = isoOf(today()); save(); setTimeout(() => celebrate(newly), reduced ? 0 : 450); }
  }
  lastComplete = now;
}

/* ---------- motion ----------
   One feel everywhere: presses answer on touch and spring back, screens and sheets move on springs,
   content that changes slides or fades instead of jumping. Only transform, opacity and colour animate
   on big things; heights animate only on small rows. Reduce Motion turns all of it off. */
const cssVar = (n, d) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; } catch (e) { return d; } };
const EASE = {
  spring: cssVar("--spring", "cubic-bezier(.2,.9,.3,1.15)"),       // 700ms
  soft: cssVar("--spring-soft", "cubic-bezier(.22,1,.36,1)"),       // 550ms
  pop: cssVar("--spring-pop", "cubic-bezier(.3,1.5,.5,1)"),         // 1000ms
  sheet: cssVar("--ease-sheet", "cubic-bezier(.32,.72,0,1)"),       // 600ms
  out: "cubic-bezier(.22,1,.36,1)",
  inOut: "cubic-bezier(.4,0,.2,1)"
};
function anim(el, frames, o) {
  if (reduced || !el || typeof el.animate !== "function") return null;
  try { return el.animate(frames, o); }
  catch (e) { try { return el.animate(frames, Object.assign({}, o, { easing: EASE.out })); } catch (e2) { return null; } }
}
const settled = (a) => a ? a.finished.then(() => true, () => false) : Promise.resolve(true);
// The launch cover (see index.html) stays until the first screen is drawn; the Today moment waits for it.
let launching = !!document.getElementById("launch");
const afterLaunch = [];

// Press feedback. Like UIKit: a touch lights up after a beat, so scrolling past a row doesn't flash it;
// a quick tap still shows a short press; moving or scrolling cancels it. Styles live on .is-pressed.
(() => {
  const SEL = "button, a[href], label.tick, label.tick-row, label.switch, summary";
  let el = null, x0 = 0, y0 = 0, timer = 0, at = 0;
  const press = () => { timer = 0; if (el) { el.classList.add("is-pressed"); at = performance.now(); } };
  const release = (tap) => {
    const e = el; el = null;
    if (!e) return;
    if (timer) {
      clearTimeout(timer); timer = 0;
      if (tap) { e.classList.add("is-pressed"); setTimeout(() => e.classList.remove("is-pressed"), 110); }
      return;
    }
    const left = 90 - (performance.now() - at);
    if (left > 0) setTimeout(() => e.classList.remove("is-pressed"), left); else e.classList.remove("is-pressed");
  };
  addEventListener("pointerdown", (ev) => {
    if (!ev.isPrimary || ev.button > 0) return;
    const t = ev.target instanceof Element ? ev.target.closest(SEL) : null;
    if (!t || t.matches(":disabled")) return;
    release(false);
    el = t; x0 = ev.clientX; y0 = ev.clientY;
    if (ev.pointerType === "mouse") press(); else timer = setTimeout(press, 55);
  }, { capture: true, passive: true });
  addEventListener("pointermove", (ev) => { if (el && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 12) release(false); }, { capture: true, passive: true });
  addEventListener("pointerup", () => release(true), { capture: true });
  addEventListener("pointercancel", () => release(false), { capture: true });
  addEventListener("scroll", () => release(false), { capture: true, passive: true });
})();

// A tick that gets checked pops and sends out a ring (only when you tick it, never on a redraw).
document.addEventListener("change", (e) => {
  const t = e.target, ck = t && t.type === "checkbox" ? t.nextElementSibling : null;
  if (reduced || !ck || !ck.classList.contains("ck") || !t.checked) return;
  ck.classList.remove("pop"); void ck.offsetWidth; ck.classList.add("pop");
  setTimeout(() => ck.classList.remove("pop"), 1000);
}, true);

// <details> open and close with their height instead of snapping (the Guide's folds, "What one pouch costs you").
document.addEventListener("click", (e) => {
  const sum = e.target instanceof Element ? e.target.closest("details > summary") : null;
  if (!sum || reduced) return;
  const d = sum.parentElement;
  e.preventDefault();
  const h0 = d.getBoundingClientRect().height, opening = !d.open || d.classList.contains("shut");
  if (d._da) { d._da.cancel(); d._da = null; }
  d.style.overflow = "hidden";
  let h1;
  if (opening) { d.classList.remove("shut"); d.open = true; h1 = d.getBoundingClientRect().height; }
  else { const cs = getComputedStyle(d); h1 = sum.getBoundingClientRect().height + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth); d.classList.add("shut"); }
  const a = d._da = anim(d, [{ height: h0 + "px" }, { height: h1 + "px" }], { duration: opening ? 460 : 320, easing: opening ? EASE.out : EASE.inOut });
  settled(a).then((ok) => { if (!ok || d._da !== a) return; d._da = null; d.style.overflow = ""; if (!opening) { d.open = false; d.classList.remove("shut"); } });
});

// While typing on a phone, the tab bar steps aside for the keyboard.
(() => {
  let mq = null; try { mq = matchMedia("(pointer: coarse)"); } catch (e) {}
  if (!mq || !mq.matches) return;
  const typing = (el) => el instanceof Element && el.matches("input:not([type=checkbox]):not([type=range]):not([type=radio]), textarea, select");
  let t = 0;
  document.addEventListener("focusin", (e) => { if (typing(e.target)) { clearTimeout(t); document.documentElement.classList.add("typing"); } });
  document.addEventListener("focusout", () => { clearTimeout(t); t = setTimeout(() => { if (!typing(document.activeElement)) document.documentElement.classList.remove("typing"); }, 160); });
})();

// Open or close a small block by animating its height (rows, step lists, test cards).
function heightAnim(el, open, dur) {
  if (reduced || !el || !el.isConnected || typeof el.animate !== "function") return Promise.resolve(true);
  const box = (cs, h) => ({ height: h + "px", paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: cs.opacity, minHeight: "0px" });
  let live = null;
  if (el._ha) { live = box(getComputedStyle(el), el.getBoundingClientRect().height); el._ha.cancel(); el._ha = null; }
  const full = box(getComputedStyle(el), el.getBoundingClientRect().height); full.opacity = 1;
  const zero = { height: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px", opacity: 0, minHeight: "0px" };
  el.style.overflow = "hidden";
  const a = el._ha = anim(el, [live || (open ? zero : full), open ? full : zero],
    { duration: dur || (open ? 480 : 300), easing: open ? EASE.out : EASE.inOut, fill: open ? "none" : "forwards" });
  return settled(a).then((ok) => { if (el._ha === a) { el._ha = null; if (open) el.style.overflow = ""; } return ok; });
}

// Fold a row away; if it was the first row, its neighbour's top line fades instead of vanishing at the end.
function foldAway(el, dur) {
  if (!el) return Promise.resolve(true);
  const next = el.nextElementSibling;
  if (next && !el.previousElementSibling) { next.style.transition = "border-color .3s ease"; next.style.borderTopColor = "transparent"; }
  return heightAnim(el, false, dur || 300);
}

// Swap what a box shows: the old content slips out, the new slides in from the side you went.
function swapContent(box, fill, dir, resize) {
  const id = box._swap = (box._swap || 0) + 1;
  if (reduced) { box.replaceChildren(); fill(); return; }
  let o0 = 1;
  if (box._si) { o0 = Number(getComputedStyle(box).opacity); box._si.cancel(); box._si = null; }
  let out = box._so;
  if (!out || out.playState !== "running") out = box._so = anim(box, [{ opacity: o0, transform: "none" }, { opacity: 0, transform: `translateX(${-dir * 14}px)` }], { duration: 120, easing: "ease-in", fill: "forwards" });
  settled(out).then(() => {
    if (box._swap !== id || !box.isConnected) return;
    const h0 = resize ? resize.getBoundingClientRect().height : 0;
    if (box._so) { box._so.cancel(); box._so = null; }
    box.replaceChildren(); fill();
    box._si = anim(box, [{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: "none" }], { duration: 420, easing: EASE.out });
    if (resize) {
      const h1 = resize.getBoundingClientRect().height;
      if (Math.abs(h1 - h0) > 1) { resize.style.overflow = "hidden"; settled(anim(resize, [{ height: h0 + "px" }, { height: h1 + "px" }], { duration: 480, easing: EASE.soft })).then(() => { resize.style.overflow = ""; }); }
    }
  });
}

// Segmented control with a sliding thumb. onPick(key, direction) runs after the thumb starts moving.
function segControl(label, opts, cur, onPick) {
  const seg = h("div", { class: "seg", role: "tablist", "aria-label": label });
  seg.style.setProperty("--n", String(opts.length));
  seg.append(h("span", { class: "seg-thumb", "aria-hidden": "true" }));
  let at = Math.max(0, opts.findIndex(o => o[0] === cur));
  const btns = opts.map(([k, t], i) => h("button", { type: "button", role: "tab", text: t, onclick: () => {
    if (i === at) return;
    const dir = i > at ? 1 : -1; at = i; sync(); onPick(k, dir);
  } }));
  const sync = () => { seg.style.setProperty("--i", String(at)); btns.forEach((b, i) => b.setAttribute("aria-selected", String(i === at))); };
  seg.append(...btns); sync();
  return seg;
}

// Numbers that roll to their new value instead of jumping. One counter per key, so it survives redraws.
const COUNTERS = new Map();
function counter(el, key, value, fmt, opt = {}) {
  let c = COUNTERS.get(key);
  if (!c) { const v0 = opt.from != null ? opt.from : value; c = { v: v0, to: v0, raf: 0 }; COUNTERS.set(key, c); }
  c.el = el; c.fmt = fmt;
  if (reduced) { cancelAnimationFrame(c.raf); c.raf = 0; c.v = c.to = value; }
  else if (value !== c.to) {
    c.from = c.v; c.to = value; c.t0 = performance.now(); c.dur = opt.dur || 600;
    cancelAnimationFrame(c.raf);
    const tick = (now) => {
      const k = Math.min(1, (now - c.t0) / c.dur), e = 1 - Math.pow(1 - k, 3);
      c.v = k < 1 ? c.from + (c.to - c.from) * e : c.to;
      if (c.el.isConnected) c.el.textContent = c.fmt(c.v);
      c.raf = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    c.raf = requestAnimationFrame(tick);
  }
  el.textContent = fmt(c.v);
}

// Glide a slider to a value (a preset or a quick pick), feeding every frame to apply(value, landed).
// While it glides the slider moves freely between its steps; a finger on it stops the glide.
function stopGlide(inp) {
  if (!inp._g) return;
  cancelAnimationFrame(inp._g); inp._g = 0;
  if (inp._step) inp.setAttribute("step", inp._step); else inp.removeAttribute("step");
}
function glide(inp, to, apply, dur = 460) {
  stopGlide(inp);
  const from = Number(inp.value);
  inp._step = inp.getAttribute("step");
  const land = () => { inp._g = 0; if (inp._step) inp.setAttribute("step", inp._step); else inp.removeAttribute("step"); inp.value = String(to); fillRange(inp); apply(to, true); };
  if (reduced || Math.abs(from - to) < 1e-9) { land(); return; }
  inp.step = "any";
  const t0 = performance.now();
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    if (k >= 1) { land(); return; }
    const e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
    inp.value = String(v); fillRange(inp); apply(v, false);
    inp._g = requestAnimationFrame(frame);
  };
  inp._g = requestAnimationFrame(frame);
}

/* ---------- toast and sheet ---------- */
let toastT = 0;
function toast(msg) {
  const t = $("#toast"), was = t.classList.contains("on");
  t.textContent = msg; t.classList.add("on");
  if (was) anim(t, [{ transform: "scale(.95)" }, { transform: "none" }], { duration: 600, easing: EASE.spring });
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
}
const sheetEl = $("#sheet"), scrim = $("#scrim"), sheetBodyEl = $("#sheetBody");
let sheetOnClose = null, sheetFocus = null, sheetOpen = false, sheetAnims = [];
const sheetY = (y) => "translateY(" + y.toFixed(1) + "px)";
function sheetMove(y0, y1, s0, s1, dur, easing) {
  for (const a of sheetAnims) if (a) a.cancel();
  sheetEl.style.transform = sheetY(y1); scrim.style.opacity = String(s1);
  sheetAnims = [anim(sheetEl, [{ transform: sheetY(y0) }, { transform: sheetY(y1) }], { duration: dur, easing }),
    anim(scrim, [{ opacity: s0 }, { opacity: s1 }], { duration: Math.min(dur, 420), easing: "ease-out" })];
  return settled(sheetAnims[0]);
}
function openSheet(title, body, opts = {}) {
  if (sheetOpen) closeSheet(true);
  sheetFocus = document.activeElement;
  $("#sheetTitle").textContent = title;
  $("#sheetX").textContent = opts.done || "Done";
  sheetBodyEl.replaceChildren(body);
  sheetOnClose = opts.onClose || null;
  scrim.hidden = false; sheetEl.hidden = false; sheetOpen = true;
  sheetBodyEl.scrollTop = 0;
  document.documentElement.style.overflow = "hidden";
  sheetMove(sheetEl.offsetHeight + 30, 0, 0, 1, 600, EASE.sheet);
  setTimeout(() => { if (!sheetOpen) return; const f = opts.focus && $(opts.focus, sheetEl); (f || $("#sheetX")).focus({ preventScroll: true }); }, reduced ? 0 : 380);
}
function closeSheet(instant, fling) {
  if (!sheetOpen) return;
  sheetOpen = false;
  const ae = document.activeElement;
  if (ae && sheetEl.contains(ae) && ae.blur) ae.blur();
  document.documentElement.style.overflow = "";
  const cb = sheetOnClose; sheetOnClose = null;
  const done = () => {
    if (sheetOpen) return;
    for (const a of sheetAnims) if (a) a.cancel();
    sheetAnims = [];
    scrim.hidden = true; sheetEl.hidden = true;
    sheetEl.style.transform = ""; sheetEl.style.bottom = ""; sheetEl.style.maxHeight = ""; scrim.style.opacity = "";
    sheetBodyEl.replaceChildren();
  };
  if (instant || reduced) done();
  else {
    const H = sheetEl.offsetHeight + 30, y0 = fling ? fling.y : 0, v = fling ? Math.max(0, fling.v) : 0;
    const s0 = scrim.style.opacity === "" ? 1 : Number(scrim.style.opacity);
    // a flick leaves at the finger's speed; a tap on Done uses the sheet's own curve
    const dur = v > 0.3 ? Math.max(160, Math.min(380, (H - y0) / v * 1.6)) : 380;
    sheetMove(y0, H, s0, 0, dur, v > 0.3 ? EASE.out : "cubic-bezier(.3,0,.2,1)").then(done);
  }
  if (cb) cb();
  if (sheetFocus && sheetFocus.isConnected) try { sheetFocus.focus({ preventScroll: true }); } catch (e) {}
}
$("#sheetX").addEventListener("click", () => closeSheet());
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => {
    if (!sheetOpen) { sheetEl.style.bottom = ""; sheetEl.style.maxHeight = ""; return; }
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    sheetEl.style.bottom = kb ? kb + "px" : "";
    sheetEl.style.maxHeight = kb ? "calc(" + Math.round(vv.height) + "px - var(--top) - 12px)" : "";
  };
  vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit);
}
scrim.addEventListener("click", () => closeSheet());
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheetOpen) closeSheet(); });
// Drag the sheet down to close it: from the handle, the title bar, or the content once it's scrolled to the top.
// It follows the finger, resists being pulled up, and a quick flick closes it even from a short drag.
(() => {
  let d = null;
  const rubber = (x) => 28 * Math.log1p(x / 28);
  const nowY = () => { const tf = getComputedStyle(sheetEl).transform; try { return tf && tf !== "none" ? new DOMMatrixReadOnly(tf).m42 : 0; } catch (e) { return 0; } };
  const engage = (y, t) => {
    const base = nowY(); // catch the sheet where it is, even halfway through opening
    for (const a of sheetAnims) if (a) a.cancel();
    sheetAnims = [];
    d.on = true; d.base = Math.max(0, base); d.y0 = y - d.base; d.yl = y; d.t = t; d.H = sheetEl.offsetHeight;
    const ae = document.activeElement;
    if (ae && sheetEl.contains(ae) && ae.matches("input, textarea")) ae.blur();
  };
  // a finger on a sheet that is still sliding up stops it right there, like iOS
  const catchIt = () => {
    if (!sheetAnims.some(a => a && a.playState === "running")) return false;
    const y = nowY(), op = getComputedStyle(scrim).opacity;
    for (const a of sheetAnims) if (a) a.cancel();
    sheetAnims = [];
    sheetEl.style.transform = sheetY(y); scrim.style.opacity = op;
    return true;
  };
  const down = (x, y, t, target) => {
    d = null;
    if (!sheetOpen || !(target instanceof Element) || target.closest("input[type=range]")) return;
    d = { x0: x, y0: y, on: false, body: sheetBodyEl.contains(target), v: 0, dy: 0, yl: y, t, caught: catchIt() };
  };
  const move = (x, y, t) => { // returns true when the sheet owns this move
    if (!d) return false;
    if (!d.on) {
      const dx = x - d.x0, dy = y - d.y0;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { d = null; return false; }
      if (d.body) {
        if (sheetBodyEl.scrollTop > 0 || dy < 0) { if (Math.abs(dy) > 3) d = null; return false; }
        if (dy < 5) return true; // hold the content still while we see which way this goes
      } else if (Math.abs(dy) < 5) return false;
      engage(y, t);
    }
    const dt = t - d.t;
    if (dt > 0) { d.v = 0.7 * ((y - d.yl) / dt) + 0.3 * d.v; d.yl = y; d.t = t; }
    d.dy = y - d.y0;
    sheetEl.style.transform = sheetY(d.dy >= 0 ? d.dy : -rubber(-d.dy));
    scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, d.dy) / d.H));
    return true;
  };
  const up = () => {
    const s = d; d = null;
    if (s && !s.on && s.caught && sheetOpen) { sheetMove(nowY(), 0, Number(scrim.style.opacity || 1), 1, 520, EASE.soft); return; }
    if (!s || !s.on || !sheetOpen) return;
    // closes when pulled a quarter of the way (or 60px past where a still-opening sheet was caught), or flicked down
    const pulled = s.base > 0 ? s.dy - s.base > 60 : s.dy > s.H * 0.25;
    if ((pulled || s.v > 0.5) && s.v > -0.1) closeSheet(false, { y: Math.max(0, s.dy), v: s.v });
    else sheetMove(s.dy >= 0 ? s.dy : -rubber(-s.dy), 0, Number(scrim.style.opacity || 1), 1, 560, EASE.soft);
  };
  sheetEl.addEventListener("touchstart", (e) => { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp, e.target); else d = null; }, { passive: true });
  sheetEl.addEventListener("touchmove", (e) => { if (d && move(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp) && e.cancelable) e.preventDefault(); }, { passive: false });
  sheetEl.addEventListener("touchend", up); sheetEl.addEventListener("touchcancel", up);
  for (const zone of [$("#sheetGrab"), $(".sheet-h", sheetEl)]) { // mouse: handle and title bar
    zone.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button")) return; down(e.clientX, e.clientY, e.timeStamp, zone); zone.setPointerCapture(e.pointerId); });
    zone.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") move(e.clientX, e.clientY, e.timeStamp); });
    zone.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") up(); });
  }
})();

function armed(btn, label, armedLabel, action) {
  let t = 0;
  btn.addEventListener("click", () => {
    if (!btn.classList.contains("armed")) {
      btn.classList.add("armed"); btn.textContent = armedLabel;
      t = setTimeout(() => { btn.classList.remove("armed"); btn.textContent = label; }, 3500);
      return;
    }
    clearTimeout(t); btn.classList.remove("armed"); btn.textContent = label; action();
  });
  return btn;
}

/* ---------- views and routing ---------- */
const TITLES = { today: "Today", plan: "Plan", numbers: "Numbers", contacts: "Contacts", guide: "Guide", chapter: "" };
let view = null, chapter = null;
const scrolls = {};
const RENDER = {};
const ROOTS = { today: "#todayRoot", plan: "#planRoot", numbers: "#numRoot", contacts: "#conRoot", guide: "#guideRoot" };
const navEl = $("#nav"), navBack = $("#navBack"), navTitle = $("#navTitle"), dimEl = $("#dim");
const glassAt = (y) => Math.min(1, Math.max(0, (y - 4) / 30)); // how much of the bar's glass shows at a scroll position
const viewEl = (v) => $('.view[data-view="' + v + '"]');
let navT = null, skipAnim = false;
function parseRoute() {
  const raw = decodeURIComponent((location.hash || "").slice(1));
  const [a, b] = raw.split("/");
  if (a === "guide" && b && CHAPTERS.some(c => c[0] === b)) return { v: "chapter", sub: b };
  if (["today", "plan", "numbers", "contacts", "guide"].includes(a)) return { v: a, sub: b || "" };
  return { v: "today", sub: "" };
}

// Screen changes. A tab fades up in place. A chapter pushes in from the right over the Guide, which
// slides back a little and dims, and pops back the same way (also by swiping in from the left edge).
// While a screen moves, both screens are pinned to the glass at their own scroll position.
function freeze(el, y, top) { el.classList.add("frozen"); if (top) el.classList.add("top", "edge"); el.scrollTop = y; }
function thaw(el) { el.classList.remove("frozen", "top", "edge", "leaving"); el.style.transform = ""; el.style.opacity = ""; }
function ghostOf(el, y) { // a still copy of a chapter, so one chapter can push over another
  const g = el.cloneNode(true);
  g.removeAttribute("data-view"); g.removeAttribute("aria-labelledby"); g.setAttribute("aria-hidden", "true"); g.inert = true;
  for (const n of g.querySelectorAll("[id]")) n.removeAttribute("id");
  g.dataset.ghost = "1";
  el.after(g); freeze(g, y, false);
  return g;
}
function startNav(kind, outEl, inEl, yOut, yIn, yNav) {
  const t = { kind, yNav: yNav == null ? yIn : yNav, anims: [], over: false };
  if (kind === "fade") {
    if (outEl && outEl !== inEl) outEl.classList.remove("on");
    inEl.classList.add("on"); freeze(inEl, yIn, false);
    t.anims.push(anim(inEl, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: EASE.out }));
  } else {
    // q is how much of the glass the chapter (the top layer) covers: 0 = the Guide, 1 = the chapter
    const W = innerWidth, top = kind === "pop" ? outEl : inEl, under = kind === "pop" ? inEl : outEl;
    outEl.classList.add("leaving"); outEl.classList.remove("on");
    if (!outEl.classList.contains("frozen")) freeze(outEl, yOut, kind === "pop");
    else if (kind === "pop") outEl.classList.add("top", "edge");
    inEl.classList.add("on"); freeze(inEl, yIn, kind === "push");
    dimEl.hidden = false; navBack.hidden = false;
    const f = (q) => ({ top: "translateX(" + ((1 - q) * W).toFixed(1) + "px)", under: "translateX(" + (-q * 0.3 * W).toFixed(1) + "px)",
      dim: q, back: q, backX: "translateX(" + ((1 - q) * 22).toFixed(1) + "px)" });
    t.set = (q) => { const v = f(q); top.style.transform = v.top; under.style.transform = v.under; dimEl.style.opacity = String(v.dim); navBack.style.opacity = String(v.back); navBack.style.transform = v.backX; };
    t.run = (q0, q1, dur, easing) => {
      for (const a of t.anims) if (a) a.cancel();
      const a0 = f(q0), a1 = f(q1), o = { duration: dur, easing };
      t.set(q1);
      t.anims = [anim(top, [{ transform: a0.top }, { transform: a1.top }], o), anim(under, [{ transform: a0.under }, { transform: a1.under }], o),
        anim(dimEl, [{ opacity: a0.dim }, { opacity: a1.dim }], o), anim(navBack, [{ opacity: a0.back, transform: a0.backX }, { opacity: a1.back, transform: a1.backX }], o)];
      return settled(t.anims[0]);
    };
    t.set(kind === "push" ? 0 : 1);
  }
  // land = true: finish on the new screen. land = false: go back to the old one (a swipe let go early).
  t.end = (land = true) => {
    if (t.over) return;
    t.over = true;
    for (const a of t.anims) if (a) a.cancel();
    const keep = land ? inEl : outEl, drop = land ? outEl : inEl;
    if (drop && drop !== keep) { thaw(drop); drop.classList.remove("on"); if (drop.dataset.ghost) drop.remove(); }
    thaw(keep); keep.classList.add("on");
    dimEl.hidden = true; dimEl.style.opacity = "";
    navBack.style.opacity = ""; navBack.style.transform = ""; navBack.style.transition = ""; navBack.hidden = view !== "chapter";
    navTitle.style.opacity = ""; navTitle.style.transition = "";
    if (navT === t) navT = null;
    window.scrollTo(0, land ? yIn : yOut);
    applyScroll();
  };
  navT = t;
  return t;
}
function route() {
  const r = parseRoute();
  if (navT) navT.end(true);
  const prev = view, prevCh = chapter, yOut = scrollY;
  if (prev && prev !== "chapter") scrolls[prev] = yOut;
  if (sheetOpen) closeSheet(true);
  if (r.v === "numbers" && r.sub) {
    if (r.sub === "checkin" || r.sub === "tests") UI.numTab = r.sub;
    else if (["order", "budget", "value", "round"].includes(r.sub)) { UI.numTab = "calc"; UI.calcTab = r.sub; }
    saveUI();
  }
  const next = r.v, nextCh = r.v === "chapter" ? r.sub : null;
  let kind = "none";
  if (prev && !skipAnim && !reduced && !launching) {
    if (next === "chapter" && (prev === "guide" || (prev === "chapter" && prevCh !== nextCh))) kind = "push";
    else if (prev === "chapter" && next === "guide") kind = "pop";
    else if (prev !== next) kind = "fade";
  }
  skipAnim = false;
  const outEl = !prev ? null : (kind === "push" && prev === "chapter") ? ghostOf(viewEl("chapter"), yOut) : viewEl(prev);
  view = next; chapter = nextCh;
  const tabKey = view === "chapter" ? "guide" : view;
  for (const t of $$(".tab")) { if (t.dataset.tab === tabKey) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); }
  if (view === "chapter") showChapter(chapter); else RENDER[view]();
  const inEl = viewEl(view), yIn = view === "chapter" ? 0 : (scrolls[view] || 0);
  // a title that is about to hide goes at once, so the new screen's name never fades out in its place
  if (navEl.classList.contains("titled") && yIn <= 44) { navTitle.style.transition = "none"; navEl.classList.remove("titled"); void navTitle.offsetWidth; navTitle.style.transition = ""; }
  navTitle.textContent = view === "chapter" ? CHAPTERS.find(c => c[0] === chapter)[1] : TITLES[view];
  if (kind === "none") {
    for (const sec of $$(".view[data-view]")) sec.classList.toggle("on", sec === inEl);
    navBack.hidden = view !== "chapter";
    window.scrollTo(0, yIn);
    applyScroll();
    return;
  }
  navEl.classList.add("ease"); setTimeout(() => navEl.classList.remove("ease"), 360);
  const t = startNav(kind, outEl, inEl, yOut, yIn);
  applyScroll();
  if (kind === "fade") { navBack.hidden = view !== "chapter"; settled(t.anims[0]).then(() => t.end(true)); }
  else t.run(kind === "push" ? 0 : 1, kind === "push" ? 1 : 0, 560, EASE.soft).then((ok) => { if (ok) t.end(true); });
}
// The bar's glass follows the scroll; the small title shows once the large one has slid under it.
function applyScroll() {
  const y = navT ? navT.yNav : scrollY;
  navEl.style.setProperty("--k", Math.min(1, Math.max(0, (y - 4) / 30)).toFixed(3));
  navEl.classList.toggle("titled", y > 44);
}
addEventListener("scroll", applyScroll, { passive: true });
addEventListener("hashchange", route);
navBack.addEventListener("click", () => { location.hash = "#guide"; });
for (const t of $$(".tab")) t.addEventListener("click", e => {
  const k = t.dataset.tab;
  if (view === k) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); }
});
// Swipe in from the left edge of a chapter to go back to the Guide, like any iPhone app.
// (In Safari itself the browser's own back swipe does this, so the app leaves the edge to it.)
(() => {
  const standalone = navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) return;
  let g = null, lastSwipe = 0;
  addEventListener("touchstart", (e) => {
    g = null;
    if (view !== "chapter" || sheetOpen || navT || reduced || e.touches.length !== 1) return;
    const p = e.touches[0];
    if (p.clientX > 24) return;
    g = { x0: p.clientX, y0: p.clientY, on: false, x: p.clientX, t: e.timeStamp, v: 0 };
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (!g) return;
    const p = e.touches[0], dx = p.clientX - g.x0, dy = p.clientY - g.y0;
    if (!g.on) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      if (dx < 6) return;
      g.on = true;
      g.kTop = glassAt(scrollY); g.kUnder = glassAt(scrolls.guide || 0); g.titled = scrollY > 44;
      renderGuide();
      startNav("pop", viewEl("chapter"), viewEl("guide"), scrollY, scrolls.guide || 0, scrollY);
      navBack.style.transition = "none"; navTitle.style.transition = "none";
    }
    if (e.cancelable) e.preventDefault();
    const dt = e.timeStamp - g.t;
    if (dt > 0) { g.v = 0.6 * ((p.clientX - g.x) / dt) + 0.4 * g.v; g.x = p.clientX; g.t = e.timeStamp; }
    if (navT && navT.set) {
      const q = 1 - Math.max(0, dx) / innerWidth;
      navT.set(q);
      navEl.style.setProperty("--k", (g.kUnder + (g.kTop - g.kUnder) * q).toFixed(3));
      navTitle.style.opacity = g.titled ? q.toFixed(3) : "0";
    }
  }, { passive: false });
  const end = () => {
    const s = g; g = null;
    if (!s || !s.on || !navT || !navT.run) return;
    lastSwipe = performance.now();
    const t = navT, W = innerWidth, x = Math.max(0, s.x - s.x0), q = 1 - x / W;
    const go = (x > W * 0.33 || s.v > 0.35) && s.v > -0.2;
    const left = (go ? q : 1 - q) * W;
    const dur = s.v > 0.3 && go ? Math.max(170, Math.min(420, left / s.v * 1.8)) : 260 + 220 * left / W;
    // the bar finishes the move with the screens
    navEl.classList.add("ease"); setTimeout(() => navEl.classList.remove("ease"), 380);
    navTitle.style.transition = ""; navTitle.style.opacity = go || !s.titled ? "0" : "1";
    navEl.style.setProperty("--k", (go ? s.kUnder : s.kTop).toFixed(3));
    t.run(q, go ? 0 : 1, dur, EASE.out).then((ok) => {
      if (!ok || navT !== t) return;
      if (go) { skipAnim = true; history.pushState(null, "", "#guide"); route(); }
      else t.end(false);
    });
  };
  addEventListener("touchend", end); addEventListener("touchcancel", end);
  addEventListener("click", (e) => { if (performance.now() - lastSwipe < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
})();

function largeTitle(kicker, title, actions) {
  return h("header", { class: "lt" },
    h("div", null, kicker ? h("p", { class: "lt-kicker", text: kicker }) : null, h("h1", { text: title })),
    actions ? h("div", { class: "lt-act" }, actions) : null);
}
function sectionHead(title, link) { return h("div", { class: "sh" }, h("h2", { text: title }), link || null); }

/* ---------- the freddo cup ---------- */
const FOAM0 = 280, FOAMR = 230;
let foamY = FOAM0, foamRAF = 0, cupFoam = null;
// The foam rides a damped spring (response 1s, damping .72): it rises, overshoots a hair and settles.
const foamSpring = (() => { const w0 = 2 * Math.PI, z = 0.72, wd = w0 * Math.sqrt(1 - z * z); return (t) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); })();
function foamTo(p, animate) {
  const target = FOAM0 - FOAMR * p;
  cancelAnimationFrame(foamRAF); foamRAF = 0;
  const apply = () => { if (cupFoam) cupFoam.setAttribute("transform", "translate(0 " + foamY.toFixed(2) + ")"); };
  if (!animate || reduced || Math.abs(target - foamY) < 0.5) { foamY = target; apply(); return; }
  const from = foamY, t0 = performance.now();
  const step = (now) => {
    const t = (now - t0) / 1000;
    foamY = t >= 1.7 ? target : from + (target - from) * foamSpring(t);
    apply();
    foamRAF = t >= 1.7 ? 0 : requestAnimationFrame(step);
  };
  foamRAF = requestAnimationFrame(step);
}
function buildCup(p) {
  const svg = svgEl(`<svg class="cup hero-cup" viewBox="24 -8 284 444" role="img" aria-label="Freddo cup, ${Math.round(p.done / p.total * 100)}% full of foam">
    <defs>
      <clipPath id="cupIn"><path d="M40,-12 L240,-12 L240,70 L208,420 L72,420 L40,70 Z"/></clipPath>
      <linearGradient id="espG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A4528"/><stop offset=".25" stop-color="#4A2615"/><stop offset="1" stop-color="#2C160A"/></linearGradient>
      <linearGradient id="cremaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9A877" stop-opacity="0"/><stop offset=".55" stop-color="#D9A877"/><stop offset="1" stop-color="#9A6440"/></linearGradient>
    </defs>
    <ellipse class="shadow" cx="140" cy="426" rx="86" ry="7"/>
    <path class="straw" d="M171.6 404.2 L223.6 -2.8 L236.5 -1.2 L184.5 405.8 Z"/>
    <g clip-path="url(#cupIn)">
      <g class="foam-g">
        <path class="foam" d="M30,30 A21,21 0 0 1 66.7,14 A21,21 0 0 1 103.3,4 A21,21 0 0 1 140,0 A21,21 0 0 1 176.7,4 A21,21 0 0 1 213.3,14 A21,21 0 0 1 250,30 L250,470 L30,470 Z"/>
        <g class="bubbles"><circle cx="84" cy="38" r="5"/><circle cx="118" cy="26" r="3.5"/><circle cx="162" cy="40" r="4.5"/><circle cx="200" cy="34" r="3"/><circle cx="104" cy="62" r="3"/><circle cx="150" cy="72" r="4"/><circle cx="188" cy="90" r="3.2"/><circle cx="92" cy="106" r="4"/><circle cx="132" cy="128" r="3"/></g>
      </g>
      <rect x="0" y="284" width="300" height="18" fill="url(#cremaG)"/>
      <rect x="0" y="300" width="300" height="130" fill="url(#espG)"/>
      <g class="ice">
        <rect x="86" y="318" width="36" height="36" rx="7" transform="rotate(-12 104 336)"/>
        <rect x="136" y="346" width="32" height="32" rx="6" transform="rotate(10 152 362)"/>
        <rect x="100" y="372" width="34" height="34" rx="7" transform="rotate(24 117 389)"/>
        <rect x="152" y="310" width="28" height="28" rx="6" transform="rotate(-6 166 324)"/>
      </g>
    </g>
    <line class="shine" x1="58" y1="98" x2="82" y2="372"/>
    <path class="glass" d="M40,70 L72,420 L208,420 L240,70"/>
    <rect class="lip" x="33" y="62" width="214" height="13" rx="6.5"/>
    <g class="ruler"></g>
  </svg>`);
  cupFoam = $(".foam-g", svg);
  cupFoam.setAttribute("transform", "translate(0 " + foamY.toFixed(1) + ")");
  const ruler = $(".ruler", svg), yAt = f => FOAM0 - FOAMR * f;
  ruler.append(s("line", { class: "rule", x1: 258, y1: yAt(0), x2: 258, y2: yAt(1) }), s("line", { class: "rule", x1: 252, y1: yAt(0), x2: 264, y2: yAt(0) }));
  let cum = 0, marker = null;
  p.per.forEach((x, i) => {
    const f0 = cum / p.total, f1 = (cum + x.w) / p.total; cum += x.w;
    ruler.append(s("line", { class: "rule", x1: 252, y1: yAt(f1), x2: 264, y2: yAt(f1) }));
    const ym = yAt((f0 + f1) / 2);
    if (i === p.current) {
      const g = s("g", { class: "now" });
      g.append(s("circle", { cx: 286, cy: ym, r: 17 }));
      const t = s("text", { x: 286, y: ym, dy: "0.36em" }); t.textContent = x.n; g.append(t);
      marker = g;
    } else {
      const g = s("g", { class: "dot" + (x.complete ? " done" : "") });
      g.append(s("circle", { cx: 286, cy: ym, r: 6 }));
      ruler.append(g);
    }
  });
  if (marker) ruler.append(marker);
  return svg;
}

/* ---------- foam badge ---------- */
function scallop(cx, cy, r, n) {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i === 0) d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
    else { const chord = 2 * r * Math.sin(Math.PI / n), ra = chord * 0.56; d += ` A${ra.toFixed(2)} ${ra.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`; }
  }
  return d + "Z";
}
const BADGE_PATH = scallop(30, 30, 23, 9);
function badgeSvg(n, cls) {
  return svgEl(`<svg viewBox="0 0 60 60" aria-hidden="true"><path class="shape" d="${BADGE_PATH}"/><text x="30" y="30" dy="0.36em">${n}</text></svg>`);
}

/* ---------- Today ---------- */
let nextTimer = 0, heroRefs = null, heroSeen = false;
const fmtPct = (v) => Math.round(v) + "%";
const heroMeta = (st, x) => x.d + " of " + x.steps.length + " steps in this stage" + (st.gate && x.d === x.steps.length ? ", gate next" : "");
function renderToday() {
  const root = $("#todayRoot"), now = today(), p = progress();
  const settingsBtn = h("button", { class: "round-btn", type: "button", "aria-label": "Settings and backup", html: ICON.settings, onclick: openSettings });
  root.replaceChildren(largeTitle(DAYS[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()], "Today", [settingsBtn]));

  // hero
  const pct = Math.round(p.done / p.total * 100);
  const hero = h("div", { class: "card hero", data: { k: "t-hero" } });
  const cupWrap = h("div", null, buildCup(p));
  let info;
  if (p.current < STAGES.length) {
    const st = STAGES[p.current], x = p.per[p.current];
    const pctEl = h("span", { class: "big md num" }), barI = h("i", { style: "width:" + (x.steps.length ? Math.round(x.d / x.steps.length * 100) : 0) + "%" });
    const meta = h("p", { class: "hero-meta", text: heroMeta(st, x) });
    info = h("div", null,
      h("p", { class: "hero-k", text: "You're in Stage " + st.n }),
      h("p", { class: "hero-t", text: st.title }),
      h("div", { class: "hero-pct" }, pctEl, h("small", { text: "of the plan" })),
      h("div", { class: "bar", "aria-hidden": "true", data: { k: "t-bar:" + p.current, enter: "none" } }, barI), meta);
    heroRefs = { pct: pctEl, bar: barI, meta, stage: p.current };
  } else {
    const pctEl = h("span", { class: "big md num" });
    info = h("div", null, h("p", { class: "hero-k", text: "All 7 stages" }), h("p", { class: "hero-t", text: "The cup is full" }),
      h("div", { class: "hero-pct" }, pctEl), h("p", { class: "hero-meta", text: "Time to prepare the sale." }));
    heroRefs = { pct: pctEl, bar: null, meta: null, stage: STAGES.length };
  }
  hero.append(cupWrap, info);
  root.append(hero);
  // The one big moment: the cup fills and the number counts up, the first time you see Today.
  const refs = heroRefs, startHero = () => {
    foamTo(p.done / p.total, true);
    counter(refs.pct, "pct", pct, fmtPct, { from: 0, dur: 1100 });
    if (!heroSeen) { heroSeen = true; if (refs.bar) anim(refs.bar, [{ width: "0%" }, { width: refs.bar.style.width }], { duration: 1100, easing: EASE.soft }); }
  };
  if (launching) { refs.pct.textContent = fmtPct(COUNTERS.has("pct") ? COUNTERS.get("pct").v : 0); afterLaunch.push(startHero); }
  else startHero();

  // check-in
  const wk = thisWeek(), entry = S.checkins[wk], doneWk = !!(entry && entry.done), streak = streakCount();
  const isMonday = now.getDay() === 1;
  const ci = h("div", { class: "card checkin", data: { k: "t-ci" } },
    h("div", { class: "streak" }, h("span", { class: "big num", text: String(streak) }), h("small", { text: streak === 1 ? "week in a row" : "weeks in a row" })),
    h("div", { class: "checkin-main" },
      h("b", { text: "Monday check-in" }),
      h("p", { class: "muted", text: doneWk ? "Done for this week. See you Monday." : isMonday ? "Due today. Eight numbers, about 10 minutes." : "Not done yet this week. Any day counts." }),
      h("a", { class: "btn small" + (doneWk ? " soft" : ""), href: "#numbers/checkin", text: doneWk ? "See this week" : "Start check-in" })));
  root.append(ci);

  // next up
  root.append(sectionHead("Next up", h("a", { href: "#plan", text: "All steps" })));
  const nextBox = h("div", { class: "card", data: { k: "t-next" } });
  fillNext(nextBox, p);
  root.append(nextBox);

  // badges
  const earned = p.per.filter(x => x.complete).length;
  root.append(sectionHead("Stage badges", h("span", { class: "muted", style: "font-size:15px", text: earned + " of 7" })));
  const bcard = h("div", { class: "card", data: { k: "t-bdg" } });
  const row = h("div", { class: "badges" });
  p.per.forEach((x, i) => {
    const b = h("a", { class: "bdg" + (x.complete ? " on" : i === p.current ? " now" : ""), href: "#plan", "aria-label": "Stage " + x.n + (x.complete ? ", done" : i === p.current ? ", in progress" : ", locked"), onclick: () => { UI.open[x.n] = true; saveUI(); } },
      badgeSvg(x.n), h("span", { text: x.complete ? "Done" : i === p.current ? "Now" : "" }));
    row.append(b);
  });
  bcard.append(row, h("p", { class: "bdg-cap", text: earned === 7 ? "Every badge earned." : "Finish a stage, gate included, to earn its badge." }));
  root.append(bcard);
}
function fillNext(box, p) {
  box.replaceChildren();
  if (p.current >= STAGES.length) { box.append(h("p", { class: "muted", style: "margin:0", text: "Every step is done. Read Selling the company in the Guide." })); return; }
  const st = STAGES[p.current], open = p.per[p.current].steps.filter(x => !S.tasks[x.id]);
  if (open.length) {
    const ul = h("ul", { class: "steps-l next-l" });
    for (const x of open.slice(0, 4)) ul.append(stepRow(x, "today"));
    box.append(ul);
    if (open.length > 4) box.append(h("p", { class: "hint", text: plural(open.length - 4, "more step", "more steps") + " in Stage " + st.n + "." }));
  } else if (st.gate) {
    box.append(h("div", { class: "gate-prompt" },
      h("p", null, h("b", { text: "Every step in Stage " + st.n + " is done. " }), "Gate: " + st.gate),
      gateToggle(st.n)));
  }
}
function streakCount() {
  let wk = mondayOf(today()), n = 0;
  const isDone = d => { const e = S.checkins[isoOf(d)]; return !!(e && e.done); };
  if (!isDone(wk)) wk = addDays(wk, -7);
  while (isDone(wk)) { n++; wk = addDays(wk, -7); }
  return n;
}

/* ---------- steps (shared by Today and Plan) ---------- */
function stepRow(x, where) {
  const doneNow = !!S.tasks[x.id];
  const inp = h("input", { class: "vh", type: "checkbox", "aria-label": "Done: " + x.text });
  inp.checked = doneNow;
  inp.addEventListener("change", () => toggleStep(x.id, inp.checked, where, li));
  const body = h("button", { class: "step-body", type: "button", onclick: () => openStep(x.id) },
    h("span", { class: "t", text: x.text }, x.own ? h("span", { class: "step-own", text: "Yours" }) : null),
    S.notes[x.id] ? h("span", { class: "n", text: S.notes[x.id] }) : null);
  const li = h("li", { class: "step" + (doneNow ? " done" : ""), data: { step: x.id, k: "s:" + x.id, enter: "expand" } }, h("label", { class: "tick" }, inp, h("span", { class: "ck", "aria-hidden": "true" })), body);
  return li;
}
function toggleStep(id, on, where, li) {
  if (on) S.tasks[id] = true; else delete S.tasks[id];
  save();
  if (li) li.classList.toggle("done", on);
  afterProgress(where);
}
function gateToggle(n) {
  const inp = h("input", { class: "vh", type: "checkbox", "aria-label": "Stage " + n + " gate hit" });
  inp.checked = !!S.gates[n];
  inp.addEventListener("change", () => { if (inp.checked) S.gates[n] = true; else delete S.gates[n]; save(); afterProgress(view === "today" ? "today-gate" : "plan"); });
  return h("label", { class: "tick-row" }, inp, h("span", { class: "ck", "aria-hidden": "true" }), h("span", { class: "t", style: "font-weight:600", text: "We hit this gate" }));
}
function afterProgress(where) {
  checkBadges(true);
  if (view === "today") {
    clearTimeout(nextTimer);
    updateHero(progress());
    // let the tick finish, fold the done steps away, then let the next step slide in
    nextTimer = setTimeout(() => {
      if (view !== "today") return;
      const lis = $$("#todayRoot .next-l > li"), gone = lis.filter(li => li.classList.contains("done"));
      const first = lis.find(li => !li.classList.contains("done"));
      if (first && first !== lis[0]) { first.style.transition = "border-color .3s ease"; first.style.borderTopColor = "transparent"; }
      Promise.all(gone.map(li => heightAnim(li, false, 340))).then(() => { if (view === "today") rerenderKeepScroll(); });
    }, where === "today" || where === "today-gate" ? (reduced ? 150 : 650) : 0);
  } else if (view === "plan") updatePlanHeaders();
}
function updateHero(p) {
  if (!heroRefs || !heroRefs.pct.isConnected) return;
  counter(heroRefs.pct, "pct", Math.round(p.done / p.total * 100), fmtPct, { dur: 700 });
  foamTo(p.done / p.total, true);
  if (heroRefs.bar && p.current === heroRefs.stage) {
    const st = STAGES[p.current], x = p.per[p.current];
    heroRefs.bar.style.width = (x.steps.length ? Math.round(x.d / x.steps.length * 100) : 0) + "%";
    heroRefs.meta.textContent = heroMeta(st, x);
  }
}

function openStep(id) {
  const x = findStep(id); if (!x) return;
  const st = STAGES[x.stage];
  const body = h("div");
  body.append(h("p", { class: "sheet-note", text: "Stage " + st.n + ": " + st.title }));
  let textInp = null;
  if (x.own) {
    textInp = h("textarea", { class: "inp", rows: "3", maxlength: "400", "aria-label": "Step" });
    textInp.value = x.text;
    body.append(h("label", { class: "field" }, h("span", { text: "Your step" }), textInp));
  } else body.append(h("p", { class: "sheet-step", text: x.text }));
  const doneInp = h("input", { class: "vh", type: "checkbox" }); doneInp.checked = !!S.tasks[id];
  doneInp.addEventListener("change", () => { toggleStep(id, doneInp.checked, "sheet"); });
  body.append(h("div", { class: "card", style: "background:var(--cream);box-shadow:none;padding:14px" }, h("label", { class: "tick-row" }, doneInp, h("span", { class: "ck", "aria-hidden": "true" }), h("span", { class: "t", style: "font-weight:600", text: "Done" }))));
  const note = h("textarea", { class: "inp", rows: "5", maxlength: "3000", placeholder: "Quotes, names, what you learned, what's next" });
  note.value = S.notes[id] || "";
  note.addEventListener("input", () => { const t = note.value; if (t.trim()) S.notes[id] = t; else delete S.notes[id]; save(); });
  body.append(h("label", { class: "field" }, h("span", { text: "Note" }), note));
  if (x.own) {
    textInp.addEventListener("input", () => { const t = textInp.value.trim(); const c = (S.custom[x.stage] || []).find(c => c.id === id); if (c && t) { c.text = textInp.value.slice(0, 400); save(); } });
    const del = h("button", { class: "btn danger", type: "button", text: "Delete this step" });
    armed(del, "Delete this step", "Tap again to delete", () => {
      S.custom[x.stage] = (S.custom[x.stage] || []).filter(c => c.id !== id);
      if (!S.custom[x.stage].length) delete S.custom[x.stage];
      delete S.tasks[id]; delete S.notes[id]; save(); closeSheet(); toast("Step deleted");
    });
    body.append(h("div", { class: "danger-zone" }, del));
  }
  openSheet("Step", body, { onClose: () => { checkBadges(false); RENDER[view] && view !== "chapter" && rerenderKeepScroll(); } });
}
function addStep(n) {
  const inp = h("textarea", { class: "inp", rows: "3", maxlength: "400", placeholder: "What needs doing?", id: "newStep" });
  const btn = h("button", { class: "btn", type: "button", text: "Add step", disabled: true });
  inp.addEventListener("input", () => { btn.disabled = !inp.value.trim(); });
  btn.addEventListener("click", () => {
    const t = inp.value.trim(); if (!t) return;
    (S.custom[n] = S.custom[n] || []).push({ id: uid(), text: t.slice(0, 400) });
    save(); closeSheet(); toast("Step added to Stage " + n);
  });
  openSheet("New step", h("div", null, h("p", { class: "sheet-note", text: "Stage " + n + ": " + STAGES[n].title }), h("label", { class: "field" }, h("span", { text: "Step" }), inp), btn),
    { focus: "#newStep", onClose: () => { checkBadges(false); rerenderKeepScroll(); } });
}
// Redraw the open screen without it jumping. Before the redraw, note where keyed blocks ([data-k]) sat,
// how state-coloured controls looked and how long the bars were; after it, slide the blocks from their
// old places, fold new rows open, fade new blocks in and let colours and bars travel to their new values.
const LOOKS = "button[aria-pressed], button[aria-selected], .st, .stage, .stage-n, .test, .test-v, .verdict";
const BARS = ".bar i, .stage-bar i, .bars .track i";
function lookKey(el, seen) {
  if (el.dataset.k) return "k:" + el.dataset.k;
  const anc = el.closest("[data-k]"), base = (anc ? anc.dataset.k : "") + "|" + (el.classList[0] || el.tagName) + "|" + (el.textContent || "").trim().slice(0, 48);
  const n = seen.get(base) || 0; seen.set(base, n + 1);
  return base + "#" + n;
}
const lookOf = (cs) => [cs.backgroundColor, cs.color, cs.boxShadow, cs.borderTopColor];
function snapshot(root) {
  const pos = new Map(), look = new Map(), bars = new Map(), seen = new Map(), bseen = new Map();
  for (const el of root.querySelectorAll("[data-k]")) pos.set(el.dataset.k, el.getBoundingClientRect().top);
  for (const el of root.querySelectorAll(LOOKS)) look.set(lookKey(el, seen), lookOf(getComputedStyle(el)));
  for (const el of root.querySelectorAll(BARS)) { const a = el.closest("[data-k]"), b = a ? a.dataset.k : ""; const n = bseen.get(b) || 0; bseen.set(b, n + 1); bars.set(b + "#" + n, el.style.width); }
  return { pos, look, bars };
}
function morph(root, snap) {
  if (!snap.pos.size) return;
  const keyed = $$("[data-k]", root), isNew = (el) => !snap.pos.has(el.dataset.k);
  const parentKeyed = (el) => el.parentElement ? el.parentElement.closest("[data-k]") : null;
  const fresh = keyed.filter(el => isNew(el) && !(parentKeyed(el) && isNew(parentKeyed(el))));
  // 1. new rows fold open first, so what sits below them is carried down by the layout itself
  for (const el of fresh) if (el.dataset.enter === "expand") heightAnim(el, true);
  // 2. blocks that moved slide from where they were (relative to a parent that moved too)
  const dy = new Map();
  for (const el of keyed) if (!isNew(el)) dy.set(el, snap.pos.get(el.dataset.k) - el.getBoundingClientRect().top);
  for (const [el, d] of dy) {
    const pk = parentKeyed(el), rel = d - (pk && dy.has(pk) ? dy.get(pk) : 0);
    if (Math.abs(rel) > 0.5) anim(el, [{ transform: "translateY(" + rel.toFixed(1) + "px)" }, { transform: "none" }], { duration: 560, easing: EASE.soft });
  }
  // 3. other new blocks fade in where they land
  for (const el of fresh) if (!el.dataset.enter) anim(el, [{ opacity: 0, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE.out });
  // 4. colours of controls whose state changed, and bars, travel instead of switching
  const seen = new Map(), bseen = new Map();
  for (const el of root.querySelectorAll(LOOKS)) {
    const was = snap.look.get(lookKey(el, seen)); if (!was) continue;
    const now = lookOf(getComputedStyle(el));
    if (now.some((v, i) => v !== was[i])) anim(el, [{ backgroundColor: was[0], color: was[1], boxShadow: was[2], borderTopColor: was[3] }, { backgroundColor: now[0], color: now[1], boxShadow: now[2], borderTopColor: now[3] }], { duration: 320, easing: "ease-out" });
  }
  for (const el of root.querySelectorAll(BARS)) {
    const a = el.closest("[data-k]"), b = a ? a.dataset.k : "", n = bseen.get(b) || 0; bseen.set(b, n + 1);
    const was = snap.bars.get(b + "#" + n);
    if (was != null && was !== el.style.width) anim(el, [{ width: was || "0%" }, { width: el.style.width }], { duration: 600, easing: EASE.soft });
  }
}
function rerenderKeepScroll() {
  if (view === "chapter" || !RENDER[view]) return;
  const root = $(ROOTS[view]), y = scrollY, snap = reduced || navT ? null : snapshot(root);
  RENDER[view]();
  if (!navT) window.scrollTo(0, y);
  if (snap) morph(root, snap);
}

/* ---------- Plan ---------- */
function renderPlan() {
  const root = $("#planRoot"), p = progress();
  root.replaceChildren(largeTitle(p.done + " of " + p.total + " steps done", "Plan"));
  root.append(h("p", { class: "hint", style: "margin:-6px 4px 16px", text: "Each stage ends with a gate: numbers you must hit before moving on. Miss a gate? Stay in that stage and use the fixes in the Numbers check-in." }));
  if (UI.open[p.current] === undefined && p.current < STAGES.length) UI.open[p.current] = true;
  STAGES.forEach((st, i) => root.append(stageCard(st, p, i)));
  // weekly routine
  root.append(sectionHead("Your weekly routine"));
  const max = Math.max(...ROUTINE.map(r => r[2]));
  root.append(h("div", { class: "card" }, h("p", { class: "card-sub", style: "margin-bottom:6px", text: "About 20 hours a week, until university." }),
    h("ul", { class: "routine" }, ROUTINE.map(([what, when, hrs]) => h("li", null, h("span", null, what, h("small", { text: when })), h("b", { text: hrs + " h" }), h("span", { class: "track" }, h("i", { style: "width:" + Math.round(hrs / max * 100) + "%" })))))));
}
function stageBody(st, x) {
  const b = h("div", { class: "stage-b", data: { k: "sb:" + st.n, enter: "expand" } });
  b.append(h("div", { class: "stage-bar", "aria-hidden": "true" }, h("i", { style: "width:" + (x.steps.length ? Math.round(x.d / x.steps.length * 100) : 0) + "%" })));
  const ul = h("ul", { class: "steps-l" });
  for (const stp of x.steps) ul.append(stepRow(stp, "plan"));
  b.append(ul, h("button", { class: "add-step", type: "button", onclick: () => addStep(st.n) }, h("i", { text: "+" }), "Add a step"));
  if (st.gate) b.append(h("div", { class: "gate" }, h("p", null, h("b", { text: "Gate: " }), st.gate), gateToggle(st.n)));
  return b;
}
function stageCard(st, p, i) {
  const x = p.per[i], open = UI.open[st.n] === true;
  const card = h("section", { class: "stage" + (i === p.current ? " is-now" : "") + (x.complete ? " is-done" : ""), data: { stage: st.n, k: "st:" + st.n } });
  const head = h("button", { class: "stage-h", type: "button", "aria-expanded": String(open) },
    h("span", { class: "stage-n", text: x.complete ? "" : String(st.n) }),
    h("span", null, h("span", { class: "stage-t", text: st.title }), h("span", { class: "stage-w" }, i === p.current ? h("span", { class: "tag", text: "You're here" }) : null, st.when)),
    h("span", { class: "stage-c", text: x.d + "/" + x.steps.length }));
  if (x.complete) $(".stage-n", head).append(svgEl('<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
  // open and close in place: the steps fold out of the header and back into it
  head.addEventListener("click", () => {
    const willOpen = UI.open[st.n] !== true;
    UI.open[st.n] = willOpen; saveUI();
    head.setAttribute("aria-expanded", String(willOpen));
    let b = $(".stage-b", card);
    if (willOpen) {
      if (!b) { b = stageBody(st, progress().per[i]); card.append(b); }
      heightAnim(b, true);
    } else if (b) heightAnim(b, false).then((ok) => { if (ok && UI.open[st.n] !== true && b.isConnected) b.remove(); });
  });
  card.append(head);
  if (open) card.append(stageBody(st, x));
  return card;
}
function updatePlanHeaders() {
  const p = progress();
  $("#planRoot .lt-kicker").textContent = p.done + " of " + p.total + " steps done";
  for (const card of $$("#planRoot .stage")) {
    const i = Number(card.dataset.stage), x = p.per[i];
    const wasNow = card.classList.contains("is-now"), wasDone = card.classList.contains("is-done");
    if (wasNow !== (i === p.current) || wasDone !== x.complete) { setTimeout(() => { if (view === "plan") rerenderKeepScroll(); }, reduced ? 0 : 450); return; }
    $(".stage-c", card).textContent = x.d + "/" + x.steps.length;
    const bar = $(".stage-bar i", card); if (bar) bar.style.width = (x.steps.length ? Math.round(x.d / x.steps.length * 100) : 0) + "%";
  }
}

/* ---------- Numbers ---------- */
function renderNumbers() {
  const root = $("#numRoot"), wkD = mondayOf(today());
  root.replaceChildren(largeTitle("Week of " + dShort(wkD), "Numbers"));
  const box = h("div");
  root.append(segControl("Numbers", [["checkin", "Check-in"], ["tests", "Tests"], ["calc", "Calculators"]], UI.numTab, (k, dir) => {
    UI.numTab = k; saveUI(); history.replaceState(null, "", "#numbers");
    swapContent(box, () => fillNumbers(box), dir);
  }), box);
  fillNumbers(box);
}
function fillNumbers(box) {
  if (UI.numTab === "checkin") renderCheckin(box);
  else if (UI.numTab === "tests") renderTests(box);
  else renderCalcs(box);
}

function tasteSummary() {
  if (!S.tasters.length) return null;
  const by = {};
  for (const t of S.tasters) (by[t.s] = by[t.s] || []).push(t);
  let best = null;
  for (const k of Object.keys(by)) {
    const L = by[k], avg = L.reduce((a, t) => a + t.score, 0) / L.length, buy = L.filter(t => t.buy).length / L.length * 100;
    const r = { s: Number(k), n: L.length, avg, buy };
    if (!best || r.avg > best.avg || (r.avg === best.avg && r.n > best.n)) best = r;
  }
  return best;
}
function cafeAverage() {
  const L = S.contacts.filter(c => c.type === "cafe" && c.status === "Selling" && finite(c.f.week));
  if (!L.length) return null;
  return { n: L.length, avg: L.reduce((a, c) => a + c.f.week, 0) / L.length };
}

function renderCheckin(box) {
  const wk = thisWeek();
  const entry = () => (S.checkins[wk] = S.checkins[wk] || { d: isoOf(today()), v: {}, note: "", done: false });
  const cur = S.checkins[wk] || { v: {}, note: "", done: false };
  const keys = Object.keys(S.checkins).filter(k => k !== wk).sort();
  const last = keys.length ? S.checkins[keys[keys.length - 1]] : null;
  const streak = streakCount();
  box.append(h("div", { class: "wk" }, h("b", { text: cur.done ? "Saved for this week" : "This week's check-in" }), h("span", { text: plural(streak, "week", "weeks") + " in a row" })));

  const sum = h("div", { class: "card" });
  const tally = h("div", { class: "tally" }), one = h("p", { class: "onefix" });
  sum.append(tally, one);
  box.append(sum);

  const cards = [];
  for (const K of KPIS) {
    const st = h("span", { class: "st none" });
    const fix = h("p", { class: "kpi-fix", hidden: true });
    const ins = h("div", { class: "kpi-in" });
    for (const f of K.fields) {
      const inp = h("input", { class: "inp", type: "text", inputmode: "decimal", autocomplete: "off", enterkeyhint: "next", "aria-label": f.label,
        placeholder: last && finite(last.v[f.k]) ? "last: " + fmtNum(last.v[f.k]) : "" });
      inp.value = finite(cur.v[f.k]) ? String(cur.v[f.k]) : "";
      inp.dataset.k = f.k;
      inp.addEventListener("input", () => {
        const raw = inp.value.replace(",", ".").trim(), n = raw === "" ? NaN : Number(raw);
        const e = entry();
        if (raw !== "" && isFinite(n)) e.v[f.k] = Math.min(f.max, Math.max(f.min, n)); else delete e.v[f.k];
        e.d = isoOf(today()); save(); refresh();
      });
      ins.append(h("label", null, h("span", { text: f.label }), h("span", { class: "inp-unit" + (f.pre ? " pre" : "") }, inp, f.unit ? h("em", { text: f.unit }) : null)));
    }
    const card = h("div", { class: "card kpi" }, h("div", { class: "kpi-h" }, h("b", { text: K.name }), st), ins, h("p", { class: "kpi-lines", text: K.lines }));
    // suggestions from other parts of the app
    if (K.id === "taste") {
      const t = tasteSummary();
      if (t) card.append(h("div", { class: "kpi-use" }, h("span", { text: "Taste test, sample " + t.s + ": " + fmtNum(t.avg) + " average, " + Math.round(t.buy) + "% would buy (" + plural(t.n, "taster", "tasters") + ")" }),
        h("button", { type: "button", text: "Use", onclick: () => { const e = entry(); e.v.taste = Math.round(t.avg * 10) / 10; e.v.buy = Math.round(t.buy); save(); rerenderKeepScroll(); } })));
    }
    if (K.id === "cafe") {
      const c = cafeAverage();
      if (c) card.append(h("div", { class: "kpi-use" }, h("span", { text: (c.n === 1 ? "Your selling café sells " : "Your " + c.n + " selling cafés average ") + fmtNum(c.avg) + " a week" }),
        h("button", { type: "button", text: "Use", onclick: () => { const e = entry(); e.v.cafe = Math.round(c.avg * 10) / 10; save(); rerenderKeepScroll(); } })));
    }
    card.append(fix);
    cards.push({ K, st, fix });
    box.append(card);
  }
  const note = h("textarea", { class: "inp", rows: "3", maxlength: "2000", placeholder: "What will you do about it this week?" });
  note.value = cur.note || "";
  note.addEventListener("input", () => { const e = entry(); e.note = note.value; save(); });
  box.append(h("div", { class: "card" }, h("label", { class: "field", style: "margin:0" }, h("span", { text: "This week's plan" }), note)));

  const saveBtn = h("button", { class: "btn", type: "button", text: cur.done ? "Update this week's check-in" : "Save this week's check-in" });
  saveBtn.addEventListener("click", () => {
    const before = streakCount();
    const e = entry(); e.done = true; e.d = isoOf(today()); save(); flush();
    const after = streakCount();
    toast(after > before ? "Saved. " + plural(after, "week", "weeks") + " in a row." : "Check-in saved");
    rerenderKeepScroll();
  });
  box.append(h("div", { class: "save-bar" }, saveBtn));

  function refresh() {
    const v = (S.checkins[wk] || { v: {} }).v;
    let g = 0, y = 0, r = 0, none = 0, pick = null;
    for (const c of cards) {
      const grade = c.K.grade(v), pp = PILL[grade || "none"];
      c.st.className = "st " + pp[0]; c.st.textContent = pp[1];
      if (grade === "fix" || grade === "stop") { c.fix.hidden = false; c.fix.className = "kpi-fix " + grade; c.fix.textContent = (grade === "stop" ? "Do this now: " : "To fix it: ") + c.K.fix; }
      else c.fix.hidden = true;
      if (grade === "go") g++; else if (grade === "fix") y++; else if (grade === "stop") r++; else none++;
      if (grade === "stop" && (!pick || pick.g !== "stop")) pick = { g: grade, K: c.K };
      else if (grade === "fix" && !pick) pick = { g: grade, K: c.K };
    }
    tally.replaceChildren();
    if (g) tally.append(h("span", { class: "st go", text: g + " green" }));
    if (y) tally.append(h("span", { class: "st fix", text: y + " yellow" }));
    if (r) tally.append(h("span", { class: "st stop", text: r + " red" }));
    if (none) tally.append(h("span", { class: "st none", text: none + " not measured" }));
    one.replaceChildren();
    if (pick) one.append(h("b", { text: "This week's one fix: " + pick.K.name.toLowerCase() }), pick.K.fix);
    else if (g) one.append(h("b", { text: "Everything you measured is green" }), "Keep going.");
    else one.append(h("b", { text: "Type in what you can measure" }), "Before launch that's often just the taste test and your months of cash. Leave the rest empty.");
  }
  refresh();
  renderHistory(box);
}

function renderHistory(box) {
  const weeks = Object.keys(S.checkins).sort();
  box.append(sectionHead("Your numbers over time"));
  const withVals = weeks.filter(k => Object.keys(S.checkins[k].v).length);
  if (!withVals.length) {
    box.append(h("div", { class: "card empty" }, h("img", { src: "img/mascot-sm.png", alt: "" }), h("b", { text: "No numbers yet" }), h("p", { text: "Save your first check-in and your trends start here, week by week." })));
    return;
  }
  for (const k of KPI_KEYS) {
    const pts = withVals.map(w => ({ w, y: S.checkins[w].v[k] })).filter(x => finite(x.y)).slice(-12);
    if (!pts.length) continue;
    const meta = CHART_META[k], lastV = pts[pts.length - 1].y, prevV = pts.length > 1 ? pts[pts.length - 2].y : null;
    const fmtV = (x) => meta.unit === "€" ? euro(x) : fmtNum(x) + meta.unit;
    const delta = prevV == null ? "First week logged" : (lastV === prevV ? "Same as the week before" : (lastV > prevV ? "Up " : "Down ") + (meta.unit === "€" ? euro(Math.abs(lastV - prevV)) : fmtNum(Math.abs(lastV - prevV)) + meta.unit) + " on the week before");
    box.append(h("div", { class: "card chart-card", data: { k: "ch:" + k } }, h("div", { class: "chart-h" }, h("b", { text: meta.name }), h("span", { text: fmtV(lastV) })), h("p", { class: "chart-d", text: delta }), lineChart(pts, meta)));
  }
  box.append(sectionHead("Past check-ins"));
  const list = h("div", { class: "list" });
  for (const w of weeks.slice().reverse()) {
    const e = S.checkins[w], v = e.v;
    let g = 0, y = 0, r = 0;
    for (const K of KPIS) { const gr = K.grade(v); if (gr === "go") g++; else if (gr === "fix") y++; else if (gr === "stop") r++; }
    const bits = [g && g + " green", y && y + " yellow", r && r + " red"].filter(Boolean);
    list.append(h("button", { class: "row", type: "button", data: { k: "w:" + w, enter: "expand" }, onclick: () => openWeek(w) },
      h("span", { class: "row-main" }, h("span", { class: "row-title", text: "Week of " + dShort(parseISO(w)) + (w === thisWeek() ? " (this week)" : "") }),
        h("span", { class: "row-sub", text: (bits.length ? bits.join(", ") : "No numbers") + (e.done ? "" : ", not saved") })), svgEl(ICON.chev)));
  }
  box.append(list);
}
function lineChart(pts, meta) {
  const W = 320, H = 112, L = 8, R = 10, T = 10, B = 22;
  const ys = pts.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (meta.band) { if (meta.band[0] != null) { lo = Math.min(lo, meta.band[0]); hi = Math.max(hi, meta.band[0]); } }
  if (hi === lo) { hi += 1; lo -= 1; }
  const padY = (hi - lo) * 0.15; lo -= padY; hi += padY;
  const X = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const g = s("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": meta.name + " over " + plural(pts.length, "week", "weeks") });
  for (let i = 0; i <= 2; i++) { const yy = T + i * (H - T - B) / 2; g.append(s("line", { class: "grid", x1: L, x2: W - R, y1: yy, y2: yy })); }
  if (meta.band) {
    const a = meta.band[0] == null ? lo : Math.max(lo, meta.band[0]), b = meta.band[1] == null ? hi : Math.min(hi, meta.band[1]);
    if (b > a) g.append(s("rect", { class: "band", x: L, width: W - L - R, y: Y(b), height: Y(a) - Y(b) }));
  }
  if (pts.length > 1) g.append(s("path", { class: "ln", d: pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1)).join(" ") }));
  pts.forEach((p, i) => g.append(s("circle", { class: "pt" + (i === pts.length - 1 ? " last" : ""), cx: X(i), cy: Y(p.y), r: 3.6 })));
  const lab = (i, anchor) => { const t = s("text", { x: X(i), y: H - 6, "text-anchor": anchor }); t.textContent = dShort(parseISO(pts[i].w)); g.append(t); };
  if (pts.length === 1) lab(0, "middle"); else { lab(0, "start"); lab(pts.length - 1, "end"); }
  return g;
}
function openWeek(w) {
  const e = S.checkins[w]; if (!e) return;
  const body = h("div");
  const kv = h("ul", { class: "kv" });
  for (const K of KPIS) for (const f of K.fields) {
    const v = e.v[f.k];
    kv.append(h("li", null, h("span", { text: f.label }), h("b", { text: finite(v) ? (f.unit === "€" ? euro(v) : fmtNum(v) + (f.unit === "months" ? " months" : f.unit)) : "–" })));
  }
  body.append(kv);
  if (e.note) body.append(h("div", { class: "field" }, h("span", { text: "Plan for that week" }), h("p", { style: "margin:0", text: e.note })));
  if (w === thisWeek()) body.append(h("p", { class: "hint", text: "Edit this week's numbers on the check-in screen." }));
  const del = h("button", { class: "btn danger", type: "button", text: "Delete this week" });
  armed(del, "Delete this week", "Tap again to delete", () => { delete S.checkins[w]; save(); closeSheet(); toast("Week deleted"); rerenderKeepScroll(); });
  body.append(h("div", { class: "danger-zone" }, del));
  openSheet("Week of " + dShort(parseISO(w)), body);
}

/* tests: blind taste test + kitchen tests */
let tpick = { score: 0, buy: null };
function renderTests(box) {
  // blind taste test
  const card = h("div", { class: "card" });
  card.append(h("p", { class: "card-title", text: "Blind taste test" }), h("p", { class: "card-sub", text: "Goal: 30–50 tasters per sample. Pass: an average of 7+ and 6 in 10 saying they'd buy at €29.90." }));
  const chips = h("div", { class: "chips", style: "margin:14px 0 4px" });
  for (let i = 1; i <= 5; i++) chips.append(h("button", { class: "chip sm", type: "button", "aria-pressed": String(UI.tSample === i), text: "Sample " + i, onclick: () => { UI.tSample = i; saveUI(); rerenderKeepScroll(); } }));
  card.append(chips, h("p", { class: "hint", style: "margin:2px 0 0", text: "Use one sample number per manufacturer or recipe you're testing." }));
  const scores = h("div", { class: "scores", role: "group", "aria-label": "Taste score" });
  const yn = h("div", { class: "yn", role: "group", "aria-label": "Would they buy it at €29.90?" });
  const who = h("input", { class: "inp", type: "text", maxlength: "24", placeholder: "Name or initials (optional)", autocomplete: "off" });
  const add = h("button", { class: "btn", type: "button", text: "Add taster" });
  const sync = () => {
    for (const b of $$("button", scores)) b.setAttribute("aria-pressed", String(Number(b.dataset.v) === tpick.score));
    for (const b of $$("button", yn)) b.setAttribute("aria-pressed", String(tpick.buy !== null && (b.dataset.v === "yes") === tpick.buy));
    add.disabled = !(tpick.score && tpick.buy !== null);
  };
  for (let i = 1; i <= 10; i++) scores.append(h("button", { type: "button", data: { v: i }, text: String(i), onclick: () => { tpick.score = i; sync(); } }));
  yn.append(h("button", { type: "button", data: { v: "yes" }, text: "Would buy", onclick: () => { tpick.buy = true; sync(); } }), h("button", { type: "button", data: { v: "no" }, text: "Wouldn't buy", onclick: () => { tpick.buy = false; sync(); } }));
  add.addEventListener("click", () => {
    if (!(tpick.score && tpick.buy !== null)) return;
    S.tasters.push({ id: uid(), s: UI.tSample, score: tpick.score, buy: tpick.buy, d: isoOf(today()), who: who.value.trim().slice(0, 24) });
    save(); const n = S.tasters.filter(t => t.s === UI.tSample).length;
    tpick = { score: 0, buy: null }; toast("Taster " + n + " added to sample " + UI.tSample); rerenderKeepScroll();
  });
  card.append(h("p", { style: "margin:16px 0 0;font-weight:600", text: "How did it taste?" }), scores, h("p", { style: "margin:0 0 8px;font-weight:600", text: "Would they buy it at €29.90?" }), yn, h("div", { class: "field" }, who), add);
  sync();
  box.append(card);

  // results for this sample
  const L = S.tasters.filter(t => t.s === UI.tSample);
  const res = h("div", { class: "card", data: { k: "t-res" } });
  res.append(h("p", { class: "card-title", text: "Sample " + UI.tSample }));
  if (!L.length) res.append(h("p", { class: "card-sub", text: "No tasters yet. Add them as they taste, it takes two taps each." }));
  else {
    const avg = L.reduce((a, t) => a + t.score, 0) / L.length, buy = L.filter(t => t.buy).length / L.length * 100;
    const nB = h("b"), aB = h("b"), bB = h("b"), sk = ":" + UI.tSample;
    counter(nB, "tn" + sk, L.length, (v) => String(Math.round(v)), { dur: 450 });
    counter(aB, "ta" + sk, avg, fmtNum, { dur: 600 });
    counter(bB, "tb" + sk, buy, (v) => Math.round(v) + "%", { dur: 600 });
    res.append(h("div", { class: "stats" },
      h("div", { class: "stat" }, nB, h("small", { text: L.length === 1 ? "taster" : "tasters" })),
      h("div", { class: "stat" }, aB, h("small", { text: "average taste" })),
      h("div", { class: "stat" }, bB, h("small", { text: "would buy" }))));
    const tasteOK = avg >= 7, buyOK = buy >= 60, enough = L.length >= 30;
    let cls, msg;
    if (tasteOK && buyOK && enough) { cls = "go"; msg = "Passed: 7+ average and 6 in 10 would buy, from " + L.length + " tasters."; }
    else if (!enough) { cls = tasteOK && buyOK ? "go" : (avg < 6 ? "stop" : "fix"); msg = "On track for " + (tasteOK && buyOK ? "a pass" : "a fail") + " so far. " + plural(30 - L.length, "more taster", "more tasters") + " to reach 30."; }
    else { cls = avg < 6 ? "stop" : "fix"; msg = "Not passed: " + (tasteOK ? "" : "taste is under 7") + (!tasteOK && !buyOK ? " and " : "") + (buyOK ? "" : "fewer than 6 in 10 would buy") + ". Back to the recipe or the manufacturer."; }
    res.append(h("div", { class: "verdict " + cls }, msg));
    const list = h("div", { style: "margin-top:12px" });
    for (const t of L.slice().reverse()) {
      const x = h("button", { class: "x", type: "button", "aria-label": "Delete this taster", html: ICON.x });
      let armedT = 0;
      x.addEventListener("click", () => {
        if (!x.classList.contains("armed")) { x.classList.add("armed"); x.style.color = "var(--stop)"; x.setAttribute("aria-label", "Tap again to delete"); armedT = setTimeout(() => { x.classList.remove("armed"); x.style.color = ""; }, 3000); return; }
        clearTimeout(armedT); S.tasters = S.tasters.filter(z => z.id !== t.id); save(); toast("Taster deleted");
        foldAway(x.closest(".mini-row")).then(() => rerenderKeepScroll());
      });
      list.append(h("div", { class: "mini-row", data: { k: "tr:" + t.id, enter: "expand" } }, h("span", { class: "score", text: String(t.score) }),
        h("span", { class: "row-main" }, h("span", { class: "row-title", style: "font-weight:600", text: (t.who || "Taster") + (t.buy ? ", would buy" : ", wouldn't buy") }), h("span", { class: "row-sub", text: dShort(parseISO(t.d)) })), x));
    }
    res.append(list);
  }
  box.append(res);
  // compare samples
  const used = [...new Set(S.tasters.map(t => t.s))].sort();
  if (used.length > 1) {
    const cmp = h("div", { class: "list" });
    for (const k of used) {
      const M = S.tasters.filter(t => t.s === k), avg = M.reduce((a, t) => a + t.score, 0) / M.length, buy = M.filter(t => t.buy).length / M.length * 100;
      cmp.append(h("button", { class: "row", type: "button", data: { k: "cmp:" + k }, onclick: () => { UI.tSample = k; saveUI(); rerenderKeepScroll(); } },
        h("span", { class: "av", text: String(k) }), h("span", { class: "row-main" }, h("span", { class: "row-title", text: "Sample " + k }), h("span", { class: "row-sub", text: plural(M.length, "taster", "tasters") + ", " + fmtNum(avg) + " average, " + Math.round(buy) + "% would buy" })), svgEl(ICON.chev)));
    }
    box.append(sectionHead("All samples"), cmp);
  }

  // kitchen tests
  box.append(sectionHead("Kitchen tests"), h("p", { class: "hint", style: "margin:-4px 4px 12px", text: "Four versions, A to D. The leader (my rule): no clumps, still foamy after 5 minutes, then the best taste. Ties go to the taller foam." }));
  const leadV = kitchenLeader();
  const testBody = (T) => {
    const t = S.tests[T.v] || {};
    const b = h("div", { class: "test-b", data: { k: "kb:" + T.v } });
    b.append(h("p", { class: "hint", style: "margin:0 0 6px", text: T.why + "." }));
    const num = (f, label, unit, max) => {
      const inp = h("input", { class: "inp", type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": label, placeholder: unit });
      inp.value = finite(t[f]) ? String(t[f]) : "";
      inp.addEventListener("input", () => {
        const raw = inp.value.replace(",", ".").trim(), n = raw === "" ? NaN : Number(raw);
        const o = Object.assign({}, S.tests[T.v]);
        if (raw !== "" && isFinite(n)) o[f] = Math.min(max, Math.max(0, n)); else delete o[f];
        if (Object.keys(o).length) S.tests[T.v] = o; else delete S.tests[T.v];
        save();
      });
      inp.addEventListener("change", () => rerenderKeepScroll());
      return h("div", { class: "t-field" }, h("span", { text: label }), inp);
    };
    b.append(num("h", "Foam height after 20 seconds", "cm", 30));
    for (const [f, q] of KYN) {
      const grp = h("div", { class: "ynmini", role: "group", "aria-label": q });
      for (const [val, txt] of [[true, "Yes"], [false, "No"]]) grp.append(h("button", { type: "button", "aria-pressed": String(t[f] === val), text: txt, onclick: () => {
        const o = Object.assign({}, S.tests[T.v]); if (o[f] === val) delete o[f]; else o[f] = val;
        if (Object.keys(o).length) S.tests[T.v] = o; else delete S.tests[T.v]; save(); rerenderKeepScroll(); } }));
      b.append(h("div", { class: "t-field" }, h("span", { text: q }), grp));
    }
    b.append(num("taste", "Taste, from 1 to 10", "/10", 10));
    return b;
  };
  for (const T of KTESTS) {
    const t = S.tests[T.v] || {};
    const bits = [];
    if (t.taste !== undefined) bits.push("taste " + t.taste + "/10");
    if (t.h !== undefined) bits.push(t.h + " cm of foam");
    if (t.clumps === true) bits.push("clumps");
    if (t.s5 === false) bits.push("foam gone by 5 minutes");
    const sum = bits.length ? bits.join(", ") : (Object.keys(t).length ? "Partly logged" : "Not tested yet");
    const isOpen = !!UI["k" + T.v];
    const card = h("div", { class: "card test" + (leadV === T.v ? " lead" : ""), data: { k: "k:" + T.v } });
    const head = h("button", { class: "test-h", type: "button", "aria-expanded": String(isOpen), onclick: () => {
        const willOpen = !UI["k" + T.v]; UI["k" + T.v] = willOpen; saveUI();
        head.setAttribute("aria-expanded", String(willOpen));
        let b = $(".test-b", card);
        if (willOpen) { if (!b) { b = testBody(T); card.append(b); } heightAnim(b, true); }
        else if (b) heightAnim(b, false).then((ok) => { if (ok && !UI["k" + T.v] && b.isConnected) b.remove(); });
      } },
      h("span", { class: "test-v", text: T.v }),
      h("span", null, h("span", { class: "row-title", text: T.what }), h("span", { class: "row-sub", text: (leadV === T.v ? "Leading. " : "") + sum.charAt(0).toUpperCase() + sum.slice(1) })),
      svgEl(ICON.chev));
    card.append(head);
    if (isOpen) card.append(testBody(T));
    box.append(card);
  }
}
function kitchenLeader() {
  const c = KTESTS.filter(T => { const t = S.tests[T.v] || {}; return t.taste !== undefined && t.clumps !== true && t.s5 !== false; })
    .sort((a, b) => { const x = S.tests[a.v], y = S.tests[b.v]; return (y.taste - x.taste) || ((y.h || 0) - (x.h || 0)) || ((y.s10 === true) - (x.s10 === true)); });
  return c.length ? c[0].v : null;
}

/* calculators */
const COST = { gramsWPI: 340, other: 0.60, markup: 1.30, pack: 1.40, feePct: 0.021, feeFix: 0.30 };
const pouchCost = (whey) => (whey * COST.gramsWPI / 1000 + COST.other) * COST.markup + COST.pack;
function calcOrder(c) {
  const gross = c.price * c.units * (1 - c.disc / 100), net = gross / (1 + c.vat / 100), unit = pouchCost(c.whey);
  const product = unit * c.units, fee = gross * COST.feePct + COST.feeFix, kept = net - product - fee - c.ship;
  return { gross, net, vat: gross - net, unit, product, fee, ship: c.ship, kept };
}
const PRESETS = { old: { price: 24.9, units: 1, disc: 0 }, single: { price: 29.9, units: 1, disc: 0 }, double: { price: 29.9, units: 2, disc: 0 }, sub: { price: 29.9, units: 2, disc: 10 } };
function fillRange(el) { const p = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100; el.style.setProperty("--p", p + "%"); }
function slider(label, attrs, onInput) {
  const out = h("output");
  const inp = h("input", Object.assign({ type: "range", "aria-label": label }, attrs));
  inp.addEventListener("input", () => { stopGlide(inp); fillRange(inp); onInput(Number(inp.value), out); });
  const wrap = h("div", { class: "ctrl" }, h("div", { class: "ctrl-h" }, h("span", { text: label }), out), inp);
  return { wrap, inp, out };
}
function chipGroup(label, options, current, onPick) {
  const g = h("div", { class: "chips", role: "group", "aria-label": label, style: "margin-bottom:6px" });
  const btns = options.map(([val, txt]) => h("button", { class: "chip sm", type: "button", "aria-pressed": String(val === current), data: { val: String(val) }, text: txt, onclick: () => onPick(val) }));
  g.append(...btns);
  g.set = (v) => { for (const b of btns) b.setAttribute("aria-pressed", String(v != null && b.dataset.val === String(v))); };
  return g;
}
const CALCS = ["order", "budget", "value", "round"];
function renderCalcs(box) {
  const card = h("div", { class: "card" }), inner = h("div");
  card.append(inner);
  const pick = chipGroup("Calculator", [["order", "Per order"], ["budget", "Budget"], ["value", "Sale value"], ["round", "Investor round"]], UI.calcTab, (v) => {
    if (v === UI.calcTab) return;
    const dir = CALCS.indexOf(v) > CALCS.indexOf(UI.calcTab) ? 1 : -1;
    UI.calcTab = v; saveUI(); history.replaceState(null, "", "#numbers"); pick.set(v);
    swapContent(inner, () => fillCalc(inner), dir, card);
  });
  box.append(pick, card);
  fillCalc(inner);
}
function fillCalc(card) {
  if (UI.calcTab === "order") calcOrderCard(card);
  else if (UI.calcTab === "budget") calcBudgetCard(card);
  else if (UI.calcTab === "value") calcValueCard(card);
  else calcRoundCard(card);
}
function calcOrderCard(card) {
  const c = UI.calc;
  let target = null; // the example being glided to, so its chip lights up straight away
  card.append(h("p", { class: "card-title", text: "What you keep per order" }));
  const presets = chipGroup("Examples", [["old", "€24.90 (old)"], ["single", "€29.90"], ["double", "2 × €29.90"], ["sub", "Subscription"]], null, (k) => {
    const pr = PRESETS[k];
    target = k; presets.set(k);
    UI.calc.units = pr.units; UI.calc.disc = pr.disc;
    glide(price.inp, pr.price, (v, landed) => { UI.calc.price = landed ? pr.price : Math.round(v * 100) / 100; if (landed) target = null; upd(); });
  });
  card.append(h("p", { class: "hint", style: "margin:4px 0 8px", text: "Tap an example, then adjust. Subscription means 2 pouches at 10% off with free delivery." }), presets);
  const big = h("span", { class: "big num" }), pill = h("span", { class: "st" }), per = h("p", { class: "hint", style: "margin:4px 0 0" });
  const stack = h("div", { class: "stack", "aria-hidden": "true" }), legend = h("ul", { class: "legend" });
  const bars = [0, 1, 2, 3, 4].map(() => h("span", { style: "width:0%" }));
  stack.append(...bars);
  card.append(h("div", { class: "calc-out" }, big, pill), per, stack, legend);
  const costs = h("ol", { class: "cost-l" }), cac = h("p", { class: "hint" });
  const price = slider("Price per pouch", { min: "19.9", max: "39.9", step: "1", value: String(c.price) }, (v) => { target = null; UI.calc.price = Math.round(v * 100) / 100; upd(); });
  const unitsG = chipGroup("Pouches per order", [[1, "1"], [2, "2"], [3, "3"]], c.units, (v) => { target = null; UI.calc.units = v; upd(); });
  const discG = chipGroup("Discount", [[0, "None"], [10, "10%"], [15, "15%"], [20, "20%"], [25, "25%"]], c.disc, (v) => { target = null; UI.calc.disc = v; upd(); });
  const vatG = chipGroup("VAT rate", [[24, "24%"], [13, "13%"]], c.vat, (v) => { UI.calc.vat = v; upd(); });
  const units = h("div", { class: "ctrl" }, h("div", { class: "ctrl-h" }, h("span", { text: "Pouches per order" })), unitsG);
  const disc = h("div", { class: "ctrl" }, h("div", { class: "ctrl-h" }, h("span", { text: "Discount" })), discG);
  const vat = h("div", { class: "ctrl" }, h("div", { class: "ctrl-h" }, h("span", { text: "VAT rate" })), vatG, h("p", { class: "hint", style: "margin:0", text: "Not settled yet. Your accountant decides which applies." }));
  const whey = slider("Whey isolate price", { min: "15", max: "40", step: "0.5", value: String(c.whey) }, (v) => { UI.calc.whey = v; upd(); });
  const ship = slider("Shipping and box, per order", { min: "0", max: "6", step: "0.25", value: String(c.ship) }, (v) => { UI.calc.ship = v; upd(); });
  const serving = h("p", { class: "hint", style: "margin:0 0 6px" });
  price.wrap.append(serving);
  whey.wrap.append(h("p", { class: "hint", style: "margin:0 0 6px", text: "€27 a kilo is the 2026 record range. Whey is most of what a pouch costs." }));
  ship.wrap.append(h("p", { class: "hint", style: "margin:0 0 6px", text: "€3.50 until you get a courier quote from BOX NOW or ACS." }));
  card.append(price.wrap, units, disc, vat, whey.wrap, ship.wrap, h("details", { class: "more" }, h("summary", { text: "What one pouch costs you" }), costs, h("p", { class: "hint", html: 'My estimate until manufacturers quote. Card fees on Shopify Payments run about 2.1% + €0.30 per order in Germany (<a href="https://qualimero.com/blog/shopify-gebuehren" target="_blank" rel="noopener">Qualimero</a>).' })), cac);
  [price.inp, whey.inp, ship.inp].forEach(fillRange);
  function upd() {
    saveUI();
    const c = UI.calc, o = calcOrder(c);
    price.out.textContent = euro(c.price); whey.out.textContent = euro(c.whey) + " a kilo"; ship.out.textContent = euro(c.ship);
    serving.textContent = "That's " + euro(c.price * (1 - c.disc / 100) / 20) + " a serving" + (c.disc ? " after the discount" : "") + ". A café protein freddo costs €4.60.";
    counter(big, "kept", o.kept, euro, { dur: 420 });
    const g = o.kept >= 7 ? "go" : o.kept >= 4 ? "fix" : "stop";
    pill.className = "st " + g; pill.textContent = g === "go" ? "Green: €7+ an order" : g === "fix" ? "Yellow: €4 to €7" : o.kept < 0 ? "Red: you lose money" : "Red: under €4";
    per.textContent = (o.kept < 0 ? "Lost" : "Kept") + " on an order of " + plural(c.units, "pouch", "pouches") + ", before ads." + (c.units > 1 ? " That's " + euro(o.kept / c.units) + " a pouch." : "");
    const parts = [["VAT", o.vat, "var(--latte)"], ["Product", o.product, "var(--brown)"], ["Card fee", o.fee, "var(--faint)"], ["Shipping and box", o.ship, "#8FB3B0"], [o.kept < 0 ? "You lose" : "You keep", o.kept, "var(--go)"]];
    const base = Math.max(o.gross, o.vat + o.product + o.fee + o.ship);
    parts.forEach(([, v, col], i) => { bars[i].style.width = (Math.max(0, v) / base * 100).toFixed(2) + "%"; bars[i].style.background = col; });
    legend.replaceChildren(
      h("li", null, h("i", { style: "background:transparent" }), h("span", { text: "The customer pays" }), h("b", { text: euro(o.gross) })),
      ...parts.slice(0, 4).map(([l, v, col]) => h("li", null, h("i", { style: "background:" + col }), h("span", { text: l }), h("b", { text: euro(v) }))),
      h("li", { class: "total" }, h("i", { style: "background:var(--go)" }), h("span", { text: parts[4][0] }), h("b", { text: euro(o.kept) })));
    const wpi = c.whey * COST.gramsWPI / 1000, ing = wpi + COST.other;
    costs.replaceChildren(
      h("li", { text: "Whey isolate: 340g at " + euro(c.whey) + " a kilo = " + euro(wpi) + "." }),
      h("li", { text: "Other ingredients (flavour, sweetener, phosphate, gum): about " + euro(COST.other) + "." }),
      h("li", { text: "Manufacturer's blending, filling and margin: about +30%, so " + euro(ing * (COST.markup - 1)) + "." }),
      h("li", { text: "Printed pouch, scoop and delivery to you: about " + euro(COST.pack) + "." }),
      h("li", { text: "Total: about " + euro(o.unit) + " a pouch." }));
    unitsG.set(c.units); discG.set(c.disc); vatG.set(c.vat);
    if (target) presets.set(target);
    else presets.set(Object.keys(PRESETS).find(k => { const pr = PRESETS[k]; return Math.abs(pr.price - c.price) < 0.001 && pr.units === c.units && pr.disc === c.disc; }) || null);
    cac.textContent = o.kept > 0 ? "With these numbers: spend at most " + euro(o.kept) + " to win a customer today, and up to about " + euro(o.kept * 3) + " once 30%+ reorder." : "With these numbers you lose money on every order, so don't pay anything to win customers yet.";
  }
  upd();
}
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
function calcBudgetCard(card) {
  // switching budgets keeps the rows: the bars grow or shrink and the amounts roll
  const rows = BUDGET.map((r) => { const amt = h("b"), note = h("small"), bar = h("i", { style: "width:0%" }); return { r, amt, note, bar, li: h("li", { class: r.spare ? "spare" : null }, h("span", null, r.what, note), amt, h("span", { class: "track" }, bar)) }; });
  const draw = () => {
    const big = UI.budget === "15", total = big ? 15000 : 3000;
    rows.forEach((x, i) => {
      const a = big ? x.r.b : x.r.a, n = big ? x.r.bn : x.r.an;
      counter(x.amt, "bud" + i, a, (v) => "€" + Math.round(v).toLocaleString("en-US"), { dur: 520 });
      x.note.textContent = n || ""; x.note.hidden = !n;
      x.bar.style.width = (a / total * 100) + "%";
    });
  };
  draw();
  const seg = segControl("Budget", [["3", "€3k: prove it"], ["15", "€15k: launch properly"]], UI.budget, (k) => { UI.budget = k; saveUI(); draw(); });
  seg.style.margin = "12px 0 6px";
  card.append(h("p", { class: "card-title", text: "How to spend the first 6 months" }), seg,
    h("ul", { class: "bars" }, rows.map(x => x.li)),
    h("p", { class: "hint", html: 'Only the trademark fees are official prices (<a href="https://www.dury.de/en/european-tradmark-law/1077-eu-trademark-registration-2026-a-complete-guide-for-international-businesses" target="_blank" rel="noopener">EUIPO fees</a>). Everything else is my estimate, so swap in real quotes as you get them. With €3k you can\'t produce stock yet, but you can prove people want Fowm and take pre-orders. Around €8k is the smallest real launch (about 250 pouches).' }));
}
const salesFrom = (v) => roundNice(50000 * Math.pow(10000, v / 1000));
const sliderFromSales = (x) => Math.round(1000 * Math.log10(x / 50000) / 4);
function calcValueCard(card) {
  const v = UI.val;
  card.append(h("p", { class: "card-title", text: "What could Fowm sell for?" }));
  const big = h("span", { class: "big md num" }), how = h("p", { class: "hint", style: "margin:6px 0 0" }), share = h("p", { class: "hint", style: "margin:4px 0 0" });
  card.append(h("div", { class: "calc-out" }, big), how, share);
  let target = null; // the quick pick being glided to
  const sales = slider("Yearly sales", { min: "0", max: "1000", step: "1", value: String(v.s) }, (x) => { target = null; UI.val.s = x; upd(); });
  const quick = chipGroup("Quick picks", [[250000, "€250k"], [1000000, "€1M"], [10000000, "€10M"], [100000000, "€100M"]], null, (x) => {
    target = x; quick.set(x);
    glide(sales.inp, sliderFromSales(x), (v, landed) => { UI.val.s = Math.round(v); if (landed) target = null; upd(); });
  });
  sales.wrap.append(quick);
  const margin = slider("Profit, as a share of sales", { min: "0", max: "40", step: "1", value: String(v.m) }, (x) => { UI.val.m = x; upd(); });
  margin.wrap.append(h("p", { class: "hint", style: "margin:0 0 6px", text: "15% is my starting guess. Use your real number once your accountant has one." }));
  const hotInp = h("input", { class: "vh", type: "checkbox" }); hotInp.checked = v.hot;
  hotInp.addEventListener("change", () => { UI.val.hot = hotInp.checked; upd(); });
  const hotHint = h("p", { class: "hint", style: "margin:6px 0 6px" });
  const hot = h("div", { class: "ctrl" }, h("label", { class: "switch" }, h("span", { text: "Several giants want to buy it" }), hotInp, h("i", { "aria-hidden": "true" })), hotHint);
  const own = slider("How much of Fowm you own", { min: "5", max: "100", step: "1", value: String(v.own) }, (x) => { UI.val.own = x; upd(); });
  own.wrap.append(h("p", { class: "hint", style: "margin:0 0 6px", text: "Lower this once investors own a part (try the investor round)." }));
  card.append(sales.wrap, margin.wrap, hot, own.wrap);
  [sales.inp, margin.inp, own.inp].forEach(fillRange);
  function upd() {
    saveUI();
    const v = UI.val, s = salesFrom(v.s), hotOK = s >= 15e6, isHot = v.hot && hotOK, profit = s * v.m / 100;
    hotInp.disabled = !hotOK; hotInp.checked = isHot;
    hotHint.textContent = hotOK ? "Bidding wars push big, fast-growing brands to 3–4 × yearly sales, or more." : "Bidding wars happen for big, fast-growing brands, so this only counts from €15M of sales a year.";
    let lo, hi, txt;
    if (isHot) { lo = s * 3; hi = s * 4; txt = "A hot brand with several giants bidding sells for about 3–4 × yearly sales, or more."; }
    else if (s < 5e6) { lo = profit * 2.5; hi = profit * 4.5; txt = "A small brand run by you sells for 2.5–4.5 × yearly owner profit. Here that profit is " + shortEuro(profit) + " a year."; }
    else if (s < 15e6) { lo = profit * 3.5; hi = profit * 5.5; txt = "A medium brand with a team sells for 3.5–5.5 × yearly profit. Here that profit is " + shortEuro(profit) + " a year."; }
    else { lo = s * 0.5; hi = s * 1.9; txt = "A big, growing brand bought by a food giant sells for 0.5–1.9 × yearly sales."; }
    sales.out.textContent = shortEuro(s); margin.out.textContent = v.m + "%"; own.out.textContent = v.own + "%";
    if (target) quick.set(target);
    else quick.set([250000, 1000000, 10000000, 100000000].find(x => sliderFromSales(x) === v.s) || null);
    if (lo <= 0) { big.textContent = "€0"; how.textContent = "With no profit, a small brand is worth very little to a buyer."; share.textContent = ""; }
    else { big.textContent = shortEuro(lo) + " to " + shortEuro(hi); how.textContent = txt; share.textContent = "Your " + v.own + "%: " + shortEuro(lo * v.own / 100) + " to " + shortEuro(hi * v.own / 100) + ", before tax (see Selling the company in the Guide)."; }
  }
  upd();
}
const preFrom = (v) => roundNice(250000 * Math.pow(80, v / 1000));
function calcRoundCard(card) {
  const d = UI.dil;
  card.append(h("p", { class: "card-title", text: "Try an investor round" }));
  const big = h("span", { class: "big num" }), pill = h("span", { class: "st" }), txt = h("p", { class: "hint", style: "margin:6px 0 0" });
  card.append(h("div", { class: "calc-out" }, big, pill), txt);
  const raise = slider("Money you raise", { min: "25000", max: "2000000", step: "25000", value: String(d.raise) }, (x) => { UI.dil.raise = x; upd(); });
  const pre = slider("What Fowm is worth before the money", { min: "0", max: "1000", step: "1", value: String(d.pre) }, (x) => { UI.dil.pre = x; upd(); });
  const own = slider("How much you own today", { min: "10", max: "100", step: "1", value: String(d.own) }, (x) => { UI.dil.own = x; upd(); });
  card.append(raise.wrap, pre.wrap, own.wrap, h("p", { class: "hint", text: "Never more than 20% in one round. Keep more than half the company until a big round." }));
  [raise.inp, pre.inp, own.inp].forEach(fillRange);
  function upd() {
    saveUI();
    const d = UI.dil, p = preFrom(d.pre), sh = d.raise / (p + d.raise), after = d.own * (1 - sh), sp = String(Math.round(sh * 1000) / 10);
    raise.out.textContent = shortEuro(d.raise); pre.out.textContent = shortEuro(p); own.out.textContent = d.own + "%";
    counter(big, "round", Math.round(sh * 1000) / 10, (x) => String(Math.round(x * 10) / 10) + "%", { dur: 420 });
    pill.className = "st " + (sh > 0.2 ? "stop" : "go"); pill.textContent = sh > 0.2 ? "More than 20%" : "20% or less";
    txt.textContent = "Investors get " + sp + "% of Fowm for " + shortEuro(d.raise) + ", because " + shortEuro(d.raise) + " ÷ " + shortEuro(p + d.raise) + " = " + sp + "%. You go from " + d.own + "% to " + String(Math.round(after * 10) / 10) + "%." + (sh > 0.2 ? " Raise less, or wait until Fowm is worth more." : "");
  }
  upd();
}

/* ---------- Contacts ---------- */
function contactSub(c) {
  const f = c.f;
  if (c.type === "maker") return finite(f.p1000) ? euro(f.p1000) + "/kg at 1,000 kg" + (finite(f.moq) ? ", minimum " + f.moq.toLocaleString("en-US") + " kg" : "") : (f.where || f.email || "No quote yet");
  if (c.type === "cafe") return finite(f.week) ? fmtNum(f.week) + " protein freddos a week" + (f.area ? ", " + f.area : "") : (f.area || f.person || "");
  return [f.handle, f.code ? "code " + f.code : null, finite(f.orders) ? plural(f.orders, "order", "orders") : null].filter(Boolean).join(", ") || (f.platform || "");
}
const initials = (n) => n.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("") || "?";
function renderContacts() {
  const root = $("#conRoot");
  const add = h("button", { class: "round-btn", type: "button", "aria-label": "Add a " + CTYPES[UI.conTab].one, html: ICON.plus, onclick: () => editContact(null, UI.conTab) });
  root.replaceChildren(largeTitle(plural(S.contacts.length, "contact", "contacts"), "Contacts", [add]));
  const box = h("div");
  root.append(segControl("Contact type", Object.entries(CTYPES).map(([k, t]) => [k, t.label]), UI.conTab, (k, dir) => {
    UI.conTab = k; saveUI(); add.setAttribute("aria-label", "Add a " + CTYPES[k].one);
    swapContent(box, () => fillContacts(box), dir);
  }), box);
  fillContacts(box);
}
function fillContacts(box) {
  const T = CTYPES[UI.conTab], L = S.contacts.filter(c => c.type === UI.conTab);
  if (!L.length) {
    box.append(h("div", { class: "card empty", data: { k: "c-empty:" + UI.conTab } }, h("img", { src: "img/mascot-sm.png", alt: "" }), h("b", { text: "No " + T.label.toLowerCase() + " yet" }), h("p", { text: T.empty }),
      h("button", { class: "btn small", type: "button", text: "Add a " + T.one, onclick: () => editContact(null, UI.conTab) })));
    return;
  }
  const sum = h("div", { class: "sum", data: { k: "c-sum" } });
  for (const st of T.statuses) { const n = L.filter(c => c.status === st).length; if (n) sum.append(h("span", { text: n + " " + st.toLowerCase() })); }
  if (UI.conTab === "maker") { const q = L.filter(c => finite(c.f.p1000)).sort((a, b) => a.f.p1000 - b.f.p1000)[0]; if (q) sum.append(h("span", { text: "Best: " + euro(q.f.p1000) + "/kg, " + q.name })); }
  if (UI.conTab === "cafe") { const a = cafeAverage(); if (a) sum.append(h("span", { text: (a.n === 1 ? "Selling café: " : "Selling cafés average ") + fmtNum(a.avg) + " a week" })); }
  if (UI.conTab === "creator") { const o = L.reduce((a, c) => a + (finite(c.f.orders) ? c.f.orders : 0), 0); if (o) sum.append(h("span", { text: plural(o, "order", "orders") + " from codes" })); }
  box.append(sum);
  for (const st of T.statuses) {
    const M = L.filter(c => c.status === st).sort((a, b) => a.name.localeCompare(b.name));
    if (!M.length) continue;
    box.append(h("p", { class: "grp", text: st, data: { k: "g:" + st, enter: "expand" } }));
    box.append(h("div", { class: "list", data: { k: "gl:" + st, enter: "expand" } }, M.map(c => h("button", { class: "row", type: "button", data: { k: "c:" + c.id, enter: "expand" }, onclick: () => editContact(c.id) },
      h("span", { class: "av", text: initials(c.name) }), h("span", { class: "row-main" }, h("span", { class: "row-title", text: c.name }), h("span", { class: "row-sub", text: contactSub(c) || st })), svgEl(ICON.chev)))));
  }
}
function editContact(id, type) {
  const existing = id ? S.contacts.find(c => c.id === id) : null;
  const T = CTYPES[existing ? existing.type : type];
  const d = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), type, name: "", status: T.statuses[0], f: type === "creator" ? { comm: 10 } : {}, note: "", t: "" };
  const body = h("div");
  if (existing && (d.f.email || d.f.phone)) {
    const acts = h("div", { class: "c-acts" });
    if (d.f.email) acts.append(h("a", { class: "btn soft small", href: "mailto:" + encodeURIComponent(d.f.email).replace(/%40/g, "@"), text: "Email" }));
    if (d.f.phone) acts.append(h("a", { class: "btn soft small", href: "tel:" + d.f.phone.replace(/[^0-9+]/g, ""), text: "Call" }));
    body.append(acts);
  }
  const name = h("input", { class: "inp", type: "text", maxlength: "80", placeholder: "Name", autocomplete: "off", id: "cName" });
  name.value = d.name;
  body.append(h("label", { class: "field" }, h("span", { text: "Name" }), name));
  const sts = h("div", { class: "statuses", role: "group", "aria-label": "Status" });
  const stBtns = T.statuses.map(st => h("button", { type: "button", "aria-pressed": String(d.status === st), text: st, onclick: () => { d.status = st; stBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(T.statuses[i] === d.status))); } }));
  sts.append(...stBtns);
  body.append(h("div", { class: "field" }, h("span", { text: "Status" }), sts));
  for (const fd of T.fields) {
    if (fd.type === "yn" || fd.type === "choice") {
      const opts = fd.type === "yn" ? [[true, "Yes"], [false, "No"]] : fd.options.map(o => [o, o]);
      const g = h("div", { class: "statuses", role: "group", "aria-label": fd.label });
      const btns = opts.map(([v, t]) => h("button", { type: "button", "aria-pressed": String(d.f[fd.k] === v), text: t, onclick: () => {
        if (d.f[fd.k] === v) delete d.f[fd.k]; else d.f[fd.k] = v;
        btns.forEach((b, i) => b.setAttribute("aria-pressed", String(d.f[fd.k] === opts[i][0])));
      } }));
      g.append(...btns);
      body.append(h("div", { class: "field" }, h("span", { text: fd.label }), g));
      continue;
    }
    const inp = h("input", { class: "inp", autocomplete: "off", "aria-label": fd.label, placeholder: fd.ph || "",
      type: fd.type === "num" ? "text" : fd.type, inputmode: fd.type === "num" ? "decimal" : (fd.type === "tel" ? "tel" : fd.type === "email" ? "email" : null) });
    inp.value = d.f[fd.k] != null ? String(d.f[fd.k]) : "";
    inp.addEventListener("input", () => {
      const raw = inp.value.trim();
      if (fd.type === "num") { const n = Number(raw.replace(",", ".")); if (raw !== "" && isFinite(n)) d.f[fd.k] = n; else delete d.f[fd.k]; }
      else if (raw) d.f[fd.k] = fd.type === "date" ? raw : raw.slice(0, 160); else delete d.f[fd.k];
    });
    const wrapped = fd.pre || fd.unit ? h("span", { class: "inp-unit" + (fd.pre ? " pre" : "") }, inp, h("em", { text: fd.pre || fd.unit })) : inp;
    body.append(h("label", { class: "field" }, h("span", { text: fd.label }), wrapped));
  }
  const note = h("textarea", { class: "inp", rows: "4", maxlength: "3000", placeholder: "What they said, next step, dates" });
  note.value = d.note;
  note.addEventListener("input", () => { d.note = note.value; });
  body.append(h("label", { class: "field" }, h("span", { text: "Notes" }), note));
  const saveBtn = h("button", { class: "btn", type: "button", text: existing ? "Save changes" : "Add " + T.one, disabled: !d.name.trim() });
  name.addEventListener("input", () => { d.name = name.value; saveBtn.disabled = !name.value.trim(); });
  saveBtn.addEventListener("click", () => {
    if (!d.name.trim()) return;
    d.name = d.name.trim().slice(0, 80); d.t = new Date().toISOString();
    const clean = cleanState({ contacts: [d] }).contacts[0];
    const i = S.contacts.findIndex(c => c.id === d.id);
    if (i >= 0) S.contacts[i] = clean; else S.contacts.push(clean);
    save(); closeSheet(); toast(existing ? "Saved" : clean.name + " added"); if (view === "contacts") rerenderKeepScroll();
  });
  body.append(saveBtn);
  if (existing) {
    const del = h("button", { class: "btn danger", type: "button", text: "Delete " + T.one });
    armed(del, "Delete " + T.one, "Tap again to delete", () => { S.contacts = S.contacts.filter(c => c.id !== id); save(); closeSheet(); toast("Deleted"); if (view === "contacts") rerenderKeepScroll(); });
    body.append(h("div", { class: "danger-zone" }, del));
  }
  openSheet(existing ? existing.name : "New " + T.one, body, { done: "Cancel", focus: existing ? null : "#cName" });
}

/* ---------- Guide ---------- */
function renderGuide() {
  const root = $("#guideRoot");
  root.replaceChildren(largeTitle(CHAPTERS.length + " chapters", "Guide"));
  root.append(h("div", { class: "list" }, CHAPTERS.map(([k, t, sub]) => h("a", { class: "row", href: "#guide/" + k },
    h("span", { class: "row-ic" }, chIcon(k)), h("span", { class: "row-main" }, h("span", { class: "row-title", text: t }), h("span", { class: "row-sub", text: sub })), svgEl(ICON.chev)))));
  root.append(h("p", { class: "hint", style: "margin:4px 6px 0", text: "Built from your Fowm blueprint, 17 November 2026. Every figure links to its source. Not legal, tax or financial advice." }));
}
function showChapter(k) {
  const c = CHAPTERS.find(x => x[0] === k);
  $("#chTitle").textContent = c[1];
  $("[data-view=chapter] .lt-kicker").textContent = "Chapter " + (CHAPTERS.indexOf(c) + 1) + " of " + CHAPTERS.length;
  for (const a of $$("article.chapter")) a.hidden = a.dataset.ch !== k;
  if (k === "raising") renderRaise();
}
function renderRaise() {
  for (const inp of $$("input[data-raise]")) inp.checked = !!S.raise[inp.dataset.raise];
  const n = ["r1", "r2", "r3", "r4", "r5", "r6"].filter(k => S.raise[k]).length;
  const pill = $("#readyPill"); if (!pill) return;
  pill.textContent = n === 6 ? "Ready" : n + " of 6"; pill.className = "st " + (n === 6 ? "go" : "none");
  $("#readyBar").style.width = (n / 6 * 100) + "%";
}
for (const inp of $$("input[data-raise]")) inp.addEventListener("change", () => { if (inp.checked) S.raise[inp.dataset.raise] = true; else delete S.raise[inp.dataset.raise]; save(); renderRaise(); });
(() => { // word search
  const q = $("#gq"); if (!q) return;
  const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const items = $$("#gloss > div").map(d => ({ d, t: norm(d.textContent) }));
  q.addEventListener("input", () => { const x = norm(q.value.trim()); let n = 0; for (const it of items) { const on = !x || it.t.includes(x); it.d.hidden = !on; if (on) n++; } $("#glossEmpty").hidden = n > 0; });
})();
for (const a of $$('article.chapter a[href^="http"]')) { a.target = "_blank"; a.rel = "noopener"; }

/* ---------- settings: backup, restore, start over ---------- */
function openSettings() {
  const body = h("div");
  const payload = () => JSON.stringify({ app: "fowm-plan", v: 2, saved: isoOf(today()), data: S });
  const copy = h("button", { class: "btn", type: "button", text: "Copy backup" });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(payload()); toast("Backup copied. Paste it into Notes to keep it safe."); }
    catch (e) { area.value = payload(); area.select(); toast("Select all and copy the text below"); }
  });
  const share = navigator.share ? h("button", { class: "btn soft", type: "button", text: "Share backup", style: "margin-top:8px" }) : null;
  if (share) share.addEventListener("click", async () => { try { await navigator.share({ title: "Fowm Plan backup " + isoOf(today()), text: payload() }); } catch (e) {} });
  body.append(h("p", { class: "card-title", text: "Back up your progress" }), h("p", { class: "sheet-note", text: "Your ticks, numbers, tests and contacts live on this phone only. Save a backup now and then, so you never lose them." }), copy);
  if (share) body.append(share);
  const area = h("textarea", { class: "inp", rows: "4", placeholder: "Paste a backup here", style: "margin-top:22px", "aria-label": "Backup to restore" });
  const restore = h("button", { class: "btn soft", type: "button", text: "Restore this backup", style: "margin-top:8px" });
  armed(restore, "Restore this backup", "Tap again: this replaces everything", () => {
    let obj = null; try { obj = JSON.parse(area.value.trim()); } catch (e) {}
    const data = obj && obj.app === "fowm-plan" && isObj(obj.data) ? obj.data : null;
    if (!data) { toast("That isn't a Fowm Plan backup"); return; }
    S = cleanState(data); save(); flush(); lastComplete = null; checkBadges(false); closeSheet(); toast("Backup restored"); rerenderKeepScroll();
  });
  body.append(h("p", { class: "card-title", style: "margin-top:26px", text: "Restore a backup" }), area, restore);
  const reset = h("button", { class: "btn danger", type: "button", text: "Start over" });
  armed(reset, "Start over", "Tap again to erase everything", () => { S = blank(); save(); flush(); lastComplete = null; checkBadges(false); closeSheet(); toast("Everything erased"); rerenderKeepScroll(); });
  body.append(h("div", { class: "danger-zone" }, reset));
  body.append(h("p", { class: "hint", style: "margin-top:22px", html: 'Fowm Plan 2.1. Built from your <a href="https://claude.ai/artifact/8CgYjH2Runv6Se3pEPD6qs" target="_blank" rel="noopener">Fowm blueprint</a>, 17 November 2026. Numbers marked "my estimate" or "my rule" are mine. Not legal, tax or financial advice.' }));
  openSheet("Settings", body);
}

/* ---------- celebration ---------- */
function celebrate(n) {
  const st = STAGES[n], next = STAGES[n + 1];
  // a burst of foam dots around the badge as it springs in
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.26, r = 62 + (i % 3) * 7, col = ["var(--brown)", "var(--latte)", "var(--fix)"][i % 3];
    return `<circle class="spark" cx="75" cy="75" r="${i % 2 ? 3 : 4.2}" fill="${col}" style="--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px;animation-delay:${(0.12 + (i % 4) * 0.025).toFixed(3)}s"/>`;
  }).join("");
  const art = svgEl(`<svg viewBox="0 0 150 150" aria-hidden="true">
      <circle class="bub" cx="30" cy="112" r="7"/><circle class="bub" cx="122" cy="104" r="5"/><circle class="bub" cx="112" cy="42" r="6"/><circle class="bub" cx="36" cy="48" r="4.5"/>
      ${sparks}
      <g class="badge-big"><path d="${scallop(75, 75, 52, 11)}" fill="var(--brown)"/><text x="75" y="75" dy="0.36em" text-anchor="middle" style="font:600 48px var(--display);fill:var(--foam)">${n}</text></g>
    </svg>`);
  const body = h("div", { class: "celebrate" }, art, h("b", { text: "Stage " + n + " done" }), h("p", { text: st.title + (next ? ". Next up: Stage " + next.n + ", " + next.title.toLowerCase() + "." : ". Every stage is done.") }),
    h("button", { class: "btn", type: "button", text: "Keep going", onclick: () => closeSheet() }));
  openSheet("Badge earned", body);
}

/* ---------- boot ---------- */
RENDER.today = renderToday;
RENDER.plan = renderPlan;
RENDER.numbers = renderNumbers;
RENDER.contacts = renderContacts;
RENDER.guide = renderGuide;
checkBadges(false);
route();
(() => { // the cover matches the iPhone launch screen; it lifts off as the first screen comes up
  const reveal = () => {
    const L = $("#launch");
    launching = false;
    const run = () => { for (const f of afterLaunch.splice(0)) f(); };
    if (!L) { run(); return; }
    if (reduced) { L.remove(); run(); return; }
    L.style.pointerEvents = "none";
    anim($("img", L), [{ transform: "translate(-50%,-50%)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1.14)", opacity: 0 }], { duration: 380, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
    const lift = anim(L, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 90, easing: "ease-out", fill: "forwards" });
    const root = view && ROOTS[view] ? $(ROOTS[view]) : null;
    if (root) anim(root, [{ transform: "translateY(16px)" }, { transform: "none" }], { duration: 700, delay: 90, easing: EASE.out });
    setTimeout(run, 140);
    settled(lift).then(() => L.remove());
  };
  const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 500))]) : Promise.resolve();
  fonts.then(() => requestAnimationFrame(() => requestAnimationFrame(reveal)));
})();
if ("serviceWorker" in navigator) addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
})();
