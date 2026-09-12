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

const clubHeader = () =>
  fs.readFileSync(path.join(__dirname, "fixtures", "club-header.html"), "utf8");

test("parseClubProfile reads the club header", (t) => {
  const profile = scraper.parseClubProfile(clubHeader());

  t.equal(profile.clubNumber, "60097");
  t.equal(profile.founded, "1931");
  t.deepEqual(profile.address, [
    "TTC Basel",
    "Schwarzwaldallee 107, 4058 Basel, Schweiz",
  ]);
  t.equal(profile.website, "http://www.ttcbasel.ch");
  t.equal(profile.venues.length, 1);
  t.equal(profile.venues[0].name, "Spiellokal 1");
  t.ok(profile.venues[0].directions.startsWith("https://www.google.com/maps"));
  // Entities must be decoded here: Preact escapes what it renders, so an
  // "&amp;" surviving this far reaches the browser as "&amp;amp;".
  t.notok(profile.venues[0].directions.includes("&amp;"));
  t.ok(profile.venues[0].directions.includes("&destination="));
  t.end();
});

test("parseClubProfile leaves the obfuscated email alone", (t) => {
  // Upstream hides the address behind a JavaScript call so that scrapers
  // cannot collect it. Nothing returned here should contain any part of it.
  const dumped = JSON.stringify(scraper.parseClubProfile(clubHeader()));

  t.notok(dumped.includes("encodeEmail"));
  t.notok(dumped.includes("@"));
  t.end();
});

test("parseClubProfile survives a header it cannot read", (t) => {
  t.equal(scraper.parseClubProfile(undefined), null);
  t.deepEqual(scraper.parseClubProfile("<div></div>").venues, []);
  t.end();
});

test("parseClubProfile treats a whitespace-only element as absent", (t) => {
  // #content-row1 exists on the club page and holds ten characters of
  // whitespace. A truthy check alone would let that render an empty heading.
  t.equal(scraper.parseClubProfile("\n\t    \n\t  "), null);
  t.equal(scraper.parseClubProfile("   "), null);
  t.end();
});

test("parseClubTeams keeps the captain", async (t) => {
  const html = fs.readFileSync(
    path.join(__dirname, "fixtures", "club-teams.html"),
    "utf8",
  );
  const { teams } = await scraper.parseClubTeams(html);

  // Pins which column each field is read from, against a saved page. That
  // catches an edit to TEAM_COLUMNS here; it cannot catch click-tt moving
  // the column, because the fixture does not move with it.
  t.ok(teams.length > 0);
  t.equal(teams[0].captain, "Muster, Anna");
  t.equal(teams[0].name, "Herren");
  t.ok(teams[0].league.startsWith("Herren"), "league, not the rank column");
  t.end();
});

test("parseLicenceMembers reads the club roster", async (t) => {
  const html = fs.readFileSync(
    path.join(__dirname, "fixtures", "club-licences.html"),
    "utf8",
  );
  const { players } = await scraper.parseLicenceMembers(html);

  t.equal(players.length, 5);
  t.equal(players[0].classification, "A19");
  t.equal(players[0].name, "Muster, Anna");
  t.equal(players[0].series, "Aktive");
  t.equal(players[0].nationality, "GER");
  t.ok(players[0].href.startsWith("/playerPortrait"));
  t.end();
});

test("parseLicenceMembers leaves the licence number out", async (t) => {
  const html = fs.readFileSync(
    path.join(__dirname, "fixtures", "club-licences.html"),
    "utf8",
  );
  const { players } = await scraper.parseLicenceMembers(html);

  // The number identifies a person and adds nothing to browsing a roster,
  // so it is deliberately not carried over from the page.
  t.notok(JSON.stringify(players).includes("600001"));
  t.end();
});
