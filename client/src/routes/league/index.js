import { h, Component } from "preact";
import wire from "wiretie";
import { route } from "preact-router";
import Helmet from "preact-helmet";
import style from "./style";

import clientHref from "../../lib/link";

import Header from "../../components/header";
import Embed from "../../components/embed";
import Footer from "../../components/footer";
import Container from "../../components/container";
import Schedule from "../../components/schedule";
import LoadingPage from "../../components/loading-page";
import ErrorPage from "../../components/error-page";
import LinkRow from "../../components/link-row/";
import Table from "../../components/table";
import Tabs from "../../components/tabs";
import Tab from "../../components/tab";

import { API_ORIGIN } from "../../lib/model";

export default
@wire("model", { data: ["api.league", "href"] })
class League extends Component {
  handleChange = (tab) => {
    route(clientHref(this.props.href, tab));
  };

  render({ pending, rejected, back, data, tab, href }) {
    if (pending) return <LoadingPage back={back} />;
    if (rejected) return <ErrorPage info={rejected} />;

    const { league, clubs, chunks, breadcrumbs } = data;

    tab = clubs.length === 0 ? "schedule" : tab || "table";

    let content;
    if (tab === "ranking" || tab === "doubles") {
      content = (
        <Ranking href={href} type={tab === "doubles" ? "doubles" : "singles"} />
      );
    } else if (tab === "table") {
      content = <LeagueTable {...{ clubs, href }} />;
    } else {
      content = <Schedule {...{ chunks }} />;
    }
    return (
      <div class={style.profile}>
        <Helmet title={league} />
        <Header back={back} breadcrumb={breadcrumbs[0]} />
        <Container>
          {clubs.length > 0 ? (
            <Tabs active={tab} onChange={this.handleChange}>
              <Tab name="table">Tabelle</Tab>
              <Tab name="schedule">Spielplan</Tab>
              <Tab name="ranking">Rangliste</Tab>
              <Tab name="doubles">Doppel</Tab>
            </Tabs>
          ) : (
            <span />
          )}
          <h1 class="title">{league}</h1>
          <h2 class="subtitle">
            <a href={clientHref(breadcrumbs[0].href)}>{breadcrumbs[0].name}</a>
          </h2>
          {content}
        </Container>
        <Footer />
      </div>
    );
  }
}

// Upstream publishes every ranking for the first half of the season, the
// second half, or both combined. The same three rounds apply to the tables
// and schedules, so this control is written to be reused there.
const ROUNDS = [
  { key: "gesamt", label: "Gesamt" },
  { key: "vorrunde", label: "Vorrunde" },
  { key: "rueckrunde", label: "Rückrunde" },
];

class Ranking extends Component {
  state = { round: "gesamt", players: [], pending: true, failed: false };

  load(round) {
    const { href, type } = this.props;
    const params = new URLSearchParams({ url: href, type, displayTyp: round });

    this.setState({ pending: true, failed: false });
    fetch(`${API_ORIGIN}/group-ranking?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
      })
      .then(({ players }) => this.setState({ players, pending: false }))
      .catch(() => this.setState({ pending: false, failed: true }));
  }

  setRound = (round) => {
    this.setState({ round });
    this.load(round);
  };

  componentDidMount() {
    this.load(this.state.round);
  }

  componentDidUpdate(previous) {
    if (previous.type !== this.props.type) {
      this.load(this.state.round);
    }
  }

  render({ type }, { round, players, pending, failed }) {
    return (
      <>
        <div class="buttons has-addons mb-4">
          {ROUNDS.map(({ key, label }) => (
            <button
              key={key}
              class={`button is-small ${
                round === key ? "is-link is-selected" : ""
              }`}
              onClick={() => this.setRound(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {failed ? (
          <p>Diese Rangliste konnte nicht geladen werden.</p>
        ) : pending ? (
          <p>Rangliste wird geladen …</p>
        ) : players.length === 0 ? (
          <p>Für diese Runde gibt es noch keine Rangliste.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th class="center">Rang</th>
                <th>{type === "doubles" ? "Doppel" : "Name"}</th>
                <th class="optional">Mannschaft</th>
                <th class="center">Bilanz</th>
                <th class="center optional-2">+/-</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <RankingRow key={`${player.rank}-${index}`} player={player} />
              ))}
            </tbody>
          </Table>
        )}
      </>
    );
  }
}

function RankingRow({ player }) {
  const cells = [
    <td key="rank" class="center">
      {player.rank}
    </td>,
    <td key="name">{player.name}</td>,
    <td key="team" class="optional">
      {player.team}
    </td>,
    <td key="balance" class="result center">
      {player.balance}
    </td>,
    <td key="diff" class="center optional-2">
      {player.diff}
    </td>,
  ];

  // A doubles row names a pairing rather than one player, so it carries no
  // link to a portrait.
  return player.href ? (
    <LinkRow href={clientHref(player.href)}>{cells}</LinkRow>
  ) : (
    <tr>{cells}</tr>
  );
}

function clubName(teamName) {
  const parts = teamName.split(" ");
  if (/[IVX]+$/.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(" ");
  }
  return parts.join(" ");
}

function LeagueTable({ clubs, href }) {
  return (
    <>
      <Table>
        <thead>
          <tr>
            <th class="optional-3" />
            <th />
            <th>Mannschaft</th>
            <th class="center optional">Beg.</th>
            <th class="center optional-3">Spiele</th>
            <th class="center optional-4">+/-</th>
            <th>Punkte</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clubs.map((club) => (
            <LeagueRow key={club.href} club={club} />
          ))}
        </tbody>
      </Table>
      <Embed param="table-url" url={href} />
    </>
  );
}

function LeagueRow({ club }) {
  let promotionIcon = "";
  if (club.promotion) {
    promotionIcon = <i className={`icon-${club.promotion}-dir`} />;
  }
  return (
    <LinkRow href={clientHref(club.href)}>
      <td className={`optional-3 ${style.rankCell}`}>
        {club.rank}
        {promotionIcon}
      </td>
      <td class="logo-col">
        <img
          class="logo"
          src={`${API_ORIGIN}/logo/?name=${clubName(club.name)}`}
        />
      </td>
      <td>{club.name}</td>
      <td class="center optional">{club.nrOfGames}</td>
      <td class="center optional-3">{club.games}</td>
      <td class="center optional-4">{club.balance}</td>
      <td class="result center">{club.score}</td>
      <td class="thin">
        <i class="icon-right-open" />
      </td>
    </LinkRow>
  );
}
