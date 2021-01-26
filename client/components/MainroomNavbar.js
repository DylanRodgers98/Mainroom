import React from 'react';
import {Link} from 'react-router-dom';
import {
    Button,
    Collapse,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Nav,
    Navbar,
    NavbarBrand,
    NavbarToggler,
    NavItem,
    NavLink
} from 'reactstrap';
import config from '../../mainroom.config';
import axios from 'axios';

export default class MainroomNavbar extends React.Component {

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
        this.navbarToggle = this.navbarToggle.bind(this);
        this.closeNavbar = this.closeNavbar.bind(this);

        this.state = {
            genreDropdownOpen: false,
            genres: [],
            categoryDropdownOpen: false,
            categories: [],
            searchText: '',
            searchSubmitted: false,
            profileDropdownOpen: false,
            loggedInUsername: '',
            profilePicURL: '',
            navbarOpen: false
        };
    }

    componentDidMount() {
        Promise.all([
            this.getLoggedInUser(),
            this.getFilters()
        ]);
    }

    async getLoggedInUser() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUsername: res.data.username,
                loggedInUserId: res.data._id,
                loggedInDisplayName: res.data.displayName,
                profilePicURL: res.data.profilePicURL
            });
        }
    }

    async getFilters() {
        const res = await axios.get('/api/filters');

        const genres = res.data.genres.map((genre, index) => {
            const link = encodeURIComponent(genre.trim());
            return (
                <div key={index}>
                    <DropdownItem tag={Link} to={`/genre/${link}`} onClick={this.closeNavbar}>
                        {genre}
                    </DropdownItem>
                </div>
            );
        });

        const categories = res.data.categories.map((category, index) => {
            const link = encodeURIComponent(category.trim());
            return (
                <div key={index}>
                    <DropdownItem tag={Link} to={`/category/${link}`} onClick={this.closeNavbar}>
                        {category}
                    </DropdownItem>
                </div>
            );
        })

        this.setState({
            genres,
            categories
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
            searchText: '',
            navbarOpen: false
        });
    }

    getRedirectablePath(pathname) {
        return pathname + (window.location.pathname === '/' ? '' : `?redirectTo=${window.location.pathname}`);
    }

    profileDropdownToggle() {
        this.setState(prevState => ({
            profileDropdownOpen: !prevState.profileDropdownOpen
        }));
    }

    navbarToggle() {
        this.setState(prevState => ({
            navbarOpen: !prevState.navbarOpen
        }));
    }

    closeNavbar() {
        this.setState({
            navbarOpen: false
        });
    }

    isSmallBreakpoint() {
        const mdBreakpointValue = window.getComputedStyle(document.documentElement)
            .getPropertyValue('--breakpoint-md')
            .replace('px', '');
        return window.screen.width < mdBreakpointValue;
    }

    renderLogInOrProfileDropdown() {
        return this.state.loggedInUsername ? (
            <Nav navbar>
                <NavItem>
                    <Dropdown className='navbar-menu navbar-dropdown-no-hover text-center' nav inNavbar
                              isOpen={this.state.profileDropdownOpen} toggle={this.profileDropdownToggle}
                              title='Click for menu'>
                        <DropdownToggle caret={this.isSmallBreakpoint()}>
                            <img className='rounded-circle' src={this.state.profilePicURL + '#' + Date.now()}
                                 width='25' height='25' alt='Menu'/>
                            {!this.isSmallBreakpoint() ? undefined
                                : <span className='ml-1'>{this.state.loggedInDisplayName || this.state.loggedInUsername}</span>}
                        </DropdownToggle>
                        <DropdownMenu right>
                            <DropdownItem tag={Link} to={`/user/${this.state.loggedInUsername}`} onClick={this.closeNavbar}>
                                Profile
                            </DropdownItem>
                            <DropdownItem tag={Link} to={'/schedule'} onClick={this.closeNavbar}>
                                Schedule
                            </DropdownItem>
                            <DropdownItem tag={Link} onClick={this.closeNavbar}
                                          to={`/user/${this.state.loggedInUsername}/subscriptions`}>
                                Subscriptions
                            </DropdownItem>
                            <DropdownItem divider/>
                            <DropdownItem tag={Link} to={'/go-live'} onClick={this.closeNavbar}>
                                Go Live
                            </DropdownItem>
                            <DropdownItem tag={Link} to={'/manage-recorded-streams'} onClick={this.closeNavbar}>
                                Recorded Streams
                            </DropdownItem>
                            <DropdownItem divider/>
                            <DropdownItem tag={Link} to={'/settings'} onClick={this.closeNavbar}>
                                Settings
                            </DropdownItem>
                            <DropdownItem href={'/logout'}>Log Out</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </NavItem>
            </Nav>
        ) : (
            <Nav navbar>
                <NavItem>
                    <NavLink href={this.getRedirectablePath('/login')}
                             className='text-center text-nowrap'>Log In</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink href={this.getRedirectablePath('/register')}
                             className='text-center'>Register</NavLink>
                </NavItem>
            </Nav>
        );
    }

    render() {
        const searchButtonLink = this.state.searchText ? `/search/${this.state.searchText.trim()}` : '';

        return (
            <Navbar color='dark' dark expand='md'>
                <NavbarBrand tag={Link} to={'/'}>{config.siteTitle}</NavbarBrand>
                <NavbarToggler onClick={this.navbarToggle} />
                <Collapse isOpen={this.state.navbarOpen} navbar>
                <Nav className='mr-auto' navbar>
                    <NavItem>
                        <input id='searchBox' className='form-control search-box' placeholder='Search...'
                               onChange={this.onSearchTextChange} onKeyDown={this.searchHandleKeyDown}
                               value={this.state.searchText}/>
                    </NavItem>
                    <NavItem>
                        <Button id='searchButton' className='form-control search-button' onClick={this.clearSearchBox}
                                tag={Link} to={searchButtonLink}>
                            Search
                        </Button>
                    </NavItem>
                    <NavItem className='ml-md-2'>
                        <Dropdown className='navbar-dropdown navbar-menu text-center' nav inNavbar
                            onMouseOver={this.onMouseEnterGenreDropdown} onMouseLeave={this.onMouseLeaveGenreDropdown}
                            isOpen={this.state.genreDropdownOpen}
                            toggle={this.genreDropdownToggle}>
                            <DropdownToggle caret>Genre</DropdownToggle>
                            <DropdownMenu>{this.state.genres}</DropdownMenu>
                        </Dropdown>
                    </NavItem>
                    <NavItem>
                        <Dropdown className='navbar-dropdown navbar-menu text-center' nav inNavbar
                                  onMouseOver={this.onMouseEnterCategoryDropdown}
                                  onMouseLeave={this.onMouseLeaveCategoryDropdown}
                                  isOpen={this.state.categoryDropdownOpen} toggle={this.categoryDropdownToggle}>
                            <DropdownToggle caret>Category</DropdownToggle>
                            <DropdownMenu>{this.state.categories}</DropdownMenu>
                        </Dropdown>
                    </NavItem>
                    </Nav>
                    {this.renderLogInOrProfileDropdown()}
                </Collapse>
            </Navbar>
        );
    }
}