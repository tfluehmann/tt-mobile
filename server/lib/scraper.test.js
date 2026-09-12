const test = require("tape");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const scraper = require("./scraper");

// These pages are saved copies of the current season. click-tt requires a
// login for personal content from earlier seasons, so the archived URLs
// these tests used to fetch no longer carry the data they assert on --
// see docs/analysis/failing-tests-rca.md. Names in them are invented.
const fixture = (name) => ({
  html: fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"),
});

// helpers
function isClass(str) {
  return str.match(/^[A-Z][1-2][0-9]$/) || str.match(/^[A-Z][1-9]$/);
}

function isSets(str) {
  return ["0:3", "1:3", "2:3", "3:2", "3:1", "3:0"].indexOf(str) > -1;
}

function isUrl(str) {
  return (
    str && str.indexOf("/") === 0 && str.length > 10 && str.indexOf(" ") === -1
  );
}

function isDate(str) {
  return moment(str, "DD.MM.YYYY").isValid();
}

test("class regex works", (t) => {
  t.ok(isClass("A20"));
  t.ok(isClass("D1"));
  t.notok(isClass("A00"));
  t.notok(isClass("a00"));
  t.notok(isClass("Z31"));
  t.notok(isClass("A200"));
  t.notok(isClass("A"));
  t.end();
});

test("isSets", (t) => {
  t.ok(isSets("2:3"));
  t.notok(isSets("3:3"));
  t.end();
});

test("isUrl", (t) => {
  t.ok(
    isUrl(
      "/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/playerPortrait?federation=STT&season=2016%2F17&person=1714709&club=33123"
    )
  );
  t.notok(isUrl("hello"));
  t.notok(isUrl("/foo/ barasdslda"));
  t.end();
});

test("arrayify", (t) => {
  t.deepEqual(scraper.arrayify(2), [2]);
  t.deepEqual(scraper.arrayify([3]), [3]);
  t.end();
});

test("player response", async (t) => {
  const player = await scraper.player(fixture("player-portrait.html"));
  t.ok(isClass(player.classification), "classification");
  t.equal(typeof player.title, "string", "title");
  t.equal(typeof player.balances[0].team, "string", "balance:team");
  t.equal(typeof player.balances[0].data, "string", "balance:data");

  t.equal(typeof player.singles[0].opponent, "string", "singles:opponent");
  t.ok(isUrl(player.singles[0].href), "singles:href");
  t.ok(isSets(player.singles[0].sets));
  t.ok(isClass(player.singles[0].classification));

  t.ok(player.teams);
  t.ok(isUrl(player.teams[0].href));
  t.ok(player.teams[0].name);

  t.equal(
    player.eloHref.startsWith("/eloFilter?federation=STT&rankingDate"),
    true
  );
  t.end();
});

test("elo response", async (t) => {
  const start = Date.now();
  const elo = await scraper.elo(fixture("elo-filter.html"));
  console.log("elo request ", Date.now() - start);
  t.equal(typeof elo.data[0], "number", "elo");
  t.equal(typeof elo.start, "number", "elostart");
  t.equal(isDate(elo.startDate), true, "startDate");
  t.equal(isDate(elo.endDate), true, "endDate");
  t.end();
});

test("short player response", async (t) => {
  const player = await scraper.me(fixture("player-portrait.html"));
  t.ok(isClass(player.classification), "classification");
  t.equal(typeof player.title, "string", "title");
  t.equal(typeof player.balance[0].team, "string", "balance:team");
  t.equal(typeof player.balance[0].data, "string", "balance:data");

  t.ok(player.teams);
  t.ok(isUrl(player.teams[0].href));
  t.ok(player.teams[0].name);

  t.end();
});

test("game", async (t) => {
  // Royal Bern
  const response = await scraper.game(fixture("group-meeting-report.html"));
  t.equal(typeof response.title, "string");
  t.equal(typeof response.summary.game, "string");
  t.equal(typeof response.summary.sets, "string");
  t.end();
});

test("typical league", async (t) => {
  // MTTV 2. Liga Gruppe 1
  const response = await scraper.league(fixture("group-page.html"));
  t.equal(typeof response.title, "string");
  t.equal(typeof response.clubs[0].name, "string");
  t.ok(isUrl(response.clubs[0].href));
  t.equal(typeof response.chunks[0].games[0].home, "string");
  t.equal(typeof response.chunks[0].games[0].guest, "string");
  t.ok(isUrl(response.chunks[0].games[0].href));
  t.end();
});

test.skip("limited league", async (t) => {
  // Nati A Playoff 1/4 Final
  const response = await scraper.league({
    url:
      "http://click-tt.ch/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/groupPage?championship=STT+16%2F17&group=201044",
  });
  t.deepEqual(response.clubs, []);
  t.equal(typeof response.chunks[0].games[0].home, "string");
  t.equal(typeof response.chunks[0].games[0].guest, "string");
  t.ok(isUrl(response.chunks[0].games[0].href));
  t.end();
});

test("team", async t => {
  // Royal Bern 1. Herren
  const response = await scraper.team(fixture("team-portrait.html"))
  t.equal(typeof response.breadcrumbs[1].name, "string");
})
