import { h, Component } from 'preact'
import wire from 'wiretie'
import { route } from 'preact-router'
import style from './style'

import clientHref from '../../lib/link'

import Header from '../../components/header'
import Loading from '../../components/loading'
import LinkRow from '../../components/linkRow/'
import Table from '../../components/table'
import EloChart from '../../components/elo-chart'
import Tabs from '../../components/tabs'
import Tab from '../../components/tab'
import EloScore from '../../components/elo-score'

@wire('model', { data: ['api.player', 'href'] })
export default class Player extends Component {
  render({ pending, data, tab, back }) {
    tab = tab || 'overview'
    if (pending)
      return (
        <Wrapper tab={tab} href={this.props.href} back={back}>
          <Loading />
        </Wrapper>
      )

    const { balance, classification, singles, doubles, elo, teams, name } = data

    const content =
      tab === 'overview' ? (
        <Overview {...{ balance, classification, elo, teams }} />
      ) : tab === 'single' ? (
        <Single {...{ singles }} />
      ) : (
        <Double {...{ doubles }} />
      )

    return (
      <Wrapper tab={tab} href={this.props.href} back={back}>
        <h1 class="title">{name}</h1>
        {content}
      </Wrapper>
    )
  }
}

function Wrapper({ tab, href, back, children }) {
  const handleChange = tab => {
    route(clientHref(href, tab), true)
  }

  return (
    <div>
      <Header back={back} />
      <section class="section">
        <Tabs active={tab} onChange={handleChange}>
          <Tab name="overview">Übersicht</Tab>
          <Tab name="single">Einzel</Tab>
          <Tab name="double">Doppel</Tab>
        </Tabs>
        {children}
      </section>
    </div>
  )
}

function Overview({ balance, classification, elo, teams }) {
  return (
    <div>
      <Table>
        <tr>
          <td>Klassierung</td>
          <td>
            <EloScore value={classification} />
          </td>
        </tr>
        <tr>
          <td>Klassierung (aktuell)</td>
          <td>
            <EloScore value={elo.start} /> ({elo.start})
          </td>
        </tr>
      </Table>
      <EloChart data={elo.data} />
      <h2 class="subtitle">Mannschaftseinsätze</h2>
      <Table>
        {teams.map(({ name, href }) => (
          <LinkRow href={clientHref(href)}>
            <td>{name}</td>
          </LinkRow>
        ))}
      </Table>
      <h2 class="subtitle">Einzelbilanzen</h2>
      <Table>
        {balance.map(({ team, data }) => (
          <tr>
            <td>{team}</td>
            <td>{data}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

function Single({ singles }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Gegner</th>
          <th class="center">Klass.</th>
          <th class="center">Sätze</th>
        </tr>
      </thead>
      <tbody>
        {singles.map(({ opponent, classification, href, sets }) => (
          <LinkRow href={clientHref(href)}>
            <td>{opponent}</td>
            <td class="center">
              <EloScore value={classification} />
            </td>
            <td class="center">{sets}</td>
          </LinkRow>
        ))}
      </tbody>
    </Table>
  )
}

function Double({ doubles }) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Partner</th>
          <th>Gegner</th>
          <th class="center">Sätze</th>
        </tr>
      </thead>
      <tbody>
        {doubles.map(({ partner, opponent1, opponent2, sets }) => (
          <tr>
            <td>{partner}</td>
            <td>
              {opponent1}
              <br />
              {opponent2}
            </td>
            <td class="center">{sets}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}