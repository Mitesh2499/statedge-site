import { loadJSON, h, s, initTheme, initNav, initReveal, initContacts } from "./common.js";

initTheme();
initNav();

const sg = (v, d = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const nf = (v) => Number(v).toLocaleString("en-GB");
const SVGW = 640;

/* ---------- charts ---------- */

/** Horizontal ranges around zero: dot = best estimate, line = the range the data allows. Green: stays above zero. Red: stays below. Grey: includes zero. */
function rangeChart(rows, { label = "", zeroNote = ["worse", "better"], min = null, max = null, rowH = 30, labelW = 170 } = {}) {
  const lo = Math.min(min ?? 0, ...rows.map((r) => r.lo)), hi = Math.max(max ?? 0, ...rows.map((r) => r.hi));
  const pad = (hi - lo) * 0.06 || 1;
  const a = lo - pad, b = hi + pad, W = SVGW, left = labelW, right = 14, top = 10;
  const x = (v) => left + ((v - a) / (b - a)) * (W - left - right);
  const H = top + rows.length * rowH + 34;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label, class: "chart" });
  svg.append(s("line", { x1: x(0), x2: x(0), y1: top - 4, y2: top + rows.length * rowH, class: "zero" }));
  rows.forEach((r, i) => {
    const y = top + i * rowH + rowH / 2;
    const cls = r.pooled ? "pooled" : r.lo > 0 ? "up" : r.hi < 0 ? "down" : "flat";
    const g = s("g", { class: `rg ${cls}` });
    g.append(s("text", { x: left - 10, y: y + 4, "text-anchor": "end", class: "lab" }, r.label));
    g.append(s("line", { x1: x(r.lo), x2: x(r.hi), y1: y, y2: y, class: "rng" }));
    g.append(r.pooled ? s("polygon", { points: `${x(r.v) - 7},${y} ${x(r.v)},${y - 7} ${x(r.v) + 7},${y} ${x(r.v)},${y + 7}`, class: "dot" }) : s("circle", { cx: x(r.v), cy: y, r: 5, class: "dot" }));
    g.append(s("title", {}, `${r.label}: ${sg(r.v)} (range ${sg(r.lo)} to ${sg(r.hi)})${r.note ? ". " + r.note : ""}`));
    svg.append(g);
  });
  svg.append(s("text", { x: x(0) - 8, y: H - 10, "text-anchor": "end", class: "axis" }, `← ${zeroNote[0]}`), s("text", { x: x(0) + 8, y: H - 10, class: "axis" }, `${zeroNote[1]} →`));
  return svg;
}

/** Vertical bars with a value label, for rates and counts. */
function barChart(rows, { label = "", unit = "%", ref = null, min = 0, max = null, height = 210 } = {}) {
  const W = SVGW, H = height, left = 40, bottom = 44, top = 22;
  const hi = max ?? Math.max(...rows.map((r) => r.v)) * 1.18;
  const y = (v) => top + (1 - (v - min) / (hi - min)) * (H - top - bottom);
  const bw = Math.min(110, (W - left - 10) / rows.length - 18);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label, class: "chart" });
  if (ref !== null) svg.append(s("line", { x1: left, x2: W - 10, y1: y(ref), y2: y(ref), class: "refline" }), s("text", { x: W - 12, y: y(ref) + 13, "text-anchor": "end", class: "axis" }, `${ref}${unit} (all teams)`));
  svg.append(s("line", { x1: left, x2: W - 10, y1: y(Math.max(min, 0)), y2: y(Math.max(min, 0)), class: "zero" }));
  rows.forEach((r, i) => {
    const cx = left + ((i + 0.5) * (W - left - 10)) / rows.length;
    const base = y(Math.max(min, 0)), top0 = Math.min(y(r.v), base), hgt = Math.max(Math.abs(y(r.v) - base), 1.5);
    svg.append(s("rect", { x: cx - bw / 2, y: top0, width: bw, height: hgt, rx: 6, class: `bar ${r.v < 0 ? "neg" : ""} ${r.cls || ""}` }),
      s("text", { x: cx, y: r.v < 0 ? top0 + hgt + 18 : top0 - 7, "text-anchor": "middle", class: "val" }, `${r.v > 0 && unit !== "%" ? "+" : ""}${f1(r.v)}${unit}`),
      s("text", { x: cx, y: H - 24, "text-anchor": "middle", class: "lab" }, r.label), s("text", { x: cx, y: H - 10, "text-anchor": "middle", class: "axis" }, r.sub || ""));
  });
  return svg;
}

/** Title chances against how much of a team's batting is in left-right pairs: central estimate with the range from the smallest to the largest plausible effect. */
function titleChart(D, key = "title_pct", label = "Chance of winning the title (%)") {
  const sc = D.scenarios, W = SVGW, H = 250, left = 46, right = 16, top = 16, bottom = 42;
  const vals = sc.flatMap((r) => [r.low[key], r.central[key], r.high[key]]);
  const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.5, hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.5;
  const x = (i) => left + (i / (sc.length - 1)) * (W - left - right), y = (v) => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label, class: "chart" });
  for (let t = Math.ceil(lo); t <= hi; t += 1) svg.append(s("line", { x1: left, x2: W - right, y1: y(t), y2: y(t), class: "grid" }), s("text", { x: left - 6, y: y(t) + 4, "text-anchor": "end", class: "axis" }, `${t}`));
  const band = sc.map((r, i) => `${x(i)},${y(r.high[key])}`).concat(sc.map((r, i) => `${x(sc.length - 1 - i)},${y(sc[sc.length - 1 - i].low[key])}`)).join(" ");
  svg.append(s("polygon", { points: band, class: "band" }), s("polyline", { points: sc.map((r, i) => `${x(i)},${y(r.central[key])}`).join(" "), class: "line" }));
  sc.forEach((r, i) => svg.append(s("circle", { cx: x(i), cy: y(r.central[key]), r: 4, class: "pt" }), s("text", { x: x(i), y: H - 22, "text-anchor": "middle", class: "lab" }, `${r.mixed_share}%`)));
  svg.append(s("text", { x: (left + W - right) / 2, y: H - 6, "text-anchor": "middle", class: "axis" }, "Share of the team's batting done in left-right pairs"), s("text", { x: 4, y: 12, class: "axis" }, label));
  return svg;
}

/** For each tournament: the share of champions with a feature (dot, with its range) against the share of all teams with it (tick). */
function shareChart(rows, key, label) {
  const W = SVGW, left = 215, right = 16, top = 8, rowH = 32, H = top + rows.length * rowH + 36;
  const x = (v) => left + (v / 100) * (W - left - right);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": label, class: "chart" });
  [0, 25, 50, 75, 100].forEach((t) => svg.append(s("line", { x1: x(t), x2: x(t), y1: top, y2: top + rows.length * rowH, class: "grid" }), s("text", { x: x(t), y: H - 22, "text-anchor": "middle", class: "axis" }, `${t}%`)));
  rows.forEach((r, i) => {
    const d = r[key], y = top + i * rowH + rowH / 2;
    const g = s("g", { class: "rg" });
    g.append(s("text", { x: left - 10, y: y + 4, "text-anchor": "end", class: "lab" }, `${r.name} (${d.champions_with} of ${d.champions_n})`));
    g.append(s("line", { x1: x(d.ci[0]), x2: x(d.ci[1]), y1: y, y2: y, class: "rng", style: "stroke:var(--amber)" }), s("circle", { cx: x(d.champions_pct), cy: y, r: 5.5, style: "fill:var(--amber)" }),
      s("line", { x1: x(d.base_pct), x2: x(d.base_pct), y1: y - 9, y2: y + 9, style: "stroke:var(--text);stroke-width:2.5" }));
    g.append(s("title", {}, `${r.name}: ${d.champions_pct}% of champions (${d.champions_with} of ${d.champions_n}, range ${d.ci[0]}% to ${d.ci[1]}%) against ${d.base_pct}% of all teams`));
    svg.append(g);
  });
  svg.append(s("text", { x: left, y: H - 6, class: "axis" }, "dot = champions (with the range the data allows);  tick = all teams"));
  return svg;
}

function table(head, rows, cls = "") {
  return h("div", { class: "tbl" }, h("table", { class: cls }, h("thead", {}, h("tr", {}, head.map((c) => h("th", {}, c)))), h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, c ?? "–")))))));
}

const fig = (title, note, chart, foot) => h("figure", { class: "fig card" }, h("figcaption", {}, h("b", {}, title), h("span", {}, note)), chart, foot ? h("p", { class: "fineprint" }, foot) : null);
const p = (t) => h("p", {}, t);
const chapter = (n, title, ...kids) => h("section", { class: "chapter reveal", id: `c${n}` }, h("span", { class: "eyebrow" }, `Chapter ${n}`), h("h2", {}, title), ...kids);

/* ---------- the article ---------- */

function build(D) {
  const H = D.headline, T = D.totals;
  const spin = D.bowlers.find((b) => b.label === "Against spin"), pace = D.bowlers.find((b) => b.label === "Against pace");
  const mid = D.phases.find((x) => x.label === "Middle overs");
  const sc30 = D.scenarios.find((r) => r.mixed_share === 30), sc50 = D.scenarios.find((r) => r.mixed_share === 50), sc65 = D.scenarios.find((r) => r.mixed_share === 65);
  const G = D.groups, Q = D.qualification, split = D.team_level.ipl_split, tw = D.team_level.win_points_per_10;
  const open = D.team_level.ipl_opening, fc = D.forecast_check;
  const champCells = D.seasons.flatMap((S) => (S.champion && S.champion.mixed !== null && !S.champion.mixed_note && S.champion.rel !== null && S.champion.rel !== undefined ? [{ year: S.year, ...S.champion }] : []));
  const lowC = champCells.reduce((a, c) => (a === null || c.rel < a.rel ? c : a), null), highC = champCells.reduce((a, c) => (a === null || c.rel > a.rel ? c : a), null);
  const gain = (k) => sc65[k].title_pct - sc30[k].title_pct;
  const covs = D.competitions.map((c) => c.coverage), iplCov = (D.competitions.find((c) => c.name === "IPL") || {}).coverage;
  const expo = D.exposure, expoVals = expo.map((e) => e.runs_vs_reference);
  const expoLow = expo.reduce((a, e) => (e.runs_vs_reference < a.runs_vs_reference ? e : a)), expoHigh = expo.reduce((a, e) => (e.runs_vs_reference > a.runs_vs_reference ? e : a));
  const expoSteady = expoVals.slice(1).filter((v, i) => v > expoVals[i]).length === expoVals.length - 1;
  const fcGain = fc.rows[1].brier - fc.rows[2].brier, fcBeatsCoin = fc.rows[1].brier < fc.rows[0].brier - 0.002;
  const moreFewer = (v) => (v < 0 ? "fewer" : "more");
  const root = document.getElementById("article-root");
  root.replaceChildren();

  root.append(h("header", { class: "a-head" },
    h("span", { class: "eyebrow" }, "StatEdge · Research"),
    h("h1", {}, "The Left-Right Theory: Can One Batting Combination Really Change Who Wins the IPL Trophy?"),
    h("p", { class: "lede" }, `Every captain has heard it: keep a left-hander and a right-hander together and the bowler never settles. We tested it on ${nf(T.balls)} balls from ${nf(T.matches)} matches in ${T.competitions} competitions, then asked the question fans actually care about: does it win trophies?`),
    h("div", { class: "answer" },
      h("div", {}, h("b", {}, sg(H.v)), h("span", {}, "runs per 100 balls: what a left-right pair scores over a same-hand pair")),
      h("div", {}, h("b", {}, `≈ ${f1(H.per_innings)}`), h("span", {}, "runs an innings if every ball were faced by mixed pairs")),
      h("div", {}, h("b", {}, `${sg(sc65.central.title_pct - sc30.central.title_pct, 1)} pts`), h("span", {}, "change in an average team's title chance from the least to the most left-right batting we tested"))),
    h("p", { class: "verdict" }, h("b", {}, "The short answer: "), "a real but small scoring edge, concentrated against spin, that does not show up in qualification or championships. Champions did not open left-right more often than other teams, though almost all had a left-hander in their top three.")));

  root.append(chapter(1, "The belief",
    p("\"Good, a left-right combination.\" You will hear it within two overs of almost any T20 innings. The logic is easy to picture. A bowler has to move his line and length for each new batter on strike, the captain keeps resetting the field, and the pair, the story goes, feels more comfortable."),
    p("It is one of cricket's most repeated beliefs, and it has a natural cost: batting orders get shuffled, and sometimes a weaker batter is picked because he bats with the other hand. Whether that cost is worth paying depends on one thing, how much the pairing is really worth. So we measured it.")));

  root.append(chapter(2, "The evidence: what 2.13 million balls show",
    p(`For every ball a batter faced, we recorded who was on strike, who was at the other end, whether each bats left- or right-handed, who was bowling, and what happened. A pair is mixed (one of each) or same-hand (two right-handers or two left-handers). We then compared each batter with himself, with the bowler and the stage of the innings kept the same, so that stronger batters, particular bowlers or a particular stage of the game could not fake the result.`),
    p(`The answer: a left-right pair scores ${sg(H.v)} runs per 100 balls more than a same-hand pair, and the range the data allows runs from ${sg(H.lo)} to ${sg(H.hi)}. That is real, since the range stays above zero, but small. ${H.agree} of the ${H.of} competitions point the same way.`),
    fig("The left-right edge, competition by competition", "Runs per 100 balls a left-right pair scores over a same-hand pair. Green: the range stays above zero. Grey: it includes zero. The diamond is all competitions together.",
      rangeChart([...D.competitions.map((c) => ({ label: c.name, v: c.v, lo: c.lo, hi: c.hi, note: `Batting hand known for ${c.coverage}% of balls; ${nf(c.matches)} matches` })), { label: "All competitions", v: H.v, lo: H.lo, hi: H.hi, pooled: true }], { label: "Left-right advantage by competition", zeroNote: ["same-hand better", "left-right better"] }),
      "Competitions where batting hands are recorded for fewer balls (T20 Blast, Syed Mushtaq Ali, internationals) have wider ranges. Big Bash is the clearest single competition; The Hundred and SA20 are too small to call."),
    fig("What a left-right pair does differently", "Per 100 balls, left-right pair minus same-hand pair, all competitions together. Whisker: the range the data allows.",
      rangeChart(D.effects.map((e) => ({ label: `${e.label}`, v: e.v, lo: e.lo, hi: e.hi, note: e.unit })), { label: "Effects of a left-right pair", zeroNote: ["fewer", "more"], labelW: 150 }),
      "Wickets: no measurable difference. Left-right pairs score faster, hit slightly more boundaries and play slightly fewer dot balls, but they are not safer.")));

  root.append(chapter(3, "The tactical explanation: why it might work, and where it does",
    p("Picture a bowler defending 45 runs in the last four overs against a left-right pair. Every ball, the angle he has to attack changes. The captain either keeps the field and gives away a side, or moves fielders and reopens the gaps behind them. The yorker that was perfect for the right-hander is a half-volley outside the left-hander's leg stump. Each reset costs a fraction of accuracy."),
    p(`The data cannot see line, length or field placings, so we cannot say that is what happens. It does show footprints the explanation predicts: bowlers send down about ${D.effects.find((e) => e.label.startsWith("Wides")).v.toFixed(2)} more wides and no-balls per 100 deliveries to a mixed pair, and the pair hits more boundaries. The sharper clue is where the edge appears.`),
    fig("Where the edge lives", "Left-right pair minus same-hand pair, in runs per 100 balls, by type of bowling and by stage of the innings.",
      rangeChart([...D.bowlers.map((b) => ({ label: b.label, v: b.v, lo: b.lo, hi: b.hi })), ...D.phases.map((b) => ({ label: b.label, v: b.v, lo: b.lo, hi: b.hi }))], { label: "Left-right advantage by bowling type and phase", zeroNote: ["same-hand better", "left-right better"], labelW: 190 }),
      `Against spin a left-right pair scores ${sg(spin.v)} runs per 100 balls more (range ${sg(spin.lo)} to ${sg(spin.hi)}). Against pace it is ${sg(pace.v)}, no difference. By phase, the middle overs show the clearest lean (${sg(mid.v)}), but none of the three phase ranges rules out zero.`),
    p("That fits cricket sense. A spinner turns the ball away from one hand and into the other, so an opposite-handed pair gives him an awkward matchup every second ball and takes away his easiest plan. A fast bowler's angle changes, but he can still hit his length. The edge is a spin edge. It also showed no difference between left-arm and right-arm bowlers.")));

  const seasonRow = (S) => {
    const c = S.champion, r = S.runner_up, o = S.other_qualifiers, m = S.missed;
    const cell = (t) => (t ? h("span", {}, h("b", {}, t.team), h("small", {}, `${t.mixed === null ? "mix n/a" : `${t.mixed}% mixed${t.mixed_note ? "*" : ""}`} · ${t.opening === "Left + right" ? "L+R open" : t.opening === "Two right-handers" ? "RR open" : t.opening === "Two left-handers" ? "LL open" : "open n/a"} · SR ${t.sr}`)) : "–");
    return [S.year, cell(c), cell(r), o.n ? `${o.mixed ?? "n/a"}${o.mixed !== null ? "%" : ""} · SR ${o.sr}` : "–", m.n ? `${m.mixed ?? "n/a"}${m.mixed !== null ? "%" : ""} · SR ${m.sr}` : "–"];
  };

  root.append(chapter(4, "The match-winning question",
    p(`Scoring faster is not the same as winning. The honest conversion: across team seasons, every extra run per match is worth about ${f1(D.win_points_per_run)} percentage points of win probability. If an entire innings of about ${Math.round(D.balls_per_innings)} balls were batted in left-right pairs instead of same-hand pairs, that is roughly ${f1(H.per_innings)} runs, or about ${f1(H.win_points_per_innings)} points of win probability. Teams are never wholly one or the other, so the real gain is a fraction of that.`),
    p(`Directly across teams, the evidence is thin. Adding 10 percentage points of left-right batting moves a team's win rate by ${sg(tw.estimate, 1)} points (range ${sg(tw.ci[0], 1)} to ${sg(tw.ci[1], 1)}) once the team's own strength is held fixed. In the IPL, the gap is ${sg(split.batting_first.win_pts_per_10pts, 1)} points when a team bats first and ${sg(split.chasing.win_pts_per_10pts, 1)} when it chases. The chasing figure is the one that stands out, about ${f1(split.chasing.win_pts_per_10pts / split.chasing.se)} times its own margin of error, but with ${split.chasing.innings} innings it ${Math.abs(split.chasing.win_pts_per_10pts / split.chasing.se) >= 2 ? "is a real difference" : "cannot be told from chance"}.`),
    fig("Win rate of IPL teams that open with each pair", "Observed share of matches won by IPL sides, by their opening pair.", barChart(open.map((o) => ({ label: o.label.replace("Left + right openers", "Left + right").replace("Two right-handers", "Two right").replace("Two left-handers", "Two left"), sub: `${o.innings} innings`, v: o.win })), { label: "IPL win rate by opening pair", ref: 50, min: 40, max: 60 }),
      `Left-right openers won ${f1(open[0].win)}% against ${f1(open[1].win)}% for two right-handers. The gap is ${sg(D.team_level.ipl_opening_gap.points, 1)} points with a range of ${sg(D.team_level.ipl_opening_gap.lo, 1)} to ${sg(D.team_level.ipl_opening_gap.hi, 1)}: not established.`)));

  const champs = h("details", { class: "season-table" }, h("summary", {}, "Season by season: champion, runner-up and the rest, 2008 to 2026"),
    table(["Season", "Champion", "Runner-up", "Other playoff teams (average)", "Missed the playoffs (average)"], D.seasons.map(seasonRow)),
    h("p", { class: "fineprint" }, "Mixed % is the share of balls the team's batting spent in left-right pairs in league matches. SR is the team's batting strike rate. * means batting hands were recorded for fewer than 60% of that team's balls; n/a means fewer than 40%, so no figure is shown."));
  root.append(chapter(5, "The playoff question",
    p(`Take every team-season since 2008 and rank it against its own season's average for left-right batting. If balance helped teams qualify, the high group should qualify more often than the low group. It does not. ${Q.bands[0].team_seasons} low-usage team-seasons qualified ${f1(Q.bands[0].qualification_rate)}% of the time, medium-usage ${f1(Q.bands[1].qualification_rate)}% and high-usage ${f1(Q.bands[2].qualification_rate)}%. The pattern is not even a steady climb.`),
    fig("Playoff rate by how much of a team's batting was in left-right pairs", "Within each season, team-seasons split into thirds by their left-right share.", barChart(Q.bands.map((b) => ({ label: b.label.replace(" mixed-pair usage", ""), sub: `${b.qualified} of ${b.team_seasons}`, v: b.qualification_rate })), { label: "Playoff rate by left-right usage", ref: 47, min: 0, max: 70 }),
      `Allowing for each team's record over the three previous seasons, 10 more points of left-right batting changes the odds of qualifying by ${Math.round((Q.adjusted.odds_ratio_per_10pts - 1) * 100)}% (range ${Math.round((Q.adjusted.ci[0] - 1) * 100)}% to +${Math.round((Q.adjusted.ci[1] - 1) * 100)}%), which is no reliable effect. Past record is itself a weak guide in the IPL, so the adjustment is rough.`),
    h("p", { class: "fineprint" }, `Adjusted chance of qualifying for an average team: ${Q.adjusted.low_adjusted_qualification}% (low usage), ${Q.adjusted.medium_adjusted_qualification}% (medium), ${Q.adjusted.high_adjusted_qualification}% (high). The ordering is the opposite of the theory and the differences are far inside the noise.`)));

  const OP = D.openers, ipl = OP.tournaments.find((t) => t.name === "IPL"), club = OP.club, all = OP.overall;
  const pc = (v) => (v === null || v === undefined ? "–" : `${f1(v)}%`);
  const rowsOp = [all, club, ...OP.tournaments.filter((t) => t.champions >= 2)];
  root.append(chapter(6, "The opening-pair question: do winners open left-right?",
    p("Cricket fans love the examples. Chennai Super Kings opened with Matthew Hayden and Murali Vijay in 2010, Vijay and Michael Hussey in 2011, and Ruturaj Gaikwad and Devon Conway in 2023: a left-hander and a right-hander each time. India's 2026 T20 World Cup final opened with Sanju Samson and Abhishek Sharma, again one of each. The stories write themselves."),
    p("The records add a twist. CSK's 2018 final was opened by Shane Watson and Faf du Plessis, and their 2021 final by Gaikwad and du Plessis: right-hander and right-hander both times. Royal Challengers Bengaluru's 2025 final pair, Phil Salt and Virat Kohli, are both recorded as right-handers too. Winners come in every shape, and memory keeps the neat ones."),
    p(`So we did it properly. For every team in every tournament season, we found the pair it opened with most often, and whether its top three (the first three batters to the crease) included a left-hander. Then we asked how often champions, finalists and playoff teams had each. The key is the base rate: ${f1(all.open.base_pct)}% of all teams opened left-right, so a champion doing it proves little unless it happens clearly more often than that.`),
    fig("Did champions open left-right more than everyone else?", "Share of champions whose usual opening pair was left + right (dot, with its range), against the share of all teams (tick).", shareChart(rowsOp, "open", "Champions who opened left-right"),
      `In the IPL, ${ipl.open.champions_with} of ${ipl.open.champions_n} champions with recorded hands (${pc(ipl.open.champions_pct)}) usually opened left-right, against ${pc(ipl.open.base_pct)} of all IPL teams: no difference. Across all tournaments it is ${all.open.champions_with} of ${all.open.champions_n} (${pc(all.open.champions_pct)}) against ${pc(all.open.base_pct)}, a gap that could easily be chance (p = ${all.open.p}).`),
    p(`The qualification record says the same. Across ${all.team_seasons} team-seasons, teams that usually opened left-right reached the playoffs ${pc(all.open.qualified_with)} of the time, against ${pc(all.open.qualified_without)} for teams that opened with two of the same hand. In the IPL it was ${pc(ipl.open.qualified_with)} against ${pc(ipl.open.qualified_without)}. Opening left-right did not make a team more likely to qualify.`),
    h("h3", {}, "The top three is where the pattern shows"),
    p(`Look wider than the opening pair and something does appear. Having at least one left-hander in the top three is the norm: ${pc(all.top3.base_pct)} of all teams have one. But champions have one almost always: ${all.top3.champions_with} of ${all.top3.champions_n} (${pc(all.top3.champions_pct)}) across all tournaments, ${club.top3.champions_with} of ${club.top3.champions_n} (${pc(club.top3.champions_pct)}) in the club tournaments (p = ${club.top3.p}), and all ${ipl.top3.champions_with} of ${ipl.top3.champions_n} IPL champions with recorded hands.`),
    fig("Did champions have a left-hander in the top three more than everyone else?", "Share of champions with at least one left-hander among their first three batters (dot, with its range), against all teams (tick).", shareChart(rowsOp, "top3", "Champions with a left-hander in the top three"),
      `IPL: champions ${pc(ipl.top3.champions_pct)}, finalists ${pc(ipl.top3.finalists_pct)}, other playoff teams ${pc(ipl.top3.qualifiers_pct)}, teams that missed out ${pc(ipl.top3.missed_pct)}. The ladder points the right way, but with ${ipl.top3.champions_n} champions the IPL result alone (p = ${ipl.top3.p}) is not conclusive.`),
    p(`This is a modest signal, not a law. It is clearest in the club tournaments taken together, borderline across everything, and it does not carry over to qualification: teams with a left-hander in the top three reached the playoffs ${pc(all.top3.qualified_with)} of the time and teams without one ${pc(all.top3.qualified_without)}. A left-hander in the top three is very close to a requirement for winning, but it is also nearly universal, so it cannot explain much by itself.`),
    table(["Tournament", "Champions", "Opened left-right: champions (all teams)", "Left-hander in top three: champions (all teams)", "Qualified: left-right openers vs same-hand"], rowsOp.map((t) => [t.name, t.champions, `${pc(t.open.champions_pct)} (${pc(t.open.base_pct)})`, `${pc(t.top3.champions_pct)} (${pc(t.top3.base_pct)})`, t.open.qualified_with === null ? "–" : `${pc(t.open.qualified_with)} vs ${pc(t.open.qualified_without)}`])),
    h("p", { class: "fineprint" }, "Small tournaments have only two to ten champions, so their percentages move a lot with one result. The International row covers multi-team events with enough recorded hands, including qualifiers."),
    h("h3", {}, "Three set-ups, side by side"),
    p(`Put every innings into one of three cases. Case A: the openers are a left-right pair. Case B: the openers are not, but a left-hander comes in somewhere in the top three. Case C: no left-hander in the top three at all. That is ${nf(OP.setups.innings)} innings from ${OP.setups.tournaments} tournaments.`),
    table(["Set-up", "Innings", "Matches won", "Runs", "Powerplay runs", "First-wicket stand"], [["A. Left-right openers", "left_right_opening"], ["B. Left-hander in the top three, openers not left-right", "left_hander_in_top3"], ["C. No left-hander in the top three", "no_left_hander"]].map(([lab, k]) => { const r = OP.setups.raw_overall[k]; return [lab, nf(r.innings), `${f1(r.win_pts)}%`, f1(r.runs), f1(r.powerplay_runs), f1(r.first_stand_runs)]; })),
    p(`Win rates are the same to within a third of a point: ${f1(OP.setups.raw_overall.left_right_opening.win_pts)}%, ${f1(OP.setups.raw_overall.left_hander_in_top3.win_pts)}% and ${f1(OP.setups.raw_overall.no_left_hander.win_pts)}%. The raw scoring shows innings with a left-hander in the top three averaging ${f1(OP.setups.raw_overall.left_right_opening.runs - OP.setups.raw_overall.no_left_hander.runs)} to ${f1(OP.setups.raw_overall.left_hander_in_top3.runs - OP.setups.raw_overall.no_left_hander.runs)} more runs than innings with none. But compare each team with itself and that gap goes: ${sg(OP.setups.adjusted.runs.any_left_hander.v, 1)} runs (range ${sg(OP.setups.adjusted.runs.any_left_hander.lo, 1)} to ${sg(OP.setups.adjusted.runs.any_left_hander.hi, 1)}). Part of the raw gap probably reflects which teams carry left-handers (stronger line-ups), not the left-hander himself.`),
    fig("What each set-up is worth against having no left-hander in the top three", "Same team, same season. Dot: best estimate. Line: the range the data allows. Green: stays above zero. Grey: includes zero.",
      rangeChart([["Win rate (points)", "win_pts"], ["Runs in the innings", "runs"], ["Powerplay runs", "powerplay_runs"], ["First-wicket stand (runs)", "first_stand_runs"]].flatMap(([lab, k]) => [["left-right openers", "left_right_opening"], ["lefty in top 3", "left_hander_in_top3"]].map(([g, key]) => ({ label: `${lab} (${g})`, v: OP.setups.adjusted[k][key].v, lo: OP.setups.adjusted[k][key].lo, hi: OP.setups.adjusted[k][key].hi, note: g }))), { label: "Set-up effects", zeroNote: ["worse than no left-hander", "better"], labelW: 300 }),
      "Every range includes zero. Win-rate points and runs are per innings; the win-rate ranges are wide because a team's single match is a noisy outcome."),
    p(`In plain terms: if the openers are left-right, the team does not win more (${sg(OP.setups.adjusted.win_pts.left_right_opening.v, 1)} points, range ${sg(OP.setups.adjusted.win_pts.left_right_opening.lo, 1)} to ${sg(OP.setups.adjusted.win_pts.left_right_opening.hi, 1)}) and gets about ${sg(OP.setups.adjusted.powerplay_runs.left_right_opening.v, 1)} extra powerplay runs, which is nothing. If there is a left-hander in the top three but the openers are not left-right, it is no different (${sg(OP.setups.adjusted.win_pts.left_hander_in_top3.v, 1)} points). And if there is no left-hander in the top three, the team is no worse off than the others, once its own strength is held fixed. None of the three set-ups is a winning recipe.`),
    h("h3", {}, "How did the left-right openers win, if they did?"),
    p(`If an opening pair of one of each helped, it should show in the powerplay or the first stand. Across the tournaments, innings opened left-right scored ${sg(OP.pooled.powerplay_runs.estimate, 1)} powerplay runs and ${sg(OP.pooled.first_stand.estimate, 1)} first-wicket runs more than same-hand openers, with each team's own strength held fixed. Both ranges include zero. On match results, left-right openers won ${sg(OP.pooled.win_points.estimate, 1)} points more (range ${sg(OP.pooled.win_points.ci[0], 1)} to ${sg(OP.pooled.win_points.ci[1], 1)}): no reliable difference. In the IPL, unadjusted, left-right openers won ${f1(OP.ipl_match.left_right.win_pct)}% of their matches against ${f1(OP.ipl_match.right_right.win_pct)}% for two right-handers.`),
    p("So the opening pair is probably not where the left-right edge is earned. It shows up later, in the middle overs against spin."),
    h("details", { class: "season-table" }, h("summary", {}, "Every IPL champion's final opening pair (L = left-hander, R = right-hander)"),
      table(["Season", "Champion", "Opened the final with", "Usual opening", "Left-hander in top three"], OP.ipl_cards.map((c) => [c.year, c.team, c.final, `${c.usual}${c.lr_share !== null ? ` (${Math.round(c.lr_share)}% of innings)` : ""}`, c.top3_left === null ? "n/a" : `${Math.round(c.top3_left)}% of innings`])),
      h("p", { class: "fineprint" }, "Where a player's batting hand is not recorded, the table says so, and the team is left out of the percentages. 'Usual opening' is the pair type used in most league-stage innings.")),
    h("details", { class: "season-table" }, h("summary", {}, "T20 World Cup winners' final opening pairs (the World Cups with enough recorded data)"),
      table(["Tournament", "Winner", "Opened the final with"], OP.world_cups.map((c) => [c.event.replace("ICC Men's ", "").replace("ICC ", ""), c.team, c.final])),
      h("p", { class: "fineprint" }, `${OP.world_cups.length} of the ten men's T20 World Cups have enough recorded batting hands to list here; the others are not shown rather than guessed.`))));

  root.append(chapter(7, "The championship question: what the champions show",
    p(`Across 19 seasons there are ${G.champions.n} champions with usable batting-hand records. They spent ${sg(G.champions.mean, 1)} points of their batting in left-right pairs compared with their own season's average, runners-up ${sg(G.runners_up.mean, 1)}, other playoff teams ${sg(G.other_qualifiers.mean, 1)}, and teams that missed out ${sg(G.missed_out.mean, 1)}. Champions were not distinguishable from teams that missed the playoffs (difference ${sg(G.champions_vs_missed.diff, 1)}, range ${sg(G.champions_vs_missed.ci[0], 1)} to ${sg(G.champions_vs_missed.ci[1], 1)}).`),
    fig("Left-right batting relative to the season average", "Average points above or below the season's average share of batting in left-right pairs, by how far the team went.", barChart([
      { label: "Champions", sub: `${G.champions.n} teams`, v: G.champions.mean, cls: "gold" }, { label: "Runners-up", sub: `${G.runners_up.n} teams`, v: G.runners_up.mean }, { label: "Other playoff teams", sub: `${G.other_qualifiers.n} teams`, v: G.other_qualifiers.mean }, { label: "Missed out", sub: `${G.missed_out.n} teams`, v: G.missed_out.mean }].map((r) => ({ ...r, v: r.v })), { label: "Left-right batting by finish", unit: " pts", min: -8, max: 8, height: 230 }),
      "Teams with batting hands recorded for under 40% of their balls are left out. The era split (2008-15, 2016-20, 2021-26) shows no consistent direction either."),
    champs,
    p(lowC && highC ? `Champions come in every shape. ${lowC.team} won in ${lowC.year} with about ${lowC.mixed}% left-right batting, ${f1(Math.abs(lowC.rel))} points ${lowC.rel < 0 ? "below" : "above"} the league. ${highC.team} won in ${highC.year} with ${highC.mixed}%, ${f1(Math.abs(highC.rel))} points ${highC.rel < 0 ? "below" : "above"}. If the combination decided championships, a spread this wide between champions would be hard to explain.` : "Champions come in every shape.")));

  const rows3 = [["Same-hand-heavy XI", sc30], ["Balanced XI", sc50], ["High left-right XI", sc65]];
  root.append(chapter(8, "The experiment: replaying the season 50,000 times",
    p(`To isolate the batting mix, we took an average IPL team and replayed its season 50,000 times, changing only how much of its batting is done in left-right pairs. Every replay includes the full league (14 matches each), the top four, the qualifier, eliminator and final. The scoring edge is the study's own figure; the conversion from runs to wins is the one above; the spread between teams matches real IPL seasons. We ran it at the central edge (${sg(H.v)} runs per 100 balls) and at both ends of its range (${sg(H.lo)} and ${sg(H.hi)}).`),
    fig("Title chance against left-right batting", "Average team. Line: central estimate. Shaded: the range from the smallest to the largest plausible edge.", titleChart(D, "title_pct", "Title chance (%)")),
    table(["Batting mix", "Left-right share", "Expected wins (of 14)", "Playoffs", "Final", "Title"], rows3.map(([n, r]) => [n, `${r.mixed_share}%`, f1(r.central.expected_wins), `${f1(r.central.playoff_pct)}%`, `${f1(r.central.final_pct)}%`, `${f1(r.central.title_pct)}%`])),
    p(`Going from a same-hand-heavy batting mix to the most left-right mix we tested adds ${f1(sc65.central.expected_wins - sc30.central.expected_wins)} wins a season, lifts the playoff chance by ${f1(sc65.central.playoff_pct - sc30.central.playoff_pct)} points and the title chance from ${f1(sc30.central.title_pct)}% to ${f1(sc65.central.title_pct)}%, about ${f1(sc65.central.title_pct - sc30.central.title_pct)} point. At the top of the plausible range it is ${f1(sc65.high.title_pct - sc30.high.title_pct)} points; at the bottom, ${f1(sc65.low.title_pct - sc30.low.title_pct)}.`),
    h("p", { class: "fineprint" }, `These are hypothetical scenarios, not results. We did not try to find a best percentage: the scenarios are evenly spaced from ${D.scenarios[0].mixed_share}% to ${D.scenarios[D.scenarios.length - 1].mixed_share}%, and the real-data check in the next section shows ${expoSteady ? "a steady pattern" : "no clean pattern"} in the middle.`)));

  const ex = D.exposure;
  root.append(chapter(9, "How much is too much? The shape of the effect",
    p(expoSteady ? `Runs per innings climb steadily with the share of left-right batting. Compared with innings that were 50-60% left-right, the ${expoLow.band} band scored ${f1(Math.abs(expoLow.runs_vs_reference))} runs ${moreFewer(expoLow.runs_vs_reference)} and the ${expoHigh.band} band ${f1(Math.abs(expoHigh.runs_vs_reference))} runs ${moreFewer(expoHigh.runs_vs_reference)}.`
      : `If left-right batting kept paying more the more of it a team did, runs per innings would climb steadily with the share. They do not. Compared with innings that were 50-60% left-right, the ${expoLow.band} band scored ${f1(Math.abs(expoLow.runs_vs_reference))} runs ${moreFewer(expoLow.runs_vs_reference)} and the ${expoHigh.band} band ${f1(Math.abs(expoHigh.runs_vs_reference))} runs ${moreFewer(expoHigh.runs_vs_reference)}, with the other bands in between. That is too jagged to be a clean curve. The highest band may simply be innings carried by one long left-right stand, in which case a good partnership is causing the share, not the other way round.`),
    fig("Runs per innings by left-right share", "Difference from innings that were 50-60% left-right, same team and season. Whisker: one margin of error.", rangeChart(ex.map((e) => ({ label: e.band, v: e.runs_vs_reference, lo: e.runs_vs_reference - 1.96 * e.se, hi: e.runs_vs_reference + 1.96 * e.se, note: `${nf(e.innings)} innings` })).filter((r) => r.label !== "50-60%"), { label: "Runs by left-right share", zeroNote: ["fewer runs", "more runs"], labelW: 90 }),
      "We did not look for an 'optimal' percentage, because the data does not support one."),
    p("In practice, there is no evidence that more is better. The sensible reading is that a mix is fine, and that the match-up against the opposition's spinners matters more than the headcount of left-handers.")));

  root.append(chapter(10, "Does hand add anything to a forecast?",
    p(`We also asked a plain predictive question. For each season from ${fc.seasons[0]} to ${fc.seasons[fc.seasons.length - 1]}, we used only the three seasons before it to forecast every match, first from team records alone and then adding how much each team had batted in left-right pairs. Nothing from the season being forecast was used.`),
    table(["Forecast", "Matches", "Forecast error (lower is better)", "Winners picked correctly"], fc.rows.map((r) => [r.label, r.matches, r.brier.toFixed(4), `${(100 * r.accuracy).toFixed(0)}%`])),
    p(`${fcBeatsCoin ? "Team record alone beat a coin flip." : "Team record alone did no better than a coin flip: IPL team strength barely carries from one season to the next."} Adding batting hands ${fcGain > 0 ? `trimmed the forecast error by ${fcGain.toFixed(4)}` : "did not reduce the forecast error"}, and with ${fc.matches} matches ${Math.abs(fcGain) < 0.005 ? "that is well inside the noise" : "that is a real gain"}. ${Math.abs(fcGain) < 0.005 ? "Handedness does not yet earn a place in a forecast." : "Handedness adds some predictive value."} We did not test a full player-quality version of this check, so that question stays open.`)));

  root.append(chapter(11, "The selection dilemma",
    p(`Should a selector pick a weaker left-hander over a stronger right-hander to get the balance? On this evidence, no. The whole left-right edge is worth about ${f1(H.per_innings)} runs an innings at the very most, and in realistic batting orders a fraction of that. The differences between individual batters in StatEdge's own ratings are typically several times larger. Use balance as a tie-breaker between batters of similar quality, and give it more emphasis when the opposition leans on spin.`),
    p("Two practical rules follow. First, do not break up a settled same-hand pair just to alternate hands. Second, when the opposing attack has two or three quality spinners, the left-right combination in the middle overs is the case where it is most likely to matter.")));

  root.append(chapter(12, "The final verdict",
    h("div", { class: "card verdict-card" },
      h("p", {}, h("b", {}, "A small tactical edge, not a championship strategy. ")),
      p(`Left-right batting is worth about ${sg(H.v)} runs per 100 balls overall, ${sg(spin.v)} against spin and nothing against pace. That is real and modest. It does not protect wickets, it does not show up in win rates, qualification or titles in ${D.seasons.length} seasons of IPL history, and champions open left-right no more often than anyone else (the one pattern worth watching is a left-hander somewhere in the top three), and, replayed 50,000 times, it moves an average team's title chance by ${gain("central") < 1 ? "under one percentage point" : "about " + f1(gain("central")) + " points"} at the central estimate and about ${f1(gain("high"))} points at the top of the plausible range. The belief is not a myth. It is just smaller than the commentary makes it sound.`)),
    h("h3", {}, "Five things to take away"),
    h("ol", { class: "takeaways" }, [
      `A left-right pair scores about ${f1(H.v)} more runs per 100 balls than a same-hand pair. Real, but about ${f1(H.per_innings)} runs an innings at the very most.`,
      `The edge is a spin edge: ${sg(spin.v)} against spin, essentially nothing (${sg(pace.v)}) against pace.`,
      "Left-right batting does not protect wickets. Pairs score faster; they do not get out less.",
      `IPL champions opened left-right ${ipl.open.champions_with} times out of ${ipl.open.champions_n}, against ${Math.round(ipl.open.base_pct)}% of all IPL teams, so it is ${ipl.open.p !== null && ipl.open.p < 0.05 ? "a clear marker of a winner" : "no clear marker of a winner"}; ${ipl.top3.champions_with} of ${ipl.top3.champions_n} had a left-hander in the top three.${OP.ipl_cards.filter((c) => c.usual === "Two right-handers").length ? ` ${OP.ipl_cards.filter((c) => c.usual === "Two right-handers").slice(-2).map((c) => `${c.team} (${c.year})`).join(" and ")} won with right-hand openers.` : ""}`,
      `Replay the season 50,000 times and a team that goes from least to most left-right batting gains about ${f1(sc65.central.title_pct - sc30.central.title_pct)} point of title chance.`].map((t) => h("li", {}, t)))));

  root.append(h("section", { class: "chapter reveal limits" }, h("h2", {}, "What this does and does not show"),
    h("ul", {}, [
      "It compares batters with themselves, so it is not fooled by stronger batters being paired in particular ways. It still cannot prove cause.",
      `Batting hands are recorded for a part of the balls (${Math.round(iplCov)}% in the IPL, ${Math.min(...covs)}% to ${Math.max(...covs)}% across competitions). Balls without both hands recorded are left out, so some team-seasons have no left-right figure.`,
      "It cannot see line, length, field placings, pitch or intent, so the tactical explanation is an inference from where the edge appears, not a measurement.",
      `Team-level questions have one data point per team and season (${Q.bands.reduce((a, b) => a + b.team_seasons, 0)} usable IPL team-seasons), so only large effects can be detected. A small effect on titles would be invisible in history; that is why the scenario replays are included.`,
      "The scenario results are hypothetical. They show what the estimated scoring edge would be worth if it applied evenly, not what any real team achieved.",
      "Not tested: a full player-quality forecast and playoff-qualification forecast, and close-match results (too few matches)."].map((t) => h("li", {}, t))),
    h("p", { class: "fineprint" }, `Source data: ball-by-ball records of ${nf(T.matches)} men's T20 matches (IPL 2008 to 2026, SA20, The Hundred, Big Bash, PSL, CPL, T20 Blast, Syed Mushtaq Ali Trophy, BPL and international T20s). Results are StatEdge's own analysis of those records.`)));

  initReveal();
}

loadJSON("data/left-right.json").then(build).catch((e) => {
  document.getElementById("article-root").replaceChildren(h("p", { class: "muted", style: "padding:80px 0" }, `Could not load the article: ${e.message}`));
}).finally(() => initContacts());
