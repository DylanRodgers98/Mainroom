import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col} from "reactstrap";
import '../css/livestreams.scss';
import {Button} from "react-bootstrap";

const STARTING_PAGE = 1;

export default class Home extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            loggedInUser: '',
            featuredLiveStreams: [],
            subscriptionLiveStreams: [],
            featuredLiveStreamsPage: STARTING_PAGE,
            subscriptionsLiveStreamsPage: STARTING_PAGE,
            showLoadMoreFeaturedButton: false,
            showLoadMoreSubscriptionsButton: false
        }
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        await this.getLoggedInUser();
        const streamKeys = await this.getStreamKeys();
        if (streamKeys.length) {
            const params = {
                streamKeys: streamKeys,
                page: STARTING_PAGE,
                limit: config.pagination[this.state.loggedInUser ? 'subscriptionsAndFeaturedLimit' : 'limit']
            };
            await this.getFeaturedLiveStreams(params);
            if (this.state.loggedInUser) {
                await this.getSubscriptionLiveStreams(params);
            }
        }
    }

    async getLoggedInUser() {
        const res = await axios.get('/api/users/logged-in');
        this.setState({
            loggedInUser: res.data.username
        });
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

    async getFeaturedLiveStreams(params) {
        const res = await axios.get('/api/streams', {
            params: {
                streamKeys: params.streamKeys,
                page: params.page,
                limit: params.limit
            }
        });
        this.setState({
            featuredLiveStreams: [...this.state.featuredLiveStreams, ...res.data.streams],
            featuredLiveStreamsPage: res.data.nextPage,
            showLoadMoreFeaturedButton: !!res.data.nextPage
        });
    }

    async getSubscriptionLiveStreams(params) {
        const subsRes = await axios.get(`/api/users/${this.state.loggedInUser}/subscriptions`);
        if (subsRes.data.subscriptions) {
            const subscriptionUsernames = subsRes.data.subscriptions.map(sub => sub.username);
            const streamsRes = await axios.get(`/api/streams/`, {
                params: {
                    streamKeys: params.streamKeys,
                    usernames: subscriptionUsernames,
                    page: params.page,
                    limit: params.limit
                }
            });
            this.setState({
                subscriptionLiveStreams: [...this.state.subscriptionLiveStreams, ...streamsRes.data.streams],
                subscriptionLiveStreamsPage: streamsRes.data.nextPage,
                showLoadMoreSubscriptionsButton: !!streamsRes.data.nextPage
            });
        }
    }

    renderFeaturedLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton(async () => {
            const streamKeys = await this.getStreamKeys();
            if (streamKeys.length) {
                await this.getFeaturedLiveStreams({
                    streamKeys: streamKeys,
                    page: this.state.featuredLiveStreamsPage,
                    limit: config.pagination[this.state.loggedInUser ? 'subscriptionsAndFeaturedLimit' : 'limit']
                });
            }
        });

        return !this.state.featuredLiveStreams.length ? undefined : (
            <React.Fragment>
                {this.renderLiveStreams('Featured', this.state.featuredLiveStreams)}
                {this.state.showLoadMoreFeaturedButton ? loadMoreButton : undefined}
            </React.Fragment>
        );
    }

    renderSubscriptionLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton(async () => {
            const streamKeys = await this.getStreamKeys();
            if (streamKeys.length) {
                await this.getSubscriptionLiveStreams({
                    streamKeys: streamKeys,
                    page: this.state.subscriptionLiveStreamsPage,
                    limit: config.pagination.subsAndFeaturedLimit
                });
            }
        });

        return !this.state.subscriptionLiveStreams.length ? undefined : (
            <React.Fragment>
                {this.renderLiveStreams('Subscriptions', this.state.subscriptionLiveStreams)}
                {this.state.showLoadMoreSubscriptionsButton ? loadMoreButton : undefined}
                <hr className="my-4"/>
            </React.Fragment>
        );
    }

    renderLoadMoreButton(loadMoreOnClick) {
        return (
            <Button className='btn-dark' onClick={async () => await loadMoreOnClick()}>
                Load More
            </Button>
        );
    }

    renderLiveStreams(title, liveStreams) {
        const streamBoxes = liveStreams.map((liveStream, index) => {
            return (
                <Col className='stream' key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${liveStream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${liveStream.streamKey}.png`}
                                 alt={`${liveStream.username} Stream Thumbnail`}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={`/user/${liveStream.username}/live`}>
                            {liveStream.displayName || liveStream.username}
                        </Link>
                    </span>
                </Col>
            );
        });

        return !streamBoxes.length ? undefined : (
            <React.Fragment>
                <Row>
                    <Col>
                        <h4>{title}</h4>
                    </Col>
                </Row>
                <Row className="streams mt-3" xs='1' sm='1' md='2' lg='3' xl='3'>
                    {streamBoxes}
                </Row>
            </React.Fragment>
        );
    }

    renderStreamBoxes() {
        const subscriptionLiveStreams = this.renderSubscriptionLiveStreams();
        const featuredLiveStreams = this.renderFeaturedLiveStreams();

        return subscriptionLiveStreams || featuredLiveStreams ? (
            <React.Fragment>
                {subscriptionLiveStreams}
                {featuredLiveStreams}
            </React.Fragment>
        ) : (
            <p className='my-4 text-center'>
                No one is live right now :(
            </p>
        );
    }

    render() {
        return (
            <Container className="mt-5">
                {this.renderStreamBoxes()}
            </Container>
        )
    }
}