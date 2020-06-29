import React from "react";
import axios from 'axios';
import config from '../server/config/default';
import {Link} from "react-router-dom";
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Container, Row, Col} from "reactstrap";
import './css/livestreams.scss';
import './css/search.scss';

const genres = require('./json/genres.json');

export default class LiveStreams extends React.Component {

    constructor(props) {
        super(props);

        this.populateFilterDropdown = this.populateFilterDropdown.bind(this);
        this.filterDropdownToggle = this.filterDropdownToggle.bind(this);
        this.setGenreFilter = this.setGenreFilter.bind(this);
        this.clearFilter = this.clearFilter.bind(this);

        this.state = {
            liveStreams: [],
            genres: [],
            filterDropdownOpen: false,
            genreFilter: ''
        }
    }

    componentDidMount() {
        this.populateFilterDropdown();
        this.getLiveStreams();
    }

    getLiveStreams() {
        axios.get('http://127.0.0.1:' + config.rtmp_server.http.port + '/api/streams').then(res => {
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
                stream_keys: streamKeys,
                query: this.props.match.params.query
            }
        };

        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }

        axios.get('/streams/search', queryParams).then(res => {
            this.setState({
                liveStreams: res.data
            });
        });
    }

    populateFilterDropdown() {
        this.setState({
            genres: Array.from(genres.genres).sort()
        });
    }

    filterDropdownToggle() {
        this.setState(prevState => ({
            filterDropdownOpen: !prevState.filterDropdownOpen
        }));
    }

    getFilterDropdownText() {
        return this.state.genreFilter || 'Filter';
    }

    setGenreFilter(event) {
        this.setState({
            genreFilter: event.currentTarget.textContent
        });
    }

    clearFilter() {
        this.setState({
            genreFilter: ''
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.genreFilter !== this.state.genreFilter) {
            this.getLiveStreams();
        }
    }

    render() {
        const streams = this.state.liveStreams.map((stream, index) => {
            return (
                <div className="stream col-xs-12 col-sm-12 col-md-3 col-lg-4" key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${stream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${stream.stream_key}.png`}
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

        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
        });

        return (
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h4>Search: "{this.props.match.params.query}"</h4>
                    </Col>
                    <Col>
                        <Dropdown className="float-right genre-filter-dropdown" isOpen={this.state.filterDropdownOpen}
                                  toggle={this.filterDropdownToggle} size="sm">
                            <DropdownToggle caret>{this.getFilterDropdownText()}</DropdownToggle>
                            <DropdownMenu right>
                                <DropdownItem onClick={this.clearFilter} disabled={!this.state.genreFilter}>
                                    Clear Filter
                                </DropdownItem>
                                <DropdownItem divider/>
                                {genres}
                            </DropdownMenu>
                        </Dropdown>
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