import { h, Component } from 'preact'
import { route } from 'preact-router'
import style from './style'

export default class LinkRow extends Component {
  onOpen = () => {
    route(this.props.href)
  }

  render({ children }) {
    return <tr class={style.row} onClick={this.onOpen} {...{ children }} />
  }
}