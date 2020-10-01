import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col, DropdownToggle, DropdownMenu, DropdownItem, Dropdown} from "reactstrap";
import '../css/livestreams.scss';
import {Button} from "react-bootstrap";

const STARTING_PAGE = 1;
const LIMIT = 12;


export default class LiveStreamsByCategory extends React.Component {

    constructor(props) {
        super(props);

        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.setGenreFilter = this.setGenreFilter.bind(this);
        this.clearGenreFilter = this.clearGenreFilter.bind(this);

        this.state = {
            liveStreams: [],
            nextPage: STARTING_PAGE,
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
            showLoadMoreButton: false
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.getFilters();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.category !== this.props.match.params.category) {
            this.setState({
                liveStreams: [],
                nextPage: STARTING_PAGE,
                genreFilter: ''
            }, async () => {
                await this.getLiveStreams();
            });
        } else if (prevState.genreFilter !== this.state.genreFilter) {
            this.setState({
                liveStreams: [],
                nextPage: STARTING_PAGE
            }, async () => {
                await this.getLiveStreams();
            });
        }
    }

    async getLiveStreams() {
        const streamKeys = await this.getStreamKeys();
        if (streamKeys.length) {
            await this.getStreamsInfo(streamKeys);
        }
    }

    async getStreamKeys() {
        const res = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams`);
        return res.data.live ? this.extractStreamKeys(res.data.live) : [];
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

    async getStreamsInfo(streamKeys) {
        const queryParams = {
            params: {
                streamKeys: streamKeys,
                page: this.state.nextPage,
                limit: LIMIT
            }
        };
        if (this.props.match.params.category) {
            queryParams.params.category = decodeURIComponent(this.props.match.params.category);
        }
        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }

        const res = await axios.get('/api/streams', queryParams);
        this.setState({
            liveStreams: [...this.state.liveStreams, ...res.data.streams],
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters/genres');
        this.setState({
            genres: res.data.genres
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

        const pageHeader = `${decodeURIComponent(this.props.match.params.category)} Livestreams`;

        const genreDropdownText = this.state.genreFilter || 'Filter';

        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
        });

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <Button className='btn-dark' onClick={async () => await this.getLiveStreams()}>
                Load More
            </Button>
        );

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
                <Row className="streams" xs='1' sm='1' md='2' lg='3' xl='3'>
                    {streams}
                </Row>
                {loadMoreButton}
            </Container>
        )
    }
}