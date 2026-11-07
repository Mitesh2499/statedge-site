// Shared helpers: data loading, theme, nav, scroll reveal, small SVG charts. No dependencies.

export async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";
export function s(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid) node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return node;
}

export const pct = (v, d = 1) => `${Number(v).toFixed(d)}%`;
export const signed = (v, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;
export const ordinal = (n) => { const v = n % 100; return n + (["th", "st", "nd", "rd"][(v - 20) % 10] || ["th", "st", "nd", "rd"][v] || "th"); };
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/* ---------- Team colours ---------- */

export const IPL_TEAM_COLORS = {
  CSK:  { primary: "#F9CD05", secondary: "#0A1172" },
  MI:   { primary: "#004BA0", secondary: "#B49759" },
  RCB:  { primary: "#EC1C24", secondary: "#000000" },
  KKR:  { primary: "#3A225D", secondary: "#B3A123" },
  SRH:  { primary: "#FF822A", secondary: "#000000" },
  DC:   { primary: "#17479E", secondary: "#ED1C24" },
  GT:   { primary: "#1C2C43", secondary: "#DBBE6E" },
  RR:   { primary: "#EA1A85", secondary: "#004BA0" },
  PBKS: { primary: "#DD1F2D", secondary: "#A7A8AA" },
  LSG:  { primary: "#00A2E0", secondary: "#FF7D19" },
};

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const luminance = (hex) => { const [r, g, b] = toRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const mixHex = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
/** Nudges a colour until it reads on a dark page (lighten) or a light page (darken). */
const forDark = (hex) => { let c = hex; for (let t = 0.1; luminance(c) < 0.2 && t <= 1; t += 0.1) c = mixHex(hex, "#ffffff", t); return c; };
const forLight = (hex) => { let c = hex; for (let t = 0.1; luminance(c) > 0.3 && t <= 1; t += 0.1) c = mixHex(hex, "#000000", t); return c; };

/** Inline style for an element with class "team": sets the colours CSS reads as --tx and --sx for the active theme. */
export function teamStyle(code) {
  const c = IPL_TEAM_COLORS[code];
  if (!c) return null;
  return `--tc:${c.primary};--tb:${forDark(c.primary)};--td:${forLight(c.primary)};--sb:${forDark(c.secondary)};--sd:${forLight(c.secondary)}`;
}

/** Rating out of 10 as a colour, red (weak) to green (strong). */
export function heat(rating) {
  const g = Math.max(0, Math.min(1, rating / 10));
  return `hsl(${Math.round(g * 128)} 58% 38% / .62)`;
}

export function safeStorage(op, key, value) {
  try {
    if (op === "get") return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
  } catch { /* storage unavailable: fine */ }
  return null;
}

/* ---------- Motion (animation library, loaded lazily) ---------- */

const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionPromise;

/** Resolves to the animation module, or null if it is unavailable (reduced motion, offline, blocked). The site works either way. */
export function loadMotion() {
  if (!motionPromise) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500));
    motionPromise = (reducedMotion() ? Promise.resolve(null) : Promise.race([import("./motion.js"), timeout]))
      .catch(() => null)
      .then((m) => {
        if (m) { try { m.init(); } catch { /* animations are optional */ } } else document.documentElement.classList.remove("mo");
        return m;
      });
  }
  return motionPromise;
}

export const withMotion = (fn) => loadMotion().then((m) => (m ? fn(m) : null));

/* ---------- Themes ---------- */

export const THEMES = [
  { id: "edge", name: "StatEdge", note: "Night stadium blue, the default", colors: ["#050a16", "#0b1830", "#2fa8ff"], meta: "#050a16" },
  { id: "classic", name: "Classic lime", note: "Charcoal with a lime edge", colors: ["#0b0e13", "#131820", "#b9f24a"], meta: "#0b0e13" },
  { id: "ember", name: "Ember", note: "Match-ball red on dark", colors: ["#120a09", "#211210", "#ff5a47"], meta: "#120a09" },
  { id: "light", name: "Daylight", note: "Bright and clean", colors: ["#f4f7fc", "#ffffff", "#0b6fd1"], meta: "#f4f7fc" },
];
const DEFAULT_THEME = "edge";

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.meta);
  return theme;
}

export function initTheme() {
  loadMotion();
  const saved = safeStorage("get", "statedge-theme");
  applyTheme(THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME);
  const btn = document.getElementById("theme");
  if (!btn) return;
  btn.setAttribute("aria-label", "Choose a colour theme");
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/></svg>';

  const current = () => document.documentElement.dataset.theme;
  const buttons = THEMES.map((t) => h("button", { class: "swatch", type: "button", role: "radio", "data-id": t.id, "aria-checked": String(current() === t.id) },
    h("span", { class: "chipview", style: `background:${t.colors[0]}`, "aria-hidden": "true" },
      h("i", { style: `background:${t.colors[1]}` }), h("i", { style: `background:${t.colors[2]}` }), h("i", { style: `background:${t.colors[1]}` })),
    h("span", {}, t.name, h("small", {}, t.note)),
    h("span", { class: "tick", "aria-hidden": "true" })));
  const panel = h("div", { class: "theme-panel no-print", id: "theme-panel", role: "radiogroup", "aria-label": "Colour theme", hidden: true }, h("h4", {}, "Theme"), ...buttons);
  btn.after(panel);
  btn.setAttribute("aria-controls", "theme-panel");

  let open = false;
  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    btn.setAttribute("aria-expanded", String(open));
    withMotion((m) => (open ? m.openPanel(panel) : m.closePanel(panel))).then((ran) => { if (ran === null) panel.hidden = !open; });
  };
  const choose = (id) => {
    const swap = () => { applyTheme(id); safeStorage("set", "statedge-theme", id); buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === id))); };
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(swap); else swap();
    withMotion((m) => m.pulse(buttons.find((b) => b.dataset.id === id)));
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!open); });
  panel.addEventListener("click", (e) => { const b = e.target.closest(".swatch"); if (b) choose(b.dataset.id); });
  document.addEventListener("click", (e) => { if (open && !panel.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { setOpen(false); btn.focus(); } });
}

/* ---------- Contact links ---------- */

const ICON = {
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.37A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.3 14.96l-.3-.19-3.08.81.82-3-.2-.31A8.1 8.1 0 0 1 12.04 3.8zM8.9 7.6c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.42 1.03 2.59c.13.17 1.77 2.82 4.4 3.84 2.18.86 2.62.69 3.1.65.47-.04 1.52-.62 1.73-1.22.21-.6.21-1.11.15-1.22-.06-.1-.23-.17-.48-.3-.26-.12-1.5-.74-1.73-.83-.23-.08-.4-.12-.57.13-.17.25-.65.83-.8 1-.14.16-.29.18-.54.06-.25-.13-1.07-.4-2.03-1.26-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.01-.39.11-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.38-.78-1.89-.2-.5-.42-.43-.57-.44h-.49z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  github: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
};

/** Contact channels from data/profile.json, in display order. */
export function contactChannels(links = {}) {
  const wa = String(links.whatsapp || "").replace(/D/g, "");
  return [
    wa && { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/${wa}?text=${encodeURIComponent("Hi Mitesh, I saw StatEdge and would like to talk.")}`, primary: true },
    links.linkedin && { id: "linkedin", label: "LinkedIn", href: links.linkedin },
    links.x && { id: "x", label: "X", href: links.x },
    links.email && { id: "email", label: "Email", href: `mailto:${links.email}` },
    links.github && { id: "github", label: "GitHub", href: links.github },
  ].filter(Boolean);
}

/** Fills every [data-contacts] container: "buttons" for labelled buttons, "icons" for round icon links. */
export async function initContacts() {
  const boxes = [...document.querySelectorAll("[data-contacts]")];
  if (!boxes.length) return;
  let channels = [];
  try { channels = contactChannels((await loadJSON("data/profile.json")).links); } catch { /* leave empty */ }
  for (const box of boxes) {
    const asButtons = box.dataset.contacts === "buttons";
    box.replaceChildren(...channels.map((c) => h("a", {
      class: asButtons ? `btn${c.primary ? " primary" : ""}` : "social",
      href: c.href, target: "_blank", rel: "noopener noreferrer",
      "aria-label": asButtons ? null : `${c.label} (opens in a new tab)`, title: asButtons ? null : c.label,
      html: asButtons ? `${ICON[c.id]}<span>${c.label}</span>` : ICON[c.id],
    })));
    if (!channels.length) box.closest(".contact")?.querySelector(".cta-fallback")?.removeAttribute("hidden");
  }
}

export function initNav() {
  initContacts();
  const btn = document.getElementById("menu");
  const list = document.getElementById("nav-list");
  if (btn && list) {
    btn.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    list.addEventListener("click", (e) => { if (e.target.closest("a")) { list.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
  }
  const links = [...document.querySelectorAll('a.link[href^="#"]')];
  if (!links.length || !("IntersectionObserver" in window)) return;
  const targets = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${entry.target.id}`)));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  targets.forEach((t) => io.observe(t));
}

/** Content is shown immediately and never fades in on scroll (it made reading feel jumpy). Still wires up hover and press effects when Motion loads. */
export function initReveal() {
  document.querySelectorAll(".reveal:not([data-rv])").forEach((n) => { n.dataset.rv = "1"; n.classList.add("in"); });
  loadMotion().then((m) => { if (m) m.bind(); });
}

export function countUp(node, to, { decimals = 0, suffix = "", duration = 1200 } = {}) {
  const fmt = (v) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = fmt(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    node.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function fillBars(root = document) {
  requestAnimationFrame(() => root.querySelectorAll(".bar i[data-w]").forEach((i) => { i.style.width = `${i.dataset.w}%`; }));
}

/* ---------- Charts ---------- */

/** One bar per season: strength vs the league average that year. Dot = playoffs, star = champions. */
/** Width (in SVG units) for a chart inside a card: 640 on desktop, narrower on phones so text stays at its real size. */
export const chartWidth = () => Math.max(300, Math.min(640, Math.round(window.innerWidth - 32 - 40)));

export function seasonChart(seasons, { height = 220 } = {}) {
  const width = chartWidth(), m = { t: 20, r: 8, b: 34, l: 38 };
  const vals = seasons.map((x) => x.strength);
  const max = Math.max(20, ...vals.map(Math.abs));
  const lim = Math.ceil(max / 10) * 10;
  const iw = width - m.l - m.r, ih = height - m.t - m.b;
  const y = (v) => m.t + ih / 2 - (v / lim) * (ih / 2);
  const bw = Math.min(26, iw / seasons.length - 6);
  const svg = s("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Season strength by year" });
  const axis = s("g", { class: "axis" });
  for (const t of [-lim, -lim / 2, 0, lim / 2, lim]) {
    axis.append(s("line", { x1: m.l, x2: width - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--muted)" : "var(--line)", "stroke-width": t === 0 ? 1.2 : 1, "stroke-dasharray": t === 0 ? "" : "3 4" }));
    axis.append(s("text", { x: m.l - 6, y: y(t) + 3.5, "text-anchor": "end" }, (t > 0 ? "+" : "") + t));
  }
  svg.append(axis);
  seasons.forEach((d, i) => {
    const cx = m.l + (i + 0.5) * (iw / seasons.length);
    const top = Math.min(y(0), y(d.strength)), hgt = Math.max(2, Math.abs(y(d.strength) - y(0)));
    const bar = s("rect", { x: cx - bw / 2, y: top, width: bw, height: hgt, rx: 3, fill: d.strength >= 0 ? "var(--tx, var(--lime))" : "var(--red)", opacity: d.qualified ? 1 : 0.55 });
    bar.append(s("title", {}, `${d.year}: ${signed(d.strength)} runs a match vs the league average · win rate ${Math.round(d.win_share * 100)}%${d.champion ? " · champions" : d.qualified ? " · reached the playoffs" : ""}`));
    svg.append(bar);
    if (d.qualified) svg.append(s("circle", { cx, cy: d.strength >= 0 ? top - 8 : top + hgt + 8, r: 3.2, fill: "var(--text)" }));
    if (d.champion) svg.append(s("text", { x: cx, y: d.strength >= 0 ? top - 15 : top + hgt + 24, "text-anchor": "middle", fill: "var(--amber)", "font-size": 13 }, "★"));
    if (seasons.length <= 8 || i % 2 === seasons.length % 2) svg.append(s("text", { x: cx, y: height - 12, "text-anchor": "middle", class: "axis", fill: "var(--faint)", "font-size": 10.5, "font-family": "var(--mono)" }, String(d.year).slice(-2) === "" ? d.year : `’${String(d.year).slice(-2)}`));
  });
  return svg;
}

/** Strength this season (x) against next season (y) for every team: a near-flat cloud is the point. */
export function scatter(pairs) {
  const width = 520, height = 380, m = { t: 14, r: 14, b: 40, l: 46 };
  const lim = 60;
  const x = (v) => m.l + ((v + lim) / (2 * lim)) * (width - m.l - m.r);
  const y = (v) => m.t + (1 - (v + lim) / (2 * lim)) * (height - m.t - m.b);
  const svg = s("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Team strength this season against next season" });
  const axis = s("g", { class: "axis" });
  for (const t of [-60, -30, 0, 30, 60]) {
    axis.append(s("line", { x1: m.l, x2: width - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--muted)" : "var(--line)", "stroke-dasharray": t === 0 ? "" : "3 4" }));
    axis.append(s("line", { y1: m.t, y2: height - m.b, x1: x(t), x2: x(t), stroke: t === 0 ? "var(--muted)" : "var(--line)", "stroke-dasharray": t === 0 ? "" : "3 4" }));
    axis.append(s("text", { x: m.l - 8, y: y(t) + 3.5, "text-anchor": "end" }, (t > 0 ? "+" : "") + t));
    axis.append(s("text", { x: x(t), y: height - m.b + 16, "text-anchor": "middle" }, (t > 0 ? "+" : "") + t));
  }
  axis.append(s("text", { x: (width + m.l) / 2, y: height - 6, "text-anchor": "middle" }, "Strength this season (runs a match vs the league average)"));
  axis.append(s("text", { transform: `translate(12 ${(height - m.b) / 2}) rotate(-90)`, "text-anchor": "middle" }, "Next season"));
  svg.append(axis);
  // least-squares line
  const n = pairs.length, mx = pairs.reduce((a, p) => a + p[0], 0) / n, my = pairs.reduce((a, p) => a + p[1], 0) / n;
  const slope = pairs.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pairs.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  const icpt = my - slope * mx;
  const diag = s("line", { x1: x(-lim), y1: y(-lim), x2: x(lim), y2: y(lim), stroke: "var(--amber)", "stroke-dasharray": "5 5", "stroke-width": 1.4, opacity: 0.7 });
  diag.append(s("title", {}, "If strength repeated perfectly, every dot would sit on this line"));
  svg.append(diag);
  pairs.forEach(([a, b]) => svg.append(s("circle", { cx: x(Math.max(-lim, Math.min(lim, a))), cy: y(Math.max(-lim, Math.min(lim, b))), r: 4, fill: "var(--blue)", opacity: 0.6 })));
  svg.setAttribute("aria-label", `Team strength this season against next season. The trend line is almost flat (slope ${slope.toFixed(2)}), so strength barely carries over.`);
  svg.append(s("line", { x1: x(-lim), y1: y(icpt + slope * -lim), x2: x(lim), y2: y(icpt + slope * lim), stroke: "var(--lime)", "stroke-width": 2.4 }));
  return { svg, slope };
}
