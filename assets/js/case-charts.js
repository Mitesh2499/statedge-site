// Three small charts for the deeper case studies. Plain SVG, no dependencies; every chart answers one question.
import { s } from "./common.js";

const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const sg = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;

function frame(width, height, label) {
  return s("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label });
}

/** Question: did the team win more or fewer games than its runs scored and conceded say it should? */
export function luckChart(seasons) {
  const w = 640, h = 250, m = { t: 22, r: 10, b: 36, l: 34 };
  const svg = frame(w, h, "Wins against expected wins, by season");
  const winsOf = (d) => parseInt(d.record, 10);
  const max = Math.max(14, ...seasons.map((d) => Math.max(winsOf(d), d.expected_wins)));
  const iw = w - m.l - m.r, ih = h - m.t - m.b, step = iw / seasons.length, bw = Math.min(34, step / 2 - 6);
  const y = (v) => m.t + ih - (v / max) * ih;
  const axis = s("g", { class: "axis" });
  for (const t of [0, 4, 8, 12]) {
    axis.append(s("line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? "var(--muted)" : "var(--line)", "stroke-dasharray": t === 0 ? "" : "3 4" }));
    axis.append(s("text", { x: m.l - 6, y: y(t) + 3.5, "text-anchor": "end" }, String(t)));
  }
  svg.append(axis);
  seasons.forEach((d, i) => {
    const cx = m.l + (i + 0.5) * step;
    const wins = winsOf(d);
    const above = wins >= d.expected_wins;
    const a = s("rect", { x: cx - bw - 2, y: y(wins), width: bw, height: y(0) - y(wins), rx: 3, fill: above ? "var(--good)" : "var(--bad)" });
    a.append(s("title", {}, `${d.year}: won ${wins}; the runs point to ${f1(d.expected_wins)}`));
    const e = s("rect", { x: cx + 2, y: y(d.expected_wins), width: bw, height: y(0) - y(d.expected_wins), rx: 3, fill: "none", stroke: "var(--text)", "stroke-width": 1.6, "stroke-dasharray": "4 3" });
    e.append(s("title", {}, `${d.year}: expected wins ${f1(d.expected_wins)}`));
    svg.append(a, e);
    svg.append(s("text", { x: cx - bw / 2 - 2, y: y(wins) - 5, "text-anchor": "middle", class: "val" }, String(wins)));
    svg.append(s("text", { x: cx + bw / 2 + 2, y: y(d.expected_wins) - 5, "text-anchor": "middle", class: "val faint" }, f1(d.expected_wins)));
    svg.append(s("text", { x: cx, y: h - 18, "text-anchor": "middle", class: "axis-label" }, String(d.year)));
    svg.append(s("text", { x: cx, y: h - 5, "text-anchor": "middle", class: "gap", fill: d.gap >= 0 ? "var(--lime)" : "var(--red)" }, `${sg(d.gap)} wins`));
  });
  return svg;
}

/** Question: in which phases does the team score or save more runs than an average team, per match? Positive is always better. */
export function phaseChart(phases) {
  const w = 640, rowH = 34, m = { t: 8, r: 54, b: 8, l: 168 };
  const h = m.t + m.b + rowH * phases.length;
  const svg = frame(w, h, "Runs a match above or below the league, by phase");
  const max = Math.max(8, ...phases.map((p) => Math.abs(p.runs_per_innings)));
  const mid = m.l + (w - m.l - m.r) / 2, half = (w - m.l - m.r) / 2;
  svg.append(s("line", { x1: mid, x2: mid, y1: m.t, y2: h - m.b, stroke: "var(--muted)" }));
  phases.forEach((p, i) => {
    const y = m.t + i * rowH + 5, len = (Math.abs(p.runs_per_innings) / max) * half, pos = p.runs_per_innings >= 0;
    svg.append(s("text", { x: m.l - 10, y: y + 15, "text-anchor": "end", class: "row-label" }, `${p.side}, ${p.phase.split(" (")[0].toLowerCase()}`));
    const bar = s("rect", { x: pos ? mid : mid - len, y, width: Math.max(len, 2), height: 22, rx: 3, fill: pos ? "var(--good)" : "var(--bad)", opacity: Math.abs(p.runs_per_innings) < 1 ? 0.55 : 1 });
    bar.append(s("title", {}, `${p.side} ${p.phase}: ${sg(p.runs_per_innings)} runs a match against the league; ${p.rr} an over against ${p.league_rr}`));
    svg.append(bar);
    svg.append(s("text", { x: pos ? mid + len + 6 : mid - len - 6, y: y + 15, "text-anchor": pos ? "start" : "end", class: "val" }, sg(p.runs_per_innings)));
  });
  return svg;
}

/** Question: how much of the batting comes from the top three, and is that more than a typical team? */
export function relianceChart(rows) {
  const w = 640, h = 220, m = { t: 22, r: 10, b: 30, l: 36 };
  const svg = frame(w, h, "Top-three run share by season against the league average");
  const iw = w - m.l - m.r, ih = h - m.t - m.b, step = iw / rows.length, bw = Math.min(44, step - 18);
  const lo = 30, hi = 80, y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
  const axis = s("g", { class: "axis" });
  for (const t of [30, 45, 60, 75]) {
    axis.append(s("line", { x1: m.l, x2: w - m.r, y1: y(t), y2: y(t), stroke: "var(--line)", "stroke-dasharray": "3 4" }));
    axis.append(s("text", { x: m.l - 6, y: y(t) + 3.5, "text-anchor": "end" }, `${t}%`));
  }
  svg.append(axis);
  rows.forEach((d, i) => {
    const cx = m.l + (i + 0.5) * step;
    const bar = s("rect", { x: cx - bw / 2, y: y(d.share), width: bw, height: y(lo) - y(d.share), rx: 3, fill: d.share > d.league + 3 ? "var(--warn)" : "var(--info)", opacity: 0.9 });
    bar.append(s("title", {}, `${d.year}: top three scored ${f1(d.share)}% of the runs; league average ${f1(d.league)}%`));
    svg.append(bar);
    svg.append(s("line", { x1: cx - bw / 2 - 5, x2: cx + bw / 2 + 5, y1: y(d.league), y2: y(d.league), stroke: "var(--text)", "stroke-width": 2, "stroke-dasharray": "5 3" }));
    svg.append(s("text", { x: cx, y: y(d.share) - 6, "text-anchor": "middle", class: "val" }, `${Math.round(d.share)}%`));
    svg.append(s("text", { x: cx, y: h - 10, "text-anchor": "middle", class: "axis-label" }, String(d.year)));
  });
  return svg;
}
