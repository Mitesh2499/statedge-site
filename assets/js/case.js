import { luckChart, phaseChart, relianceChart } from "./case-charts.js";
import { loadJSON, h, pct, heat, signed, ordinal, initTheme, initNav, initReveal, fillBars, seasonChart, withMotion, teamStyle } from "./common.js";

initTheme();
initNav();

function phaseCard(team) {
  return h("div", { class: "card" },
    h("h3", {}, "What the 2027 outlook sees"),
    ...team.phases.map((p) => h("div", { class: "phase" },
      h("span", {}, p.label), h("b", { style: `color:${p.rating >= 6 ? "var(--lime)" : p.rating <= 4 ? "var(--red)" : "var(--text)"}` }, `${p.rating.toFixed(1)}`),
      h("div", { class: "bar" }, h("i", { "data-w": (p.rating * 10).toFixed(0) })))),
    h("p", { class: "fineprint", style: "margin:12px 0 0" }, "Rating out of 10 against the other nine teams. 5 is typical."));
}

function xiCard(team) {
  return h("div", { class: "card" },
    h("h3", {}, "The StatEdge XI, in batting order"),
    h("div", { class: "xi-list" }, team.xi.map((n, i) => h("span", {}, h("b", {}, i + 1), n))),
    h("p", { class: "fineprint", style: "margin:12px 0 0" }, "A StatEdge pick from the 2027 squad, not a team announcement."));
}


const fx1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const sgn = (v, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;

function hookBlock(d) {
  return [h("div", { class: "hook-block" },
    h("p", { class: "hook" }, d.hook),
    d.key_stats ? h("div", { class: "key-stats", role: "list" }, d.key_stats.map((k) => h("div", { role: "listitem", class: k.tone ? `kpi ${k.tone}` : "" }, h("b", {}, k.value), h("span", {}, k.label)))) : null)];
}

function miniTable(t) {
  return h("div", { class: "table-scroll" }, h("table", { class: "deep" },
    h("thead", {}, h("tr", {}, t.cols.map((c) => h("th", {}, c)))),
    h("tbody", {}, t.rows.map((row) => h("tr", {}, row.map((c) => h("td", { class: /^\+\d/.test(c) ? "good" : /^[−-]\d/.test(c) ? "bad" : "" }, c)))))));
}

function section(title, sub, ...kids) {
  return h("section", { class: "deep-section reveal" }, h("h2", {}, title), sub ? h("p", { class: "sub" }, sub) : null, ...kids);
}

function chartCard(title, question, look, svg, legend) {
  return h("div", { class: "chart-card" }, h("h3", {}, title), h("p", { class: "q" }, question), svg, legend || null, h("p", { class: "look" }, look));
}

function seasonTable(rows) {
  const head = ["Season", "Record", "Expected wins", "Gap", "Net run rate", "Batting first", "Chasing", "Close matches"];
  return h("div", { class: "table-scroll" }, h("table", { class: "deep" },
    h("caption", {}, "League matches only. Gap = wins minus expected wins. Close = decided by 10 runs or fewer, or 2 wickets or fewer."),
    h("thead", {}, h("tr", {}, head.map((c) => h("th", {}, c)))),
    h("tbody", {}, rows.map((r) => h("tr", {},
      h("td", {}, r.year), h("td", {}, r.record), h("td", {}, fx1(r.expected_wins)),
      h("td", { class: r.gap >= 0.5 ? "good" : r.gap <= -0.5 ? "bad" : "" }, sgn(r.gap)),
      h("td", {}, sgn(r.nrr, 2)), h("td", {}, r.bat_first), h("td", {}, r.chase), h("td", {}, r.close))))));
}

function phaseTable(rows) {
  const head = ["", "Runs an over", "League", "Runs a match vs league", "Rank of 10", "Wickets per 100 balls", "League"];
  return h("div", { class: "table-scroll" }, h("table", { class: "deep" },
    h("caption", {}, "IPL league matches, 2024 to 2026. For bowling, a positive runs-a-match figure means fewer runs conceded than the league. Rank 1 is best."),
    h("thead", {}, h("tr", {}, head.map((c) => h("th", {}, c)))),
    h("tbody", {}, rows.map((r) => h("tr", {},
      h("td", { class: "l" }, `${r.side}, ${r.phase.split(" (")[0].toLowerCase()}`), h("td", {}, r.rr.toFixed(2)), h("td", {}, r.league_rr.toFixed(2)),
      h("td", { class: r.runs_per_innings >= 1 ? "good" : r.runs_per_innings <= -1 ? "bad" : "" }, sgn(r.runs_per_innings)),
      h("td", {}, r.rank), h("td", {}, r.wkt100.toFixed(1)), h("td", {}, r.league_wkt100.toFixed(1)))))));
}

function playersTable(t) {
  const bat = h("div", { class: "table-scroll" }, h("table", { class: "deep" },
    h("caption", {}, "2026 league matches: leading run-scorers and their share of the team's runs."),
    h("thead", {}, h("tr", {}, ["Batter", "Runs", "Strike rate", "Share of team runs", "Boundary %"].map((c) => h("th", {}, c)))),
    h("tbody", {}, t.batters.map((b) => h("tr", {}, h("td", { class: "l" }, b.name), h("td", {}, b.runs), h("td", {}, b.sr ?? "—"), h("td", {}, `${fx1(b.share)}%`), h("td", {}, b.bdry_pct === null ? "—" : `${fx1(b.bdry_pct)}%`))))));
  const bowl = h("div", { class: "table-scroll" }, h("table", { class: "deep" },
    h("caption", {}, "2026 league matches: leading wicket-takers."),
    h("thead", {}, h("tr", {}, ["Bowler", "Wickets", "Overs", "Economy"].map((c) => h("th", {}, c)))),
    h("tbody", {}, t.bowlers.map((b) => h("tr", {}, h("td", { class: "l" }, b.name), h("td", {}, b.wkts), h("td", {}, fx1(b.overs)), h("td", {}, b.econ?.toFixed(2) ?? "—"))))));
  return h("div", { class: "pair" }, bat, bowl);
}

function matchCard(m) {
  const won = m.result.startsWith("Won");
  const phases = (o) => Object.entries(o).map(([k, v]) => `${k === "powerplay" ? "PP" : k === "middle" ? "mid" : "death"} ${v}`).join(" · ");
  return h("article", { class: `match-card ${won ? "won" : "lost"}` },
    h("header", {}, h("div", {}, h("div", { class: "when" }, `${m.date} · ${m.venue}${m.heading ? ` · vs ${m.opponent}` : ""}`), h("h3", {}, m.heading || `vs ${m.opponent}`)), h("span", { class: `res ${won ? "won" : "lost"}` }, m.result)),
    h("div", { class: "score" }, h("span", {}, `${m.batting_first ? "Batted first" : "Chased"}: ${m.own} (${phases(m.own_phases)})`), h("span", {}, `Opponent: ${m.opp} (${phases(m.opp_phases)})`)),
    h("p", { class: "why" }, m.why),
    h("p", { class: "stars" }, [m.top_bat && `Top scorer: ${m.top_bat}`, m.best_bowl && `Best bowling: ${m.best_bowl}`, m.opp_top_bat && `Opposition top scorer: ${m.opp_top_bat}`].filter(Boolean).join(" · ")));
}

function deepIntro(d) {
  return [h("div", { class: "deep-intro" },
    h("div", { class: "callout short" }, h("h4", {}, "The short answer"), h("p", {}, d.short_answer)),
    h("div", { class: "callout" }, h("h4", {}, "Why this matters"), h("p", {}, d.why)))];
}

const ttl = (d, key, title, sub) => (d.section_titles && d.section_titles[key]) || [title, sub];

function deepSections(study, d) {
  const T = d.tables;
  const charts = d.charts || [];
  const out = [];
  const kinds = ["info", "info", "warn", "info", "warn", "bad", "good"];
  out.push(section("The data behind it", null, h("p", { class: "data-note" }, d.data_note)));
  out.push(section(...ttl(d, "analysis", "Deeper analysis", "Each finding is explained in plain terms first, then with the numbers."),
    h("div", { class: "analysis" }, d.analysis.map((a) => h("article", { class: a.tone ? `tone-${a.tone}` : "" }, h("h3", {}, a.title), a.lead ? h("p", { class: "lead-in" }, a.lead) : null, h("p", { class: "simple" }, a.simple), ...a.body.map((b) => h("p", {}, b)), a.table ? miniTable(a.table) : null))),
    charts.includes("phase") ? chartCard("Where the runs are won and lost", "In which phases does this team score, or save, more runs a match than an average team?",
      "Bars to the right are better than the league, bars to the left worse. Gaps under a run a match are small enough to be noise.", phaseChart(T.phases),
      h("div", { class: "legend-inline" }, h("span", {}, h("i", { style: "background:var(--lime)" }), "Better than the league"), h("span", {}, h("i", { style: "background:var(--red)" }), "Worse than the league"))) : null,
    phaseTable(T.phases),
    charts.includes("reliance") ? chartCard("How much does the top three carry?", "What share of the team's runs does the top three score, compared with the league?",
      "A bar above the dashed line means a more top-heavy team than usual. Amber marks a gap of more than three points.", relianceChart(T.reliance)) : null,
    h("h3", { style: "margin:26px 0 0;font-size:18px" }, "Who did what in 2026"), playersTable(T)));
  out.push(section(...ttl(d, "history", "Historical perspective", "Season by season, with what the runs say the record should have been."),
    h("div", { class: "analysis" }, h("article", {}, ...d.history.map((p) => h("p", {}, p)))),
    charts.includes("luck") ? chartCard("Wins against what the runs say", "Did the team win more or fewer games than its runs scored and conceded suggest?",
      "A solid bar taller than the dashed bar means the record flatters the team that year. A solid bar shorter than the dashed one means the team was unlucky or let games slip.", luckChart(T.seasons),
      h("div", { class: "legend-inline" }, h("span", {}, h("i", { style: "background:var(--lime)" }), "Won at least as many as expected"), h("span", {}, h("i", { style: "background:var(--red)" }), "Won fewer than expected"), h("span", {}, "Dashed bar: expected wins"))) : null,
    seasonTable(T.seasons)));
  out.push(section(...ttl(d, "matches", "Real match evidence", "Matches picked by a fixed rule from the ball-by-ball record, not hand-picked to flatter the story."), h("div", { class: "match-grid" }, d.matches.map(matchCard))));
  out.push(section(...ttl(d, "hidden", "The hidden story", "Things the data shows beyond the original question."), h("div", { class: "analysis" }, d.hidden.map((a) => h("article", {}, h("h3", {}, a.title), ...a.body.map((b) => h("p", {}, b)))))));
  out.push(section(...ttl(d, "counter", "Counterarguments", "What could challenge the conclusion, and how well it holds up."), h("div", { class: "counter" }, h("dl", {}, d.counter.map((c) => h("div", { class: "item" }, h("dt", {}, c.q), h("dd", {}, c.a)))))));
  out.push(section(...ttl(d, "implications", "Strategic implications", "What a franchise could do with this, each tied to a finding above."), h("ol", { class: "implications" }, d.implications.map((i) => h("li", {}, i))),
    h("div", { class: "verdict" }, h("h4", { class: "deep-h" }, "Final verdict"), h("p", {}, d.verdict))));
  out.forEach((el, i) => { if (kinds[i]) el.dataset.kind = kinds[i]; });
  return out;
}

function glossary(list) {
  return h("section", { class: "glossary reveal" }, h("h2", {}, "Plain-language glossary"), h("dl", {}, list.flatMap((g) => [h("div", {}, h("dt", {}, g.term), h("dd", {}, g.meaning))])));
}

function render(study, team, studies, index) {
  const seasons = team.seasons;
  const recent = seasons.slice(-5);
  const titles = seasons.filter((s) => s.champion).length;
  const playoffs = seasons.filter((s) => s.qualified).length;
  document.title = `${team.name}: ${study.headline} · StatEdge`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", study.dek);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${team.name}: ${study.headline}`);
  const pageUrl = `${location.origin}${location.pathname}?c=${study.slug}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", pageUrl);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", pageUrl);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", study.dek);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", `${team.name}: ${study.headline}`);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", study.dek);

  const prev = studies.cases[(index + studies.cases.length - 1) % studies.cases.length];
  const next = studies.cases[(index + 1) % studies.cases.length];
  const root = document.getElementById("case-root");
  root.classList.add("team", "team-page");
  root.setAttribute("style", teamStyle(team.code) || "");
  // A case study with a hook is told as a story: the original findings in brief, then the full story, then the closing insight and checklist.
  const story = Boolean(study.deep && study.deep.hook);
  const closing = [
    h("div", { class: "pull reveal" }, h("h4", {}, "The insight"), h("p", {}, study.insight)),
    h("h3", { style: "margin:36px 0 14px" }, "What I would check first"),
    h("ul", { class: "watch" }, study.watch.map((w) => h("li", {}, w))),
  ];
  root.replaceChildren(
    h("section", { class: "case-hero" },
      h("div", { class: "crumbs" }, h("a", { href: "index.html#cases" }, "Case studies"), " / ", `${team.name} · ${study.kicker}`),
      h("h1", {}, study.headline),
      h("p", { class: "lede" }, study.dek),
      h("div", { class: "kpis" },
        h("div", { class: `kpi ${team.rank <= 3 ? "good" : team.rank <= 7 ? "warn" : "bad"}` }, h("b", {}, `#${team.rank}`), h("span", {}, "2027 outlook rank")),
        h("div", { class: `kpi ${team.playoff_pct >= 45 ? "good" : team.playoff_pct >= 33 ? "warn" : "bad"}` }, h("b", {}, pct(team.playoff_pct, 0)), h("span", {}, "playoff chance")),
        h("div", { class: `kpi ${team.title_pct >= 11 ? "good" : team.title_pct >= 8 ? "warn" : "bad"}` }, h("b", {}, pct(team.title_pct, 0)), h("span", {}, "title chance")),
        h("div", { class: `kpi ${playoffs / seasons.length >= 0.6 ? "good" : playoffs / seasons.length >= 0.4 ? "warn" : "bad"}` }, h("b", {}, `${playoffs}/${seasons.length}`), h("span", {}, "playoff seasons in the data")),
        h("div", { class: `kpi ${titles >= 2 ? "good" : titles === 1 ? "info" : "bad"}` }, h("b", {}, String(titles)), h("span", {}, titles === 1 ? "title" : "titles")))),
    h("div", { class: "case-body" },
      h("article", {},
        ...(study.deep && study.deep.hook ? hookBlock(study.deep) : []),
        h("p", { class: "question" }, study.question),
        ...(study.deep ? deepIntro(study.deep) : []),
        h("div", { class: "card season-chart" },
          h("h3", { style: "font-size:18px;margin-bottom:2px" }, `${team.name}: strength by season`),
          h("p", { class: "hint", style: "margin:0 0 6px" }, "Runs a match above or below that season's league average. Dot = reached the playoffs, star = champions, faded bar = missed."),
          seasonChart(seasons)),
        h("div", { style: "margin-top:12px" }, ...study.evidence.map((e, i) => h("div", { class: "ev reveal" },
          h("span", { class: "n" }, String(i + 1).padStart(2, "0")), h("div", {}, h("h3", {}, e.title), h("p", {}, e.body))))),
        ...(story ? deepSections(study, study.deep) : []),
        ...closing,
        ...(!story && study.deep ? deepSections(study, study.deep) : []),
        h("div", { class: "takeaway reveal" }, study.takeaway),
        ...(study.deep && studies.glossary ? [glossary(studies.glossary)] : [])),
      h("aside", { class: "side" },
        phaseCard(team), xiCard(team),
        h("div", { class: "card" }, h("h3", {}, "Last five seasons"),
          ...recent.map((s) => h("div", { class: "phase", style: "grid-template-columns:48px 1fr auto" },
            h("span", { class: "mono" }, s.year), h("span", { class: "muted" }, `${Math.round(s.win_share * 100)}% wins${s.champion ? " · champions" : s.qualified ? " · playoffs" : ""}`), h("b", {}, signed(s.strength)))),
          h("p", { class: "fineprint", style: "margin:10px 0 0" }, "Right column: runs a match vs the league average.")),
        h("button", { class: "btn no-print", type: "button", onclick: () => window.print() }, "Save as PDF"))),
    h("nav", { class: "case-nav", "aria-label": "Other case studies" },
      h("a", { href: `case.html?c=${prev.slug}` }, h("small", {}, "← Previous"), h("b", {}, prev.headline)),
      h("a", { href: `case.html?c=${next.slug}` }, h("small", {}, "Next →"), h("b", {}, next.headline))),
    h("div", { style: "height:56px" }));
  fillBars(root);
  initReveal();
  withMotion((m) => { m.intro(".case-hero > *:not(.kpis)"); m.intro(".kpis > div"); });
}

async function main() {
  const root = document.getElementById("case-root");
  try {
    const [data, studies, prof] = await Promise.all([loadJSON("data/showcase.json"), loadJSON("data/case-studies.json"), loadJSON("data/profile.json")]);
    document.querySelectorAll("[data-name]").forEach((n) => { n.textContent = prof.name; });
    const code = (new URLSearchParams(location.search).get("c") || studies.cases[0].slug).toLowerCase();
    const index = studies.cases.findIndex((c) => c.slug === code);
    if (index < 0) {
      root.replaceChildren(h("div", { class: "case-hero" }, h("h1", {}, "Case study not found"), h("p", { class: "lede" }, "That link does not match a case study."), h("a", { class: "btn primary", href: "index.html#cases" }, "See all case studies")));
      return;
    }
    const study = studies.cases[index];
    const team = data.teams.find((t) => t.name === study.team);
    render(study, team, studies, index);
  } catch (err) {
    root.replaceChildren(h("div", { class: "error", role: "alert" }, h("p", { style: "margin:0" }, "We couldn't load this case study just now. Check your connection and try again."), h("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Try again")));
  }
}
main();
