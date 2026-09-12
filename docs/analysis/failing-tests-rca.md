# Why five scraper tests fail

**Date**: 2026-09-12 · **Branch point**: `main` @ `879990c` · **Suite**: `server/lib/scraper.test.js`

Five of the 37 tests on `main` fail. They have failed on every feature branch in the
current round of work, identically, and they are not caused by any of it — the same five
fail on a clean checkout.

## The failures

| # | Test | Assertion | Observed |
|---|---|---|---|
| 17 | `player response` | `typeof player.balances[0].team` (`:65`) | `TypeError` — `balances[0]` undefined |
| 27 | `short player response` | `isUrl(player.teams[0].href)` (`:109`) | `TypeError` — `teams[0]` undefined |
| 29 | `game` | `typeof response.summary.game` (`:122`) | `undefined`, expected `string` |
| 30 | `game` | `typeof response.summary.sets` (`:123`) | `undefined`, expected `string` |
| 36 | `typical league` | `isUrl(chunks[0].games[0].href)` (`:138`) | `''` |

## Root cause

**click-tt has put personal content from earlier seasons behind authentication, and every
one of these tests is pinned to the 2021/22 season.**

The pages still return HTTP 200. They render, they carry the right `<h1>`, and the scraper
runs without throwing. What is missing is the data, replaced on the player and league pages
by this notice:

> Der Zugriff auf personenbezogene Inhalte früherer Spielzeiten ist click-TT-Nutzern
> vorbehalten, die über Benutzernamen und Passwort verfügen und sich im Rahmen ihres Zugangs
> den Datenschutzbestimmungen unterworfen haben. Die Freischaltung erfolgt für einen Zeitraum
> von 30 Minuten.

*Access to personal content from earlier seasons is reserved for click-TT users who hold a
username and password and have accepted the data-protection terms. Access is granted for 30
minutes at a time.*

The tests hardcode these URLs:

- `playerPortrait?federation=STT&person=1714709&club=33123` — tests 17 and 27
- `groupMeetingReport?meeting=6456522&championship=MTTV+21%2F22&group=208325` — tests 29 and 30
- `groupPage?championship=MTTV+21%2F22&group=208325` — test 36

## The evidence that settles it

The same scraper functions, against the current season, return complete data:

| Call | 2021/22 URL | 2026/27 URL |
|---|---|---|
| `league` schedule | 7 games, **0 with a result, 0 with an href** | played game: `result: "10:0"`, `href: "/groupMeetingReport?meeting=6603209…"` |
| `player` | `balances: []`, `teams: undefined`, `singles: undefined` | `balances: [{team: "Herren II", data: "PR 5:1 Total 5:1"}]`, teams and singles populated |

So the selectors are correct and the parsing is correct. Only the input has changed.

Adding an explicit `&season=2021/22` or `&season=2022/23` to the player URL does not help —
the gate is on the content, not on which season the request names.

## Why the three pages fail differently

- **Player** (`playerPortrait`) — serves the notice in place of the balance, team and match
  tables. Three selectors report `no results for …`; the scraper logs and continues, which is
  why the tests fail on `undefined` rather than on an error.
- **League** (`groupPage`) — table and schedule still parse (10 clubs, 7 fixtures), but every
  fixture comes back with an empty `result` and an empty `href`. The link to a match report is
  personal content, so it is withheld.
- **Game** (`groupMeetingReport`) — the only page of the three that carries *no* notice. It
  returns the right heading and **zero** `table.result-set` elements, so `summary` is never
  populated.

## What this is not

- Not a regression in this repo. A clean `main` fails the same five.
- Not the `preferredLanguage` problem. These pages were fetched with and without it; the
  notice appears either way.
- Not a 404 or a moved URL. All three return HTTP 200 with the correct title.
- Not fixable by naming the old season explicitly.

## Consequences

**For the suite.** These five tests cannot pass anonymously again. They assert against data
that click-tt no longer serves without a login, so they are permanently red. Three ways out,
in order of preference:

1. Repoint them at the current season and derive the season rather than hardcoding it — which
   makes them fail again next summer unless the season is derived, not pasted.
2. Convert them to fixture-based tests against saved pages, as the four feature branches now
   do for the surfaces they added. This removes the network from `npm test` entirely and is
   the only option that stays green across a season rollover.
3. Mark them skipped with a reference to this document, so the suite's green means something.

Leaving them red is the worst option: a suite that always shows five failures trains everyone
to ignore the count, and a real regression hides in it.

**For the roadmap.** The DISCOVER brief (`docs/feature/clicktt-coverage-gap/feature-delta.md`)
argues under **O5** that historical data is cheaply reachable, because a player's season links
are already scraped and a past season could simply be fetched on demand — and uses that to
argue *against* building a persistence layer.

That reasoning does not survive this finding. Earlier-season personal data is not anonymously
reachable at all. The links are still there; what is behind them is not. Anything historical
therefore needs either an authenticated session — with the data-protection obligations the
notice describes, for an unofficial client — or data captured season by season while it is
still current, which is the persistence layer the brief deferred.

O5's evidence strength should be revisited on that basis. Its cost was judged partly on
history being free; it is not free.
