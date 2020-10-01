import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col, DropdownToggle, DropdownMenu, DropdownItem, Dropdown} from "reactstrap";
import '../css/livestreams.scss';
import {Button} from "react-bootstrap";

const STARTING_PAGE = 1;

export default class LiveStreamsByCategory extends React.Component {

    constructor(props) {
        super(props);

        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setCategoryFilter = this.setCategoryFilter.bind(this);
        this.clearCategoryFilter = this.clearCategoryFilter.bind(this);

        this.state = {
            liveStreams: [],
            nextPage: STARTING_PAGE,
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
        if (prevProps.match.params.genre !== this.props.match.params.genre) {
            this.setState({
                liveStreams: [],
                nextPage: STARTING_PAGE,
                categoryFilter: ''
            }, async () => {
                await this.getLiveStreams();
            });
        } else if (prevState.categoryFilter !== this.state.categoryFilter) {
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
                limit: config.pagination.limit
            }
        };
        if (this.props.match.params.genre) {
            queryParams.params.genre = decodeURIComponent(this.props.match.params.genre);
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
        const res = await axios.get('/api/filters/categories');
        this.setState({
            categories: res.data.categories
        })
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

        const pageHeader = `${decodeURIComponent(this.props.match.params.genre)} Livestreams`;

        const categoryDropdownText = this.state.categoryFilter || 'Filter';

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
                        <h4>{pageHeader}</h4>
                    </Col>
                    <Col>
                        <Dropdown className="filter-dropdown float-right" isOpen={this.state.categoryDropdownOpen}
                                  toggle={this.categoryDropdownToggle} size="sm">
                            <DropdownToggle caret>{categoryDropdownText}</DropdownToggle>
                            <DropdownMenu right>
                                <DropdownItem onClick={this.clearCategoryFilter} disabled={!this.state.categoryFilter}>
                                    Clear Filter
                                </DropdownItem>
                                <DropdownItem divider/>
                                {categories}
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