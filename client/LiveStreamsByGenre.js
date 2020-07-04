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

        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setCategoryFilter = this.setCategoryFilter.bind(this);
        this.clearCategoryFilter = this.clearCategoryFilter.bind(this);

        this.state = {
            liveStreams: [],
            categories: [],
            categoryDropdownOpen: false,
            categoryFilter: ''
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.setState({
            categories: Array.from(filters.categories).sort()
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.genre !== this.props.match.params.genre) {
            this.setState({
                categoryFilter: ''
            })
            this.getLiveStreams();
        } else if (prevState.categoryFilter !== this.state.categoryFilter) {
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
        if (this.props.match.params.genre) {
            queryParams.params.genre = decodeURIComponent(this.props.match.params.genre);
        }
        if (this.state.categoryFilter) {
            queryParams.params.category = this.state.categoryFilter;
        }

        axios.get('/streams/all', queryParams).then(res => {
            this.setState({
                liveStreams: res.data
            });
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

        const pageHeader = `${decodeURIComponent(this.props.match.params.genre)} Livestreams`

        const categoryDropdownText = this.state.categoryFilter || 'Category';

        const categories = this.state.categories.map((category) => {
            return <DropdownItem onClick={this.setCategoryFilter}>{category}</DropdownItem>
        });

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
                <Row className="streams">
                    {streams}
                </Row>
            </Container>
        )
    }
}