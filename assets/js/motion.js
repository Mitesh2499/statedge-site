// Animation layer built on Motion (https://motion.dev). Loaded lazily from common.js; if it fails to load the site still works.
import { animate, inView, hover, press, scroll, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.4.7/+esm";

const EASE = [0.16, 1, 0.3, 1];
const SPRING = { type: "spring", stiffness: 320, damping: 22 };
let started = false;
const bound = new WeakSet();

/** Scroll-triggered reveal: fade and rise, staggered by position among siblings. */
export function reveal(nodes) {
  for (const node of nodes) {
    const sibs = [...(node.parentElement?.children ?? [])].filter((c) => c.classList.contains("reveal"));
    const i = Math.max(0, sibs.indexOf(node));
    inView(node, () => {
      animate(node, { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, ease: EASE, delay: Math.min(i, 6) * 0.05 });
    }, { amount: 0.15 });
  }
}

/** Staggered entrance for a group of elements. */
export function intro(selector = ".hero-grid > div:first-child > *") {
  const targets = Array.from(document.querySelectorAll(selector));
  if (!targets.length) return;
  animate(targets, { opacity: [0, 1], y: [34, 0] }, { duration: 0.9, ease: EASE, delay: stagger(0.08, { startDelay: 0.1 }) });
}

/** Children of a container rise in one after another when it scrolls into view. */
function staggerGroups() {
  for (const box of document.querySelectorAll(".stat-strip, .pipeline")) {
    inView(box, () => {
      animate(Array.from(box.children), { opacity: [0, 1], y: [18, 0] }, { duration: 0.6, ease: EASE, delay: stagger(0.05) });
    }, { amount: 0.3 });
  }
}

/** Always-on background motion: floating orbs, parallax, and a scroll progress bar. */
function ambient() {
  const bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.prepend(bar);
  scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));

  const hero = document.querySelector(".hero");
  const orbs = hero?.querySelector(".orbs");
  if (!hero || !orbs) return;
  const [a, b] = orbs.querySelectorAll(".orb");
  if (a) animate(a, { x: [0, -50, 20, 0], y: [0, 40, -20, 0], scale: [1, 1.08, 0.96, 1] }, { duration: 16, repeat: Infinity, ease: "easeInOut" });
  if (b) animate(b, { x: [0, 60, -20, 0], y: [0, -30, 20, 0] }, { duration: 20, repeat: Infinity, ease: "easeInOut" });
  scroll(animate(orbs, { y: [0, 140] }, { ease: "linear" }), { target: hero, offset: ["start start", "end start"] });
}

/** Spring hover and press feedback. Safe to call again after new content is rendered. */
export function bind() {
  const fresh = (sel) => [...document.querySelectorAll(sel)].filter((el) => !bound.has(el) && bound.add(el));
  const controls = fresh(".btn, .icon-btn, .brand-mark, .code-chip");
  hover(controls, (el) => { animate(el, { scale: 1.06 }, SPRING); return () => animate(el, { scale: 1 }, SPRING); });
  press(fresh(".btn, .icon-btn"), (el) => { animate(el, { scale: 0.94 }, SPRING); return () => animate(el, { scale: 1 }, SPRING); });
  const cards = fresh(".case-card, .feature, .big, .offer, .snapshot, .chart-card");
  hover(cards, (el) => { animate(el, { y: -6 }, { type: "spring", stiffness: 260, damping: 18 }); return () => animate(el, { y: 0 }, { type: "spring", stiffness: 260, damping: 22 }); });
  hover(fresh("nav a.link"), (el) => { animate(el, { y: -2 }, SPRING); return () => animate(el, { y: 0 }, SPRING); });
}

/** Table rows slide in one by one after a sort. */
export function rows(body) {
  animate(body.querySelectorAll("tr:not(.xi-row)"), { opacity: [0, 1], x: [-16, 0] }, { duration: 0.5, ease: EASE, delay: stagger(0.04) });
}

/** The XI chips pop in when a row is opened. */
export function chips(body) {
  animate(body.querySelectorAll(".xi-row .xi-list span"), { opacity: [0, 1], scale: [0.8, 1], y: [8, 0] }, { duration: 0.4, ease: EASE, delay: stagger(0.03) });
}

export function openPanel(panel) {
  panel.hidden = false;
  animate(panel, { opacity: [0, 1], scale: [0.88, 1], y: [-10, 0] }, { type: "spring", stiffness: 420, damping: 26 });
  animate(panel.querySelectorAll(".swatch"), { opacity: [0, 1], x: [18, 0] }, { duration: 0.4, ease: EASE, delay: stagger(0.055, { startDelay: 0.05 }) });
}

export async function closePanel(panel) {
  await animate(panel, { opacity: [1, 0], scale: [1, 0.94], y: [0, -6] }, { duration: 0.14, ease: "easeIn" });
  panel.hidden = true;
}

export function pulse(el) {
  animate(el, { scale: [1, 1.04, 1] }, { duration: 0.35, ease: EASE });
}

/** One-time page setup. */
export function init() {
  if (started) return;
  started = true;
  const header = document.querySelector(".site-header");
  if (header) animate(header, { y: [-70, 0], opacity: [0, 1] }, { duration: 0.7, ease: EASE });
  // Each step is isolated: a failure in one must never leave the page hidden or stop the others.
  for (const step of [intro, staggerGroups, ambient, bind]) {
    try { step(); } catch (err) { console.warn("motion step failed", err); }
  }
}
