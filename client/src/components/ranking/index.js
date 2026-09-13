import { h, Component } from "preact";

import clientHref from "../../lib/link";
import { API_ORIGIN } from "../../lib/model";

import LinkRow from "../link-row/";
import Table from "../table";

// Upstream publishes every ranking for the first half of the season, the
// second half, or both combined. The same three rounds apply to the tables
// and schedules, so this control is written to be reused there.
const ROUNDS = [
  { key: "gesamt", label: "Gesamt" },
  { key: "vorrunde", label: "Vorrunde" },
  { key: "rueckrunde", label: "Rückrunde" },
];

export default class Ranking extends Component {
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
    // The league route keeps this component mounted when you move between
    // leagues or switch between singles and doubles, so both have to reload.
    if (
      previous.type !== this.props.type ||
      previous.href !== this.props.href
    ) {
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
                <RankingRow key={`${player.name}-${index}`} player={player} />
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
