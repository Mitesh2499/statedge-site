import { loadJSON, h, s, pct, heat, slug, initTheme, initNav, initReveal, countUp, fillBars, scatter, seasonChart, withMotion, teamStyle } from "./common.js";

initTheme();
initNav();

const PHASES = [
  ["batting_powerplay", "Bat PP"], ["batting_middle", "Bat mid"], ["batting_death", "Bat death"],
  ["bowling_powerplay", "Bowl PP"], ["bowling_middle", "Bowl mid"], ["bowling_death", "Bowl death"],
];

const state = { sort: "rank", dir: 1, open: new Set() };

function snapshot(teams) {
  const box = document.getElementById("snapshot");
  const top = [...teams].sort((a, b) => b.playoff_pct - a.playoff_pct).slice(0, 5);
  const max = Math.max(...top.map((t) => t.playoff_pct));
  box.append(
    h("h3", {}, "2027 outlook · chance of a top-four finish"),
    ...top.map((t) => h("div", { class: "snap-row team", style: teamStyle(t.code) },
      h("span", { class: "code" }, t.code),
      h("div", { class: "bar" }, h("i", { "data-w": (t.playoff_pct / max * 100).toFixed(1) })),
      h("output", {}, pct(t.playoff_pct, 0)))),
    h("p", { class: "fineprint", style: "margin:14px 0 0" }, "StatEdge outlook for the 2027 squads, with a wide range around every number. Not a prediction."),
  );
  fillBars(box);
}

function stats(scope) {
  document.querySelectorAll("[data-count]").forEach((n) => {
    const key = n.dataset.count;
    const values = { seasons: scope.seasons, matches: scope.matches, balls: scope.balls, measures: scope.measures_tested };
    if (key in values) countUp(n, values[key]);
  });
}

function profile(p) {
  document.title = `StatEdge · ${p.name}, IPL analytics`;
  document.querySelectorAll("[data-name]").forEach((n) => { n.textContent = p.name; });
  const about = document.getElementById("about-copy");
  about.replaceChildren(...p.about.map((t) => h("p", {}, t)));
  document.getElementById("skills").replaceChildren(...p.skills.map((t) => h("span", { class: "chip" }, t)));
  document.getElementById("available").textContent = p.available_for;
}

function ratingCell(v) {
  return h("td", { class: "heat", style: `background:${heat(v)}`, title: `${v.toFixed(1)} out of 10` }, v.toFixed(1));
}

function barCell(value, max, label) {
  return h("td", {}, h("div", { class: "cell-bar" },
    h("div", { class: "bar" }, h("i", { "data-w": Math.min(100, value / max * 100).toFixed(1) })),
    h("b", {}, label)));
}

function renderTable(teams, fx) {
  const body = document.getElementById("outlook-body");
  const key = state.sort;
  const val = (t) => key === "rank" ? t.rank : key === "name" ? t.name : key === "playoff" ? -t.playoff_pct : key === "title" ? -t.title_pct : key === "overall" ? -t.overall_rating : -(t.phases.find((p) => p.key === key)?.rating ?? 0);
  const rows = [...teams].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * state.dir; });
  const maxPlayoff = Math.max(...teams.map((t) => t.playoff_pct));
  const maxTitle = Math.max(...teams.map((t) => t.title_pct));
  body.replaceChildren();
  for (const t of rows) {
    const open = state.open.has(t.code);
    body.append(h("tr", { class: "team", style: teamStyle(t.code) },
      h("td", { class: "l" }, h("div", { class: "team-cell" },
        h("span", { class: "rk" }, t.rank), h("span", { class: "code-chip" }, t.code), h("span", {}, t.name),
        h("button", { class: "toggle-xi", "aria-expanded": String(open), "aria-controls": `xi-${t.code}`, onclick: () => { open ? state.open.delete(t.code) : state.open.add(t.code); renderTable(teams, "xi"); } }, open ? "Hide XI" : "XI"))),
      h("td", { class: "heat", style: `background:${heat(t.overall_rating)}`, title: "Overall rating out of 10" }, t.overall_rating.toFixed(1)),
      barCell(t.playoff_pct, maxPlayoff, pct(t.playoff_pct, 0)),
      barCell(t.title_pct, maxTitle, pct(t.title_pct, 0)),
      ...PHASES.map(([k]) => ratingCell(t.phases.find((p) => p.key === k).rating)),
      h("td", {}, h("a", { class: "row-link", href: `case.html?c=${slug(t.code)}` }, "Study →"))));
    if (open) {
      body.append(h("tr", { class: "xi-row team", style: teamStyle(t.code), id: `xi-${t.code}` }, h("td", { colspan: "11" },
        h("div", { class: "xi-list" }, t.xi.map((n, i) => h("span", {}, h("b", {}, i + 1), n))),
        h("p", { class: "fineprint", style: "margin:12px 0 0" }, `Best phases: ${t.strengths.join(" and ")}. Weakest: ${t.weaknesses.join(" and ")}.`))));
    }
  }
  fillBars(body);
  body.querySelectorAll("tr:not(.xi-row)").forEach((tr) => {
    ["Team", "Overall", "Playoffs", "Title", ...PHASES.map(([, l]) => l)].forEach((label, i) => { if (tr.children[i]) tr.children[i].dataset.label = label; });
  });
  const sel = document.getElementById("sort-select");
  if (sel) sel.value = state.sort;
  if (fx === "sort") withMotion((m) => m.rows(body)); else if (fx === "xi") withMotion((m) => m.chips(body));
  document.querySelectorAll("#outlook-head th[data-sort]").forEach((th) => {
    th.setAttribute("aria-sort", th.dataset.sort === state.sort ? (state.dir === 1 ? "ascending" : "descending") : "none");
  });
}

function outlook(teams) {
  document.getElementById("sort-select")?.addEventListener("change", (e) => { state.sort = e.target.value; state.dir = 1; renderTable(teams, "sort"); });
  document.getElementById("outlook-head").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;
    const k = th.dataset.sort;
    if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; }
    renderTable(teams, "sort");
  });
  renderTable(teams);
}

function findings(f, league) {
  document.getElementById("findings-title").textContent = f.headline;
  document.getElementById("findings-intro").textContent = f.intro;
  document.getElementById("big-grid").replaceChildren(...f.items.map((i) =>
    h("article", { class: "big reveal" }, h("div", { class: "num" }, i.value), h("h3", {}, i.label), h("p", {}, i.body))));
  document.getElementById("learned").replaceChildren(...f.learned.map((l) => h("div", {}, h("h4", {}, l.title), h("p", {}, l.body))));
  const { svg } = scatter(league.pairs);
  document.getElementById("scatter").replaceChildren(svg);
  initReveal();
}

function cases(teams, studies) {
  document.getElementById("cases-intro").textContent = studies.intro;
  const byName = Object.fromEntries(teams.map((t) => [t.name, t]));
  document.getElementById("case-grid").replaceChildren(...studies.cases.map((c) => {
    const t = byName[c.team];
    return h("a", { class: t ? "case-card reveal team" : "case-card reveal", style: t && teamStyle(t.code), href: `case.html?c=${c.slug}` },
      h("div", { class: "top" }, h("span", { class: "kick" }, c.kicker), h("span", { class: "code-chip" }, t?.code ?? c.slug.toUpperCase())),
      h("h3", {}, c.headline), h("p", {}, c.dek),
      t && h("div", { class: "meta" }, h("span", {}, `Outlook #${t.rank}`), h("span", {}, `Playoffs ${pct(t.playoff_pct, 0)}`)),
      h("span", { class: "arrow", "aria-hidden": "true" }, "→"));
  }));
  initReveal();
}

async function main() {
  try {
    const [data, prof, find, studies] = await Promise.all([
      loadJSON("data/showcase.json"), loadJSON("data/profile.json"), loadJSON("data/findings.json"), loadJSON("data/case-studies.json"),
    ]);
    profile(prof);
    stats(data.scope);
    snapshot(data.teams);
    outlook(data.teams);
    findings(find, data.league);
    cases(data.teams, studies);
    document.getElementById("built").textContent = new Date(data.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch (err) {
    const msg = h("div", { class: "error", role: "alert" },
      h("p", { style: "margin:0" }, "We couldn't load the data just now. Check your connection and try again."),
      h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Try again"));
    console.error(err);
    document.querySelector("main").prepend(msg);
  }
  initReveal();
}
main();
