import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Button} from "reactstrap";
import config from '../server/config/default';
import './css/navbar.scss';

const genres = require('./json/filters.json');

export default class Navbar extends React.Component {


    constructor(props) {
        super(props);

        this.toggle = this.toggle.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onTextChange = this.onTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.clearSearchBox = this.clearSearchBox.bind(this);

        this.state = {
            dropdownOpen: false,
            genres: [],
            searchText: '',
            searchSubmitted: false
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

    onTextChange(e) {
        this.setState({
            searchText: e.target.value
        });
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && this.state.searchText) {
            document.getElementById("searchButton").click();
            document.getElementById("searchBox").blur();
        }
    }

    clearSearchBox() {
        this.setState({
            searchText: ''
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
                        <Link to={'/'} className={'navbar-brand'}>{config.siteTitle}</Link>
                        <Dropdown className="nav-item float-left" onMouseOver={this.onMouseEnter}
                                  onMouseLeave={this.onMouseLeave} isOpen={this.state.dropdownOpen}
                                  toggle={this.toggle}>
                            <DropdownToggle caret>Genre</DropdownToggle>
                            <DropdownMenu>{genres}</DropdownMenu>
                        </Dropdown>
                        <div className="navbar-nav ml-2">
                            <input id="searchBox" className="form-control search-box" placeholder="Search..."
                                   onChange={this.onTextChange} onKeyDown={this.handleKeyDown}
                                   value={this.state.searchText}/>
                            <Button id="searchButton" className="form-control" onClick={this.clearSearchBox}
                                    tag={Link} to={`/search/${this.state.searchText}`}>
                                Search
                            </Button>
                        </div>
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