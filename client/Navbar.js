import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from "reactstrap";
import './css/dropdown.scss';

const genres = require('./json/genres.json');

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
            const link = encodeURIComponent(genre.trim());
            return <DropdownItem tag={Link} to={`/genre/${link}`}>{genre}</DropdownItem>;
        })

        return (
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container">
                    <div className="navbar-nav mr-auto">
                        <Link to={'/'} className={'navbar-brand'}>Mainroom</Link>
                        <Dropdown className="nav-item float-left" onMouseOver={this.onMouseEnter}
                                  onMouseLeave={this.onMouseLeave} isOpen={this.state.dropdownOpen}
                                  toggle={this.toggle}>
                            <DropdownToggle caret>Genre</DropdownToggle>
                            <DropdownMenu>{genres}</DropdownMenu>
                        </Dropdown>
                    </div>
                    <div className="navbar-nav ml-auto">
                        <Link className='nav-item nav-link float-right' to='/settings'>Go Live</Link>
                        <a className="nav-item nav-link float-right" href="/logout">Logout</a>
                    </div>
                </div>
            </nav>
        )
    }
}