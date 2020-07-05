import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Button} from "reactstrap";
import config from '../server/config/default';
import './css/navbar.scss';

const filters = require('./json/filters.json');

export default class Navbar extends React.Component {

    constructor(props) {
        super(props);

        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.onMouseEnterGenreDropdown = this.onMouseEnterGenreDropdown.bind(this);
        this.onMouseLeaveGenreDropdown = this.onMouseLeaveGenreDropdown.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.onMouseEnterCategoryDropdown = this.onMouseEnterCategoryDropdown.bind(this);
        this.onMouseLeaveCategoryDropdown = this.onMouseLeaveCategoryDropdown.bind(this);
        this.onSearchTextChange = this.onSearchTextChange.bind(this);
        this.searchHandleKeyDown = this.searchHandleKeyDown.bind(this);
        this.clearSearchBox = this.clearSearchBox.bind(this);

        this.state = {
            genreDropdownOpen: false,
            genres: [],
            categoryDropdownOpen: false,
            categories: [],
            searchText: '',
            searchSubmitted: false
        };
    }

    componentDidMount() {
        this.setState({
            genres: Array.from(filters.genres).sort(),
            categories: Array.from(filters.categories).sort()
        });
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    onMouseEnterGenreDropdown() {
        this.setState({
            genreDropdownOpen: true
        });
    }

    onMouseLeaveGenreDropdown() {
        this.setState({
            genreDropdownOpen: false
        });
    }

    categoryDropdownToggle() {
        this.setState(prevState => ({
            categoryDropdownOpen: !prevState.categoryDropdownOpen
        }));
    }

    onMouseEnterCategoryDropdown() {
        this.setState({
            categoryDropdownOpen: true
        });
    }

    onMouseLeaveCategoryDropdown() {
        this.setState({
            categoryDropdownOpen: false
        });
    }

    onSearchTextChange(e) {
        this.setState({
            searchText: e.target.value
        });
    }

    searchHandleKeyDown(e) {
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

        const categories = this.state.categories.map((category) => {
            const link = encodeURIComponent(category.trim());
            return <DropdownItem tag={Link} to={`/category/${link}`}>{category}</DropdownItem>;
        })

        const searchButtonLink = this.state.searchText ? `/search/${this.state.searchText}`: '';

        return (
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container">
                    <div className="navbar-nav mr-auto">
                        <Link to={'/'} className={'navbar-brand'}>{config.siteTitle}</Link>
                        <Dropdown className="nav-item float-left" onMouseOver={this.onMouseEnterGenreDropdown}
                                  onMouseLeave={this.onMouseLeaveGenreDropdown} isOpen={this.state.genreDropdownOpen}
                                  toggle={this.genreDropdownToggle}>
                            <DropdownToggle caret>Genre</DropdownToggle>
                            <DropdownMenu>{genres}</DropdownMenu>
                        </Dropdown>
                        <Dropdown className="nav-item float-left" onMouseOver={this.onMouseEnterCategoryDropdown}
                                  onMouseLeave={this.onMouseLeaveCategoryDropdown}
                                  isOpen={this.state.categoryDropdownOpen} toggle={this.categoryDropdownToggle}>
                            <DropdownToggle caret>Category</DropdownToggle>
                            <DropdownMenu>{categories}</DropdownMenu>
                        </Dropdown>
                        <div className="navbar-nav ml-2">
                            <input id="searchBox" className="form-control search-box" placeholder="Search..."
                                   onChange={this.onSearchTextChange} onKeyDown={this.searchHandleKeyDown}
                                   value={this.state.searchText}/>
                            <Button id="searchButton" className="form-control" onClick={this.clearSearchBox}
                                    tag={Link} to={searchButtonLink}>
                                Search
                            </Button>
                        </div>
                    </div>
                    <div className="navbar-nav ml-auto">
                        <Link className='nav-item nav-link float-right' to='/schedule'>My Schedule</Link>
                        <Link className='nav-item nav-link float-right' to='/settings'>Go Live</Link>
                        <a className="nav-item nav-link float-right" href="/logout">Logout</a>
                    </div>
                </div>
            </nav>
        )
    }
}