import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import {headTitle, pagination} from '../../mainroom.config';
import {Button, Col, Container, Row, Spinner} from 'reactstrap';
import {shortenNumber} from '../utils/numberUtils';
import {displayErrorMessage, displayGenreAndCategory, getAlert, LoadingSpinner} from '../utils/displayUtils';
import {timeSince} from '../utils/dateUtils';
import ViewersIcon from '../icons/eye.svg';

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
            showLoadMoreFeaturedSpinner: false,
            showLoadMoreSubscriptionsButton: false,
            showLoadMoreSubscriptionsSpinner: false,
            alertText: '',
            alertColor: ''
        }
    }

    componentDidMount() {
        document.title = headTitle;
        this.fillComponent();
    }

    async fillComponent() {
        await this.getLoggedInUser();
        const params = {
            page: STARTING_PAGE,
            limit: pagination[this.state.loggedInUser ? 'small' : 'large']
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
        const res = await axios.get('/api/logged-in-user');
        this.setState({
            loggedInUser: res.data.username
        });
    }

    async getFeaturedLiveStreams(params) {
        const eventStagesCount = await this.getEventStagesReturningCount(params);
        params.limit = params.limit + (params.limit - eventStagesCount);

        const res = await axios.get('/api/livestreams', {params});

        const featuredLiveStreams = [...this.state.featuredLiveStreams, ...(res.data.streams || [])];
        if (res.data.streams && res.data.streams.length) {
            featuredLiveStreams.sort((a, b) => b.viewCount - a.viewCount);
        }

        this.setState({
            featuredLiveStreams,
            featuredLiveStreamsPage: this.state.featuredLiveStreamsPage || res.data.nextPage,
            showLoadMoreSubscriptionsButton: !!(this.state.showLoadMoreSubscriptionsButton || res.data.nextPage)
        });
    }

    async getEventStagesReturningCount(params) {
        const eventStagesRes = await axios.get(`/api/livestreams/event-stages`, {params});
        this.setState({
            featuredLiveStreams: [...this.state.featuredLiveStreams, ...(eventStagesRes.data.streams || [])],
            featuredLiveStreamsPage: eventStagesRes.data.nextPage,
            showLoadMoreSubscriptionsButton: !!eventStagesRes.data.nextPage
        });
        return eventStagesRes.data.streams ? eventStagesRes.data.streams.length : 0;
    }

    async getSubscriptionLiveStreams(params) {
        const subbedEventStagesCount = await this.getSubscribedEventStagesReturningCount(params);

        const subsRes = await axios.get(`/api/users/${this.state.loggedInUser}/subscriptions`);
        if (subsRes.data.subscriptions && subsRes.data.subscriptions.length) {
            const streamsRes = await axios.get(`/api/livestreams/`, {
                params: {
                    usernames: subsRes.data.subscriptions,
                    page: params.page,
                    limit: params.limit + (params.limit - subbedEventStagesCount)
                }
            });

            const subscriptionLiveStreams = [...this.state.subscriptionLiveStreams, ...(streamsRes.data.streams || [])];
            if (streamsRes.data.streams && streamsRes.data.streams.length) {
                subscriptionLiveStreams.sort((a, b) => b.viewCount - a.viewCount);
            }

            this.setState({
                subscriptionLiveStreams,
                subscriptionLiveStreamsPage: this.state.subscriptionLiveStreamsPage || streamsRes.data.nextPage,
                showLoadMoreSubscriptionsButton: !!(this.state.showLoadMoreSubscriptionsButton || streamsRes.data.nextPage)
            });
        }
    }

    async getSubscribedEventStagesReturningCount(params) {
        const subbedEventsRes = await axios.get(`/api/users/${this.state.loggedInUser}/subscribed-events`);
        if (subbedEventsRes.data.subscribedEventIds && subbedEventsRes.data.subscribedEventIds.length) {
            const eventStagesRes = await axios.get(`/api/livestreams/event-stages`, {
                params: {
                    eventIds: subbedEventsRes.data.subscribedEventIds,
                    page: params.page,
                    limit: params.limit
                }
            });
            this.setState({
                subscriptionLiveStreams: [...this.state.subscriptionLiveStreams, ...(eventStagesRes.data.streams || [])],
                subscriptionLiveStreamsPage: eventStagesRes.data.nextPage,
                showLoadMoreSubscriptionsButton: !!eventStagesRes.data.nextPage
            });
            return eventStagesRes.data.streams ? eventStagesRes.data.streams.length : 0;
        }
        return 0;
    }

    renderFeaturedLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton('showLoadMoreFeaturedSpinner', async () => {
            await this.getFeaturedLiveStreams({
                page: this.state.featuredLiveStreamsPage,
                limit: pagination[this.state.loggedInUser ? 'small' : 'large']
            });
        });

        return this.state.featuredLiveStreams.length && (
            <React.Fragment>
                {this.renderLiveStreams('Featured', this.state.featuredLiveStreams)}
                {this.state.showLoadMoreFeaturedButton && loadMoreButton}
            </React.Fragment>
        );
    }

    renderSubscriptionLiveStreams() {
        const loadMoreButton = this.renderLoadMoreButton('showLoadMoreSubscriptionsSpinner', async () => {
            await this.getSubscriptionLiveStreams({
                page: this.state.subscriptionLiveStreamsPage,
                limit: pagination.small
            });
        });

        return this.state.subscriptionLiveStreams.length && (
            <React.Fragment>
                {this.renderLiveStreams('Subscriptions', this.state.subscriptionLiveStreams)}
                {this.state.showLoadMoreSubscriptionsButton && loadMoreButton}
                <hr className='my-4'/>
            </React.Fragment>
        );
    }

    renderLoadMoreButton(spinnerStateKey, loadMoreOnClick) {
        const onClick = () => {
            this.setState({[spinnerStateKey]: true}, async () => {
                try {
                    await loadMoreOnClick();
                } catch (err) {
                    displayErrorMessage(this, `An error occurred when loading more streams. Please try again later. (${err})`);
                }
                this.setState({[spinnerStateKey]: false});
            });
        };
        return (
            <div className='text-center'>
                <Button className='btn-dark' onClick={onClick}>
                    {this.state[spinnerStateKey] ? <Spinner size='sm' /> : 'Load More'}
                </Button>
            </div>
        );
    }

    renderLiveStreams(title, liveStreams) {
        const streamBoxes = liveStreams.map((liveStream, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                <span className='live-label'>LIVE</span>
                <span className='view-count'>
                    <img src={ViewersIcon} width={18} height={18} className='mr-1 my-1' alt='Viewers icon'/>
                    {shortenNumber(liveStream.viewCount)}
                </span>
                <Link to={liveStream.eventStageId ?`/stage/${liveStream.eventStageId}` : `/user/${liveStream.username}/live`}>
                    <img className='w-100' src={liveStream.thumbnailURL}
                         alt={`${liveStream.eventStageId ? `${liveStream.stageName} Stage` : `${liveStream.username} Stream`} Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                        <tr>
                            {!liveStream.eventStageId && (
                                <td valign='top'>
                                    <Link to={`/user/${liveStream.username}`}>
                                        <img className='rounded-circle m-2' src={liveStream.profilePicURL}
                                             width='50' height='50'
                                             alt={`${liveStream.username} profile picture`}/>
                                    </Link>
                                </td>
                            )}
                            <td valign='middle' className='w-100'>
                                <h5>
                                    <Link to={liveStream.eventStageId ? `/stage/${liveStream.eventStageId}` : `/user/${liveStream.username}`}>
                                        {liveStream.eventStageId ? liveStream.stageName : (liveStream.displayName || liveStream.username)}
                                    </Link>
                                    <span className='black-link'>
                                        <Link to={liveStream.eventStageId ? `/stage/${liveStream.eventStageId}` : `/user/${liveStream.username}/live`}>
                                            {liveStream.title ? ` - ${liveStream.title}` : ''}
                                        </Link>
                                    </span>
                                </h5>
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: liveStream.genre,
                                        category: liveStream.category
                                    })}
                                </h6>
                                <h6>
                                    Started {timeSince(liveStream.startTime)}
                                    {liveStream.eventStageId && ' as part of '}
                                    {liveStream.eventStageId && (
                                        <Link to={`/event/${liveStream.event._id}`}>
                                            {liveStream.event.eventName}
                                        </Link>
                                    )}
                                </h6>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Col>
        ));

        return streamBoxes.length && (
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
            <div className={this.state.alertText ? 'my-4' : 'my-5'}>
                {subscriptionLiveStreams}
                {featuredLiveStreams}
            </div>
        ) : (
            <div className='my-5 text-center'>
                <p>No one is live right now :(</p>
                {this.state.loggedInUser
                    ? <p>Be the first to <Link to={'/go-live'}>go live</Link>!</p>
                    : <p><a href={'/login'}>Log in</a> or <a href={'/register'}>register</a> and be the first to go live!</p>}
            </div>
        );
    }

    render() {
        return !this.state.loaded ? <LoadingSpinner /> : (
            <Container fluid='lg'>
                {getAlert(this)}

                {this.renderStreamBoxes()}
            </Container>
        );
    }
}
