import React from "react";
import axios from 'axios';
import config from '../mainroom.config';
import {Link} from "react-router-dom";
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Container, Row, Col} from "reactstrap";
import './css/livestreams.scss';
import './css/search.scss';

const filters = require('./json/filters.json');

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
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
            categories: [],
            categoryDropdownOpen: false,
            categoryFilter: ''
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.setState({
            genres: Array.from(filters.genres).sort(),
            categories: Array.from(filters.categories).sort()
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.query !== this.props.match.params.query ||
            prevState.genreFilter !== this.state.genreFilter ||
            prevState.categoryFilter !== this.state.categoryFilter) {
            this.getLiveStreams();
        }
    }

    getLiveStreams() {
        axios.get('http://127.0.0.1:' + config.rtmpServer.http.port + '/api/streams').then(res => {
            const streams = res.data['live'];
            if (typeof streams !== 'undefined') {
                const streamKeys = this.extractStreamKeys(streams);
                this.getStreamsInfo(streamKeys);
            }
        });
    }

    extractStreamKeys(liveStreams) {
        const streamKeys = [];
        for (const stream in liveStreams) {
            if (liveStreams.hasOwnProperty(stream)) {
                streamKeys.push(stream);
            }
        }
        return streamKeys;
    }

    getStreamsInfo(streamKeys) {
        const queryParams = {
            params: {
                streamKeys: streamKeys,
                query: this.props.match.params.query
            }
        };

        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }
        if (this.state.categoryFilter) {
            queryParams.params.category = this.state.categoryFilter;
        }

        axios.get('/streams/search', queryParams).then(res => {
            this.setState({
                liveStreams: res.data
            });
        });
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
                <div className="stream col-xs-12 col-sm-12 col-md-3 col-lg-4" key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${stream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${stream.streamKey}.png`}
                                 alt={`${stream.username} Stream Thumbnail`}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={`/user/${stream.username}/live`}>
                            {stream.username}
                        </Link>
                    </span>
                </div>
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
                <Row className="streams">
                    {streams}
                </Row>
            </Container>
        )
    }

}