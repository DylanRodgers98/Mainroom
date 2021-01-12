import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col, Button} from 'reactstrap';

const STARTING_PAGE = 1;

export default class Home extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            loaded: false,
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
        const params = {
            page: STARTING_PAGE,
            limit: config.pagination[this.state.loggedInUser ? 'small' : 'large']
        };
        await this.getFeaturedLiveStreams(params);
        if (this.state.loggedInUser) {
            await this.getSubscriptionLiveStreams(params);
        }
        this.setState({
            loaded: true
        });
    }

    async getLoggedInUser() {
        const res = await axios.get('/logged-in-user');
        this.setState({
            loggedInUser: res.data.username
        });
    }

    async getFeaturedLiveStreams(params) {
        const res = await axios.get('/api/livestreams', {
            params: {
                page: params.page,
                limit: params.limit
            }
        });
        this.setState({
            featuredLiveStreams: [...this.state.featuredLiveStreams, ...(res.data.streams || [])],
            featuredLiveStreamsPage: res.data.nextPage,
            showLoadMoreFeaturedButton: !!res.data.nextPage
        });
    }

    async getSubscriptionLiveStreams(params) {
        const subsRes = await axios.get(`/api/users/${this.state.loggedInUser}/subscriptions`);
        if (subsRes.data.subscriptions && subsRes.data.subscriptions.length) {
            const subscriptionUsernames = subsRes.data.subscriptions.map(sub => sub.username);
            const streamsRes = await axios.get(`/api/livestreams/`, {
                params: {
                    usernames: subscriptionUsernames,
                    page: params.page,
                    limit: params.limit
                }
            });
            this.setState({
                subscriptionLiveStreams: [...this.state.subscriptionLiveStreams, ...(streamsRes.data.streams || [])],
                subscriptionLiveStreamsPage: streamsRes.data.nextPage,
                showLoadMoreSubscriptionsButton: !!streamsRes.data.nextPage
            });
        }
    }

    renderFeaturedLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton(async () => {
            await this.getFeaturedLiveStreams({
                page: this.state.featuredLiveStreamsPage,
                limit: config.pagination[this.state.loggedInUser ? 'small' : 'large']
            });
        });

        return !this.state.featuredLiveStreams.length ? undefined : (
            <React.Fragment>
                {this.renderLiveStreams('Featured', this.state.featuredLiveStreams)}
                {this.state.showLoadMoreFeaturedButton ? loadMoreButton : undefined}
                <div className='my-4'/>
            </React.Fragment>
        );
    }

    renderSubscriptionLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton(async () => {
            await this.getSubscriptionLiveStreams({
                page: this.state.subscriptionLiveStreamsPage,
                limit: config.pagination.small
            });
        });

        return !this.state.subscriptionLiveStreams.length ? undefined : (
            <React.Fragment>
                {this.renderLiveStreams('Subscriptions', this.state.subscriptionLiveStreams)}
                {this.state.showLoadMoreSubscriptionsButton ? loadMoreButton : undefined}
                <hr className='my-4'/>
            </React.Fragment>
        );
    }

    renderLoadMoreButton(loadMoreOnClick) {
        return (
            <div className='text-center'>
                <Button className='btn-dark' onClick={async () => await loadMoreOnClick()}>
                    Load More
                </Button>
            </div>
        );
    }

    renderLiveStreams(title, liveStreams) {
        const streamBoxes = liveStreams.map((liveStream, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                <span className='live-label'>LIVE</span>
                <span className='view-count'>{liveStream.viewCount} viewer{liveStream.viewCount === 1 ? '' : 's'}</span>
                <Link to={`/user/${liveStream.username}/live`}>
                    <div className='stream-thumbnail'>
                        <img src={liveStream.thumbnailURL} alt={`${liveStream.username} Stream Thumbnail`}/>
                    </div>
                </Link>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <Link to={`/user/${liveStream.username}`}>
                                    <img className='rounded-circle my-2' src={liveStream.profilePicURL}
                                         width='50' height='50'
                                         alt={`${liveStream.username} profile picture`}/>
                                </Link>
                            </td>
                            <td valign='middle'>
                                <div className='ml-2'>
                                    <h5>
                                        <Link to={`/user/${liveStream.username}`}>
                                            {liveStream.displayName || liveStream.username}
                                        </Link>
                                        {liveStream.title ? ` - ${liveStream.title}` : ''}
                                    </h5>
                                    <h6>
                                        <Link to={`/genre/${liveStream.genre}`}>
                                            {liveStream.genre}
                                        </Link> <Link to={`/category/${liveStream.category}`}>
                                            {liveStream.category}
                                        </Link>
                                    </h6>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Col>
        ));

        return !streamBoxes.length ? undefined : (
            <React.Fragment>
                <Row>
                    <Col>
                        <h4>{title}</h4>
                    </Col>
                </Row>
                <Row className='mt-3' xs='1' sm='1' md='2' lg='3' xl='3'>
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
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container fluid='lg' className='mt-5'>
                {this.renderStreamBoxes()}
            </Container>
        )
    }
}