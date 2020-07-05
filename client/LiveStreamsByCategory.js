import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../server/config/default';
import {Container, Row, Col, DropdownToggle, DropdownMenu, DropdownItem, Dropdown} from "reactstrap";
import './css/livestreams.scss';

const filters = require('./json/filters.json');

export default class LiveStreamsByCategory extends React.Component {

    constructor(props) {
        super(props);

        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.setGenreFilter = this.setGenreFilter.bind(this);
        this.clearGenreFilter = this.clearGenreFilter.bind(this);

        this.state = {
            liveStreams: [],
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.setState({
            genres: Array.from(filters.genres).sort()
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.category !== this.props.match.params.category) {
            this.setState({
                genreFilter: ''
            })
            this.getLiveStreams();
        } else if (prevState.genreFilter !== this.state.genreFilter) {
            this.getLiveStreams()
        }
    }

    getLiveStreams() {
        axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`).then(res => {
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
                streamKeys: streamKeys
            }
        };
        if (this.props.match.params.category) {
            queryParams.params.category = decodeURIComponent(this.props.match.params.category);
        }
        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }

        axios.get('/streams/all', queryParams).then(res => {
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

        const pageHeader = `${decodeURIComponent(this.props.match.params.category)} Livestreams`

        const genreDropdownText = this.state.genreFilter || 'Filter';

        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
        });

        return (
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h4>{pageHeader}</h4>
                    </Col>
                    <Col>
                        <Dropdown className="filter-dropdown float-right" isOpen={this.state.genreDropdownOpen}
                                  toggle={this.genreDropdownToggle} size="sm">
                            <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                            <DropdownMenu right>
                                <DropdownItem onClick={this.clearGenreFilter} disabled={!this.state.genreFilter}>
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