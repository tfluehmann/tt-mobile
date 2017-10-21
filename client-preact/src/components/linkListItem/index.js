import { h, Component } from 'preact'
import { route } from 'preact-router'
import style from './style'

export default class Header extends Component {
  onOpen = () => {
    route(this.props.href)
  }

  render({ children }) {
    return <li onClick={this.onOpen} {...{ children }} />
  }
}