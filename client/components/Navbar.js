import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from "reactstrap";
import './dropdown.scss';

const genres = require('./genres.json');

export default class Navbar extends React.Component {

    constructor(props) {
        super(props);

        this.toggle = this.toggle.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        this.state = {
            dropdownOpen: false,
            genres: []
        };
    }

    toggle() {
        this.setState(prevState => ({
            dropdownOpen: !prevState.dropdownOpen
        }));
    }

    onMouseEnter() {
        this.setState({
            dropdownOpen: true
        });
    }

    onMouseLeave() {
        this.setState({
            dropdownOpen: false
        });
    }

    componentDidMount() {
        this.setState({
            genres: Array.from(genres.genres).sort()
        });
    }

    render() {
        const genres = this.state.genres.map((genre) => {
            const link = encodeURIComponent(genre.toLowerCase().replace(/\s/g, ''));
            return <DropdownItem tag={Link} to={`/genre/${link}`}>{genre}</DropdownItem>;
        })

        return (
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container">
                    <Link to={'/'} className={'navbar-brand'}>
                        Mainroom
                    </Link>
                    <button className="navbar-toggler" type="button" data-toggle="collapse"
                            rdata-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
                            aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"/>
                    </button>

                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul className="navbar-nav mr-auto">
                            <li className="nav-item float-left">
                                <Dropdown onMouseOver={this.onMouseEnter} onMouseLeave={this.onMouseLeave}
                                          isOpen={this.state.dropdownOpen} toggle={this.toggle}>
                                    <DropdownToggle caret>Genre</DropdownToggle>
                                    <DropdownMenu>{genres}</DropdownMenu>
                                </Dropdown>
                            </li>
                        </ul>
                        <ul className="navbar-nav ml-auto">
                            <li className="nav-item float-right">
                                <Link className={'nav-link'} to={'/settings'}>
                                    Go Live
                                </Link>
                            </li>
                            <li className="nav-item float-right">
                                <a className="nav-link" href="/logout">Logout</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        )
    }
}