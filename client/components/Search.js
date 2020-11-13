import React from 'react';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from 'react-router-dom';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Container, Row, Col, Button} from 'reactstrap';

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
            nextPage: STARTING_PAGE,
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
            categories: [],
            categoryDropdownOpen: false,
            categoryFilter: '',
            showLoadMoreButton: false
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.getFilters();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.query !== this.props.match.params.query) {
            this.setState({
                loaded: false,
                liveStreams: [],
                nextPage: STARTING_PAGE,
                genreFilter: '',
                categoryFilter: ''
            }, async () => {
                await this.getLiveStreams();
            });
        } else if (prevState.genreFilter !== this.state.genreFilter
            || prevState.categoryFilter !== this.state.categoryFilter) {
            this.setState({
                loaded: false,
                liveStreams: [],
                nextPage: STARTING_PAGE
            }, async () => {
                await this.getLiveStreams();
            });
        }
    }

    async getLiveStreams() {
        const queryParams = {
            params: {
                searchQuery: this.props.match.params.query,
                page: this.state.nextPage,
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
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage,
            loaded: true
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

    render() {
        const streams = this.state.liveStreams.map((liveStream, index) => (
            <Col className='stream' key={index}>
                <span className='live-label'>LIVE</span>
                <Link to={`/user/${liveStream.username}/live`}>
                    <div className='stream-thumbnail'>
                        <img src={liveStream.thumbnailURL} alt={`${liveStream.username} Stream Thumbnail`}/>
                    </div>
                </Link>
                <span className='username'>
                    <Link to={`/user/${liveStream.username}/live`}>
                        {liveStream.displayName || liveStream.username}
                    </Link>
                </span>
            </Col>
        ));

        const streamBoxes = streams.length ? (
            <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                {streams}
            </Row>
        ) : (
            <p className='my-4 text-center'>
                No one matching your search is live right now :(
            </p>
        );

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

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4 mb-4'>
                <Button className='btn-dark' onClick={async () => await this.getLiveStreams()}>
                    Load More
                </Button>
            </div>
        );

        return (
            <Container className='mt-5'>
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
                        {streamBoxes}
                        {loadMoreButton}
                    </React.Fragment>
                )}
            </Container>
        );
    }

}