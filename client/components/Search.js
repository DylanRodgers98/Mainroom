import React from 'react';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from 'react-router-dom';
import {Button, Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row} from 'reactstrap';
import {shortenNumber} from '../utils/numberUtils';
import {timeSince} from "../utils/dateUtils";
import {displayGenreAndCategory} from "../utils/displayUtils";

const STARTING_PAGE = 1;

export default class LiveStreams extends React.Component {

    constructor(props) {
        super(props);

        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.setGenreFilter = this.setGenreFilter.bind(this);
        this.clearGenreFilter = this.clearGenreFilter.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setCategoryFilter = this.setCategoryFilter.bind(this);
        this.clearCategoryFilter = this.clearCategoryFilter.bind(this);

        this.state = {
            loaded: false,
            liveStreams: [],
            livestreamsNextPage: STARTING_PAGE,
            showLoadMoreLivestreamsButton: false,
            recordedStreams: [],
            recordedStreamsNextPage: STARTING_PAGE,
            showLoadMorePastStreamsButton: false,
            users: [],
            usersNextPage: STARTING_PAGE,
            showLoadMoreUsersButton: false,
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
            categories: [],
            categoryDropdownOpen: false,
            categoryFilter: ''
        }
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        await Promise.all([
            this.getStreams(),
            this.getUsers(),
            this.getFilters()
        ]);
        this.setState({
            loaded: true
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.query !== this.props.match.params.query) {
            this.setState({
                loaded: false,
                liveStreams: [],
                livestreamsNextPage: STARTING_PAGE,
                recordedStreams: [],
                recordedStreamsNextPage: STARTING_PAGE,
                users: [],
                usersNextPage: STARTING_PAGE,
                genreFilter: '',
                categoryFilter: ''
            }, () => {
                this.fillComponent();
            });
        } else if (prevState.genreFilter !== this.state.genreFilter
            || prevState.categoryFilter !== this.state.categoryFilter) {
            this.setState({
                loaded: false,
                liveStreams: [],
                livestreamsNextPage: STARTING_PAGE,
                recordedStreams: [],
                recordedStreamsNextPage: STARTING_PAGE,
            }, async () => {
                await this.getStreams();
                this.setState({
                    loaded: true
                });
            });
        }
    }

    async getStreams() {
        await Promise.all([
            this.getLiveStreams(),
            this.getRecordedStreams()
        ]);
    }

    async getLiveStreams() {
        const queryParams = {
            params: {
                searchQuery: this.props.match.params.query,
                page: this.state.livestreamsNextPage,
                limit: config.pagination.large
            }
        };

        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }
        if (this.state.categoryFilter) {
            queryParams.params.category = this.state.categoryFilter;
        }

        const res = await axios.get('/api/livestreams', queryParams);
        this.setState({
            liveStreams: [...this.state.liveStreams, ...(res.data.streams || [])],
            livestreamsNextPage: res.data.nextPage,
            showLoadMoreLivestreamsButton: !!res.data.nextPage
        });
    }

    async getRecordedStreams() {
        const queryParams = {
            params: {
                searchQuery: this.props.match.params.query,
                page: this.state.recordedStreamsNextPage,
                limit: config.pagination.small
            }
        };

        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }
        if (this.state.categoryFilter) {
            queryParams.params.category = this.state.categoryFilter;
        }

        const res = await axios.get('/api/recorded-streams', queryParams);
        this.setState({
            recordedStreams: [...this.state.recordedStreams, ...(res.data.recordedStreams || [])],
            recordedStreamsNextPage: res.data.nextPage,
            showLoadMorePastStreamsButton: !!res.data.nextPage
        });
    }

    async getUsers() {
        const queryParams = {
            params: {
                searchQuery: this.props.match.params.query,
                page: this.state.usersNextPage,
                limit: config.pagination.small
            }
        };

        const res = await axios.get('/api/users', queryParams);
        this.setState({
            users: [...this.state.users, ...(res.data.users || [])],
            usersNextPage: res.data.nextPage,
            showLoadMoreUsersButton: !!res.data.nextPage
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters');
        this.setState({
            genres: res.data.genres,
            categories: res.data.categories
        })
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    setGenreFilter(event) {
        this.setState({
            genreFilter: event.currentTarget.textContent
        });
    }

    clearGenreFilter() {
        this.setState({
            genreFilter: ''
        });
    }

    categoryDropdownToggle() {
        this.setState(prevState => ({
            categoryDropdownOpen: !prevState.categoryDropdownOpen
        }));
    }

    setCategoryFilter(event) {
        this.setState({
            categoryFilter: event.currentTarget.textContent
        });
    }

    clearCategoryFilter() {
        this.setState({
            categoryFilter: ''
        });
    }

    renderLiveStreams() {
        const liveStreams = this.state.liveStreams.map((liveStream, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                <span className='live-label'>LIVE</span>
                <span className='view-count'>
                    {shortenNumber(liveStream.viewCount)} viewer{liveStream.viewCount === 1 ? '' : 's'}
                </span>
                <Link to={`/user/${liveStream.username}/live`}>
                    <img className='w-100' src={liveStream.thumbnailURL}
                         alt={`${liveStream.username} Stream Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <Link to={`/user/${liveStream.username}`}>
                                    <img className='rounded-circle m-2' src={liveStream.profilePicURL}
                                         width='50' height='50'
                                         alt={`${liveStream.username} profile picture`}/>
                                </Link>
                            </td>
                            <td valign='middle' className='w-100'>
                                <h5>
                                    <Link to={`/user/${liveStream.username}`}>
                                        {liveStream.displayName || liveStream.username}
                                    </Link>
                                    <span className='black-link'>
                                        <Link to={`/user/${liveStream.username}/live`}>
                                            {liveStream.title ? ` - ${liveStream.title}` : ''}
                                        </Link>
                                    </span>
                                </h5>
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: liveStream.genre,
                                        category: liveStream.category
                                    })}
                                </h6>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Col>
        ));

        const loadMoreLiveStreamsButton = !this.state.showLoadMoreLivestreamsButton ? undefined : (
            <div className='text-center mb-4'>
                <Button className='btn-dark' onClick={async () => await this.getLiveStreams()}>
                    Load More Livestreams
                </Button>
            </div>
        );

        return liveStreams.length ? (
            <React.Fragment>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {liveStreams}
                </Row>
                {loadMoreLiveStreamsButton}
            </React.Fragment>
        ) : (
            <p className='my-4 text-center'>
                No one matching your search is live right now :(
            </p>
        );
    }

    renderPastStreams() {
        const pastStreams = this.state.recordedStreams.map((recordedStream, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                <span className='video-duration'>{recordedStream.videoDuration}</span>
                <span className='view-count'>
                    {shortenNumber(recordedStream.viewCount)} view{recordedStream.viewCount === 1 ? '' : 's'}
                </span>
                <Link to={`/stream/${recordedStream._id}`}>
                    <img className='w-100' src={recordedStream.thumbnailURL}
                         alt={`${recordedStream.title} Stream Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                        <tr>
                            <td valign='top'>
                                <Link to={`/user/${recordedStream.user.username}`}>
                                    <img className='rounded-circle m-2' src={recordedStream.user.profilePicURL}
                                         width='50' height='50'
                                         alt={`${recordedStream.user.username} profile picture`}/>
                                </Link>
                            </td>
                            <td valign='middle'>
                                <h5>
                                    <Link to={`/user/${recordedStream.user.username}`}>
                                        {recordedStream.user.displayName || recordedStream.user.username}
                                    </Link>
                                    <span className='black-link'>
                                        <Link to={`/stream/${recordedStream._id}`}>
                                            {recordedStream.title ? ` - ${recordedStream.title}` : ''}
                                        </Link>
                                    </span>
                                </h5>
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: recordedStream.genre,
                                        category: recordedStream.category
                                    })}
                                </h6>
                                <h6>{timeSince(recordedStream.timestamp)}</h6>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Col>
        ));

        const loadMorePastStreamsButton = !this.state.showLoadMorePastStreamsButton ? undefined : (
            <div className='text-center mb-4'>
                <Button className='btn-dark' onClick={async () => await this.getRecordedStreams()}>
                    Load More Past Streams
                </Button>
            </div>
        );

        return !pastStreams.length ? undefined : (
            <React.Fragment>
                <h4>Past Streams</h4>
                <hr className='my-4'/>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {pastStreams}
                </Row>
                {loadMorePastStreamsButton}
            </React.Fragment>
        );
    }

    renderUsers() {
        const users = this.state.users.map((user, index) => (
            <Col className='mb-4' key={index}>
                <h5>
                    <Link to={`/user/${user.username}`}>
                        <img src={user.profilePicURL} width='75' height='75'
                             alt={`${user.username} profile picture`} className='m-2 rounded-circle'/>
                        {user.displayName || user.username}
                    </Link>
                </h5>
            </Col>
        ));

        const loadMoreUsersButton = !this.state.showLoadMoreUsersButton ? undefined : (
            <div className='text-center mb-4'>
                <Button className='btn-dark' onClick={async () => await this.getUsers()}>
                    Load More Users
                </Button>
            </div>
        );

        return !users.length ? undefined : (
            <React.Fragment>
                <h4>Users</h4>
                <hr className='my-4'/>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {users}
                </Row>
                {loadMoreUsersButton}
            </React.Fragment>
        );
    }

    render() {
        const genreDropdownText = this.state.genreFilter || 'Genre';
        const categoryDropdownText = this.state.categoryFilter || 'Category';

        const genres = this.state.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
            </div>
        ));

        const categories = this.state.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategoryFilter}>{category}</DropdownItem>
            </div>
        ));

        return (
            <Container fluid='lg' className='mt-5'>
                <Row>
                    <Col>
                        <h4>Search: '{this.props.match.params.query}'</h4>
                    </Col>
                    <Col>
                        <table className='float-right'>
                            <tbody>
                                <tr>
                                    <td>
                                        <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                                  toggle={this.genreDropdownToggle} size='sm'>
                                            <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                                            <DropdownMenu right>
                                                <DropdownItem onClick={this.clearGenreFilter}
                                                              disabled={!this.state.genreFilter}>
                                                    Clear Filter
                                                </DropdownItem>
                                                <DropdownItem divider/>
                                                {genres}
                                            </DropdownMenu>
                                        </Dropdown>
                                    </td>
                                    <td>
                                        <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                                  toggle={this.categoryDropdownToggle} size='sm'>
                                            <DropdownToggle caret>{categoryDropdownText}</DropdownToggle>
                                            <DropdownMenu right>
                                                <DropdownItem onClick={this.clearCategoryFilter}
                                                              disabled={!this.state.categoryFilter}>
                                                    Clear Filter
                                                </DropdownItem>
                                                <DropdownItem divider/>
                                                {categories}
                                            </DropdownMenu>
                                        </Dropdown>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Col>
                </Row>
                <hr className='my-4'/>
                {!this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
                    <React.Fragment>
                        {this.renderLiveStreams()}
                        {this.renderPastStreams()}
                        {this.renderUsers()}
                    </React.Fragment>
                )}
            </Container>
        );
    }

}