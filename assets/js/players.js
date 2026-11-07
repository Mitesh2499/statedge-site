import { loadJSON, h, signed, heat, initTheme, initNav, initReveal, teamStyle } from "./common.js";

initTheme();
initNav();

const GROUPS = ["Batting", "Bowling", "All-round"];
const state = { view: "projection", role: "batter", team: "", origin: "any", q: "", squad: false };
let data;

const idxColor = (i) => heat(i / 10);

function qualityNote(role) {
  const el = document.getElementById("quality");
  const q = role.projection_quality;
  if (state.view !== "projection" || q === "unknown") { el.hidden = true; return; }
  el.hidden = false;
  el.className = `quality ${q === "held_up" ? "good" : "weak"}`;
  el.textContent = q === "held_up"
    ? "Projections for this role have held up: predicting 2026 from earlier seasons tracked what really happened."
    : q === "weak"
      ? "Projections for this role are only weakly predictive. Trust the broad tiers and the ranges more than the exact order."
      : "Past projections for this role did not beat simply assuming everyone is average. Treat this list as a guide to 2026 form, not a forecast.";
}

function render() {
  const role = data.roles.find((r) => r.key === state.role);
  const rows = (data.boards[state.view][state.role] || []).filter((r) => {
    if (state.team && r.team !== state.team) return false;
    if (state.squad && !r.in_squad_2027) return false;
    if (state.origin === "overseas" && r.overseas !== true) return false;
    if (state.origin === "domestic" && r.overseas !== false) return false;
    if (state.q && !r.name.toLowerCase().includes(state.q.toLowerCase())) return false;
    return true;
  });
  document.getElementById("role-title").textContent = `${role.label} · ${state.view === "season" ? data.last_season : data.projection_season}`;
  document.getElementById("role-desc").textContent = `${role.description} Measured in ${role.unit} above an average player.`;
  document.getElementById("unit-head").textContent = role.unit === "runs per match" ? "Runs a match" : "Runs / 100 balls";
  qualityNote(role);
  const lo = Math.min(...rows.map((r) => r.low), 0), hi = Math.max(...rows.map((r) => r.high), 1), span = hi - lo || 1;
  const x = (v) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100))}%`;
  const body = document.getElementById("pl-body");
  body.replaceChildren(...(rows.length ? rows.map((r) => h("tr", r.team_code ? { class: "team prow", style: teamStyle(r.team_code) } : { class: "prow" },
    h("td", { class: "rank" }, r.rank),
    h("td", { class: "l who" }, r.name, h("small", {}, [r.overseas === true ? "Overseas" : r.overseas === false ? "Indian" : "", r.style && role.group === "Batting" ? `${r.style}-hand` : r.style || ""].filter(Boolean).join(" · "))),
    h("td", { class: "l tm" }, r.team ? h("span", { class: "tm-line" }, h("span", { class: "code-chip" }, r.team_code || "—"), r.team) : "No squad yet", r.team && !r.in_squad_2027 ? h("small", {}, `${data.last_season} team, not yet in a ${data.projection_season} squad`) : null),
    h("td", { class: "val" }, signed(r.value)),
    h("td", {}, h("span", { class: "range", role: "img", "aria-label": `Likely range ${signed(r.low)} to ${signed(r.high)}`, title: `Likely range ${signed(r.low)} to ${signed(r.high)}` },
      h("i", { style: `left:${x(r.low)};width:calc(${x(r.high)} - ${x(r.low)})` }), h("b", { style: `left:${x(r.value)}` }))),
    h("td", { class: "idx", style: `background:${idxColor(r.index)}`, title: `Better than ${Math.round(r.index)}% of eligible players` }, Math.round(r.index), h("small", {}, r.tier)),
    h("td", { class: "evd", title: `${r.balls} balls` }, r.evidence)))
    : [h("tr", { class: "empty-row" }, h("td", { colspan: 7 }, "No players match these filters."))]));
  // Labels for the stacked card layout on phones.
  const unit = document.getElementById("unit-head")?.textContent || "Value";
  body.querySelectorAll("tr:not(.empty-row)").forEach((tr) => {
    ["Rank", "Player", "Team", unit, "Likely range", "Index", "Evidence"].forEach((label, i) => { if (tr.children[i]) tr.children[i].dataset.label = label; });
    tr.children[4]?.classList.add("rng");
  });
  document.getElementById("pl-foot").textContent = `Top ${data.boards[state.view][state.role]?.length ?? 0} for this role, ${rows.length} shown. Rank is among all eligible players, before the filters.`;
}

function buildRoles() {
  const box = document.getElementById("roles");
  box.replaceChildren(...GROUPS.map((g) => h("div", { class: "role-group" }, h("h3", {}, g),
    h("div", { class: "row" }, data.roles.filter((r) => r.group === g).map((r) => h("button", { type: "button", class: "role-chip", "data-role": r.key, "aria-pressed": String(r.key === state.role) }, r.label))))));
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-role]");
    if (!b) return;
    state.role = b.dataset.role;
    box.querySelectorAll("[data-role]").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    render();
  });
}

async function main() {
  try {
    const [players, prof] = await Promise.all([loadJSON("data/players.json"), loadJSON("data/profile.json")]);
    data = players;
    document.querySelectorAll("[data-name]").forEach((n) => { n.textContent = prof.name; });
    document.querySelectorAll("[data-last]").forEach((n) => { n.textContent = data.last_season; });
    document.querySelectorAll("[data-next]").forEach((n) => { n.textContent = data.projection_season; });
    const buttons = document.querySelectorAll("#view button");
    buttons[0].textContent = `${data.last_season} · what happened`;
    buttons[1].textContent = `${data.projection_season} · what to expect`;
    const teams = [...new Set(Object.values(data.boards.projection).flat().filter((r) => r.in_squad_2027 && r.team).map((r) => r.team))].sort();
    document.getElementById("f-team").append(...teams.map((t) => h("option", { value: t }, t)));
    buildRoles();
    document.getElementById("view").addEventListener("click", (e) => {
      const b = e.target.closest("[data-view]");
      if (!b) return;
      state.view = b.dataset.view;
      buttons.forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      render();
    });
    document.getElementById("f-team").addEventListener("change", (e) => { state.team = e.target.value; render(); });
    document.getElementById("f-origin").addEventListener("change", (e) => { state.origin = e.target.value; render(); });
    document.getElementById("f-squad").addEventListener("change", (e) => { state.squad = e.target.checked; render(); });
    document.getElementById("f-q").addEventListener("input", (e) => { state.q = e.target.value.trim(); render(); });
    document.querySelector(".ramp").replaceChildren(...[100, 75, 50, 25, 0].map((g) => h("i", { style: `background:${idxColor(g)}` })));
    render();
  } catch (err) {
    document.querySelector("main").prepend(h("div", { class: "error", role: "alert" }, h("p", { style: "margin:0" }, "We couldn't load the player data just now. Check your connection and try again."), h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Try again")));
  }
  initReveal();
}
main();
