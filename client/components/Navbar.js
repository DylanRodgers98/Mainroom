import React from 'react';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Button} from 'reactstrap';
import config from '../../mainroom.config';
import axios from 'axios';
import {Image} from 'react-bootstrap';

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
        this.profileDropdownToggle = this.profileDropdownToggle.bind(this);

        this.state = {
            genreDropdownOpen: false,
            genres: [],
            categoryDropdownOpen: false,
            categories: [],
            searchText: '',
            searchSubmitted: false,
            profileDropdownOpen: false,
            loggedInUser: '',
            profilePicURL: '',
        };
    }

    componentDidMount() {
        this.getLoggedInUser();
        this.getFilters();
    }

    async getLoggedInUser() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUser: res.data.username,
                loggedInUserId: res.data._id
            }, () => {
                this.getProfilePicURL();
            });
        }
    }

    async getProfilePicURL() {
        const res = await axios.get(`/api/users/${this.state.loggedInUserId}/profile-pic`);
        this.setState({
            profilePicURL: res.data.profilePicURL
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters');
        this.setState({
            genres: res.data.genres,
            categories: res.data.categories
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
            document.getElementById('searchButton').click();
            document.getElementById('searchBox').blur();
        }
    }

    clearSearchBox() {
        this.setState({
            searchText: ''
        });
    }

    getRedirectablePath(pathname) {
        return pathname + (window.location.pathname === '/' ? '' : `?redirectTo=${window.location.pathname}`);
    }

    renderLogInOrProfileDropdown() {
        return this.state.loggedInUser ? (
            <div className='navbar-nav ml-auto'>
                <Button className='nav-item nav-link float-right go-live-button' tag={Link} to='/go-live'>
                    Go Live
                </Button>
                <Dropdown className='nav-item float-left navbar-menu'
                          isOpen={this.state.profileDropdownOpen} toggle={this.profileDropdownToggle}>
                    <DropdownToggle caret>
                        <Image src={this.state.profilePicURL} width='25' height='25' alt={`Menu`} roundedCircle/>
                    </DropdownToggle>
                    <DropdownMenu right>
                        <DropdownItem tag={Link} to={`/user/${this.state.loggedInUser}`}>Profile</DropdownItem>
                        <DropdownItem tag={Link} to={'/schedule'}>Schedule</DropdownItem>
                        <DropdownItem tag={Link} to={`/user/${this.state.loggedInUser}/subscriptions`}>Subscriptions</DropdownItem>
                        <DropdownItem divider/>
                        <DropdownItem tag={Link} to={'/settings'}>Settings</DropdownItem>
                        <DropdownItem divider/>
                        <DropdownItem href={'/logout'}>Log Out</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </div>
        ) : (
            <div className='navbar-nav ml-auto'>
                <a href={this.getRedirectablePath('/login')}
                   className='nav-item float-right nav-link'>Log In</a>
                <a href={this.getRedirectablePath('/register')}
                   className='nav-item float-right nav-link'>Register</a>
            </div>
        );
    }

    profileDropdownToggle() {
        this.setState(prevState => ({
            profileDropdownOpen: !prevState.profileDropdownOpen
        }));
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

        const searchButtonLink = this.state.searchText ? `/search/${this.state.searchText}` : '';

        return (
            <nav className='navbar navbar-expand-lg navbar-dark bg-dark'>
                <div className='container'>
                    <div className='navbar-nav mr-auto'>
                        <Link to={'/'} className={'navbar-brand'}>{config.siteTitle}</Link>
                        <Dropdown className='nav-item float-left' onMouseOver={this.onMouseEnterGenreDropdown}
                                  onMouseLeave={this.onMouseLeaveGenreDropdown} isOpen={this.state.genreDropdownOpen}
                                  toggle={this.genreDropdownToggle}>
                            <DropdownToggle caret>Genre</DropdownToggle>
                            <DropdownMenu>{genres}</DropdownMenu>
                        </Dropdown>
                        <Dropdown className='nav-item float-left' onMouseOver={this.onMouseEnterCategoryDropdown}
                                  onMouseLeave={this.onMouseLeaveCategoryDropdown}
                                  isOpen={this.state.categoryDropdownOpen} toggle={this.categoryDropdownToggle}>
                            <DropdownToggle caret>Category</DropdownToggle>
                            <DropdownMenu>{categories}</DropdownMenu>
                        </Dropdown>
                        <div className='navbar-nav ml-2'>
                            <input id='searchBox' className='form-control search-box' placeholder='Search...'
                                   onChange={this.onSearchTextChange} onKeyDown={this.searchHandleKeyDown}
                                   value={this.state.searchText}/>
                            <Button id='searchButton' className='form-control' onClick={this.clearSearchBox}
                                    tag={Link} to={searchButtonLink}>
                                Search
                            </Button>
                        </div>
                    </div>
                    {this.renderLogInOrProfileDropdown()}
                </div>
            </nav>
        )
    }
}