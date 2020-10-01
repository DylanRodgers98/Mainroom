import React from "react";
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from "react-router-dom";
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Container, Row, Col} from "reactstrap";
import '../css/livestreams.scss';
import '../css/search.scss';
import {Button} from "react-bootstrap";

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
                limit: config.pagination.limit
            }
        };

        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }
        if (this.state.categoryFilter) {
            queryParams.params.category = this.state.categoryFilter;
        }

        const res = await axios.get('/api/streams', queryParams);
        this.setState({
            liveStreams: [...this.state.liveStreams, ...res.data.streams],
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage
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
        const streams = this.state.liveStreams.map((stream, index) => {
            return (
                <Col className='stream' key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${stream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${stream.streamKey}.png`}
                                 alt={`${stream.username} Stream Thumbnail`}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={`/user/${stream.username}/live`}>
                            {stream.displayName || stream.username}
                        </Link>
                    </span>
                </Col>
            );
        });

        const genreDropdownText = this.state.genreFilter || 'Genre';
        const categoryDropdownText = this.state.categoryFilter || 'Category';

        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
        });

        const categories = this.state.categories.map((category) => {
            return <DropdownItem onClick={this.setCategoryFilter}>{category}</DropdownItem>
        });

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={async () => await this.getLiveStreams()}>
                    Load More
                </Button>
            </div>
        );

        return (
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h4>Search: "{this.props.match.params.query}"</h4>
                    </Col>
                    <Col>
                        <table className="float-right">
                            <tr>
                                <td>
                                    <Dropdown className="filter-dropdown" isOpen={this.state.genreDropdownOpen}
                                              toggle={this.genreDropdownToggle} size="sm">
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
                                    <Dropdown className="filter-dropdown" isOpen={this.state.categoryDropdownOpen}
                                              toggle={this.categoryDropdownToggle} size="sm">
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
                        </table>
                    </Col>
                </Row>
                <hr className="my-4"/>
                <Row className="streams" xs='1' sm='1' md='2' lg='3' xl='3'>
                    {streams}
                </Row>
                {loadMoreButton}
            </Container>
        )
    }

}