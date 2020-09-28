import React from "react";
import axios from "axios";
import {Container, Row, Col, Button} from "reactstrap";
import {Link, Redirect} from "react-router-dom";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import FourOhFour from "./FourOhFour";
import config from "../../mainroom.config";
import '../css/user-profile.scss';
import '../css/livestreams.scss';

import defaultProfilePic from '../img/defaultProfilePic.png';

const STARTING_STATE = {
    loaded: false,
    doesUserExist: false,
    loggedInUser: '',
    isLoggedInUserSubscribed: false,
    displayName: '',
    location: '',
    bio: '',
    links: [],
    numOfSubscribers: 0,
    scheduleItems: [],
    streamKey: '',
    streamTitle: '',
    streamGenre: '',
    streamCategory: '',
    redirectToEditProfile: false,
    redirectToLogin: false,
    upcomingStreamsStartTime: moment().startOf('day'),
    upcomingStreamsEndTime: moment().startOf('day').add(3, 'day')
}

const SCHEDULE_GROUP = 0;

export default class UserProfile extends React.Component {

    constructor(props) {
        super(props);

        this.onClickSubscribeButton = this.onClickSubscribeButton.bind(this);

        this.state = STARTING_STATE;
    }

    componentDidMount() {
        this.loadUserProfile();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.match.params.username !== this.props.match.params.username) {
            this.setState(STARTING_STATE, () => this.loadUserProfile());
        }
    }

    async loadUserProfile() {
        const res = await axios.get(`/api/users/${this.props.match.params.username}`, {
            params: {
                scheduleStartTime: this.state.upcomingStreamsStartTime.toDate(),
                scheduleEndTime: this.state.upcomingStreamsEndTime.toDate(),
            }
        });
        if (res.data.username) {
            await this.fillComponent(res.data);
        }
        this.setState({
            loaded: true
        });
    }

    async fillComponent(user) {
        this.populateProfile(user)
        this.buildSchedule(user.scheduledStreams);
        this.getLiveStreamIfLive();
        await this.getLoggedInUser();
        this.isLoggedInUserSubscribed();
    }

    populateProfile(user) {
        this.setState({
            doesUserExist: true,
            displayName: user.displayName,
            location: user.location,
            bio: user.bio,
            links: user.links,
            numOfSubscribers: user.numOfSubscribers
        });
    }

    buildSchedule(scheduledStreams) {
        scheduledStreams.forEach(scheduledStream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: SCHEDULE_GROUP,
                    title: scheduledStream.title || this.props.match.params.username,
                    start_time: moment(scheduledStream.startTime),
                    end_time: moment(scheduledStream.endTime)
                }]
            });
        });
    }

    async getLoggedInUser() {
        const res = await axios.get('/api/users/logged-in')
        this.setState({
            loggedInUser: res.data.username,
        });
    }

    async isLoggedInUserSubscribed() {
        if (this.state.loggedInUser !== this.props.match.params.username) {
            const res = await axios.get(`/api/users/${this.state.loggedInUser}/subscribed-to/${this.props.match.params.username}`);
            this.setState({
                isLoggedInUserSubscribed: res.data
            });
        }
    }

    async subscribeToUser() {
        const res = await axios.post(`/api/users/${this.state.loggedInUser}/subscribe/${this.props.match.params.username}`);
        if (res.status === 200) {
            this.setState({
                isLoggedInUserSubscribed: true,
                numOfSubscribers: this.state.numOfSubscribers + 1
            });
        }
    }

    async unsubscribeFromUser() {
        const res = await axios.post(`/api/users/${this.state.loggedInUser}/unsubscribe/${this.props.match.params.username}`);
        if (res.status === 200) {
            this.setState({
                isLoggedInUserSubscribed: false,
                numOfSubscribers: this.state.numOfSubscribers - 1
            });
        }
    }

    async getLiveStreamIfLive() {
        const stream = await axios.get(`/api/users/${this.props.match.params.username}/stream-info`);
        const streamKey = stream.data.streamKey;
        const res = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams/live/${streamKey}`);
        if (res.data.isLive) {
            this.setState({
                streamKey: streamKey,
                streamTitle: stream.data.title,
                streamGenre: stream.data.genre,
                streamCategory: stream.data.category
            });
        }
    }

    onClickSubscribeButton() {
        this.state.isLoggedInUserSubscribed ? this.unsubscribeFromUser() : this.subscribeToUser();
    }

    renderSubscribeButton() {
        return this.state.loggedInUser ? (
            this.state.loggedInUser === this.props.match.params.username ? (
                <Button className='btn-dark subscribe-button' tag={Link} to='/edit-profile'>
                    Edit Profile
                </Button>
            ) : (
                <Button className='btn-dark subscribe-button' onClick={this.onClickSubscribeButton}>
                    {this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            )
        ) : (
            <Button className='btn-dark subscribe-button' href={`/login?redirectTo=${window.location.pathname}`}>
                Subscribe
            </Button>
        );
    }

    renderLinks() {
        return this.state.links.map(link => (
            <div>
                <a href={link.url} target='_blank' rel="noopener noreferrer">{link.title || link.url}</a>
            </div>
        ));
    }

    renderLiveStream() {
        return this.state.streamKey ? (
            <Row className='streams' xs='2'>
                <Col className='stream mb-4'>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${this.props.match.params.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${this.state.streamKey}.png`}
                                 alt={`${this.props.match.params.username} Stream Thumbnail`}/>
                        </div>
                    </Link>
                    <span className="username">
                        <Link to={`/user/${this.props.match.params.username}/live`}>
                            {this.state.displayName || this.props.match.params.username}
                        </Link>
                    </span>
                </Col>
                <Col>
                    <h3 className='black-link'>
                        <Link to={`/user/${this.props.match.params.username}/live`}>
                            {this.state.streamTitle}
                        </Link>
                    </h3>
                    <h5>
                        <Link to={`/genre/${this.state.streamGenre}`}>
                            {this.state.streamGenre}
                        </Link> <Link to={`/category/${this.state.streamCategory}`}>
                        {this.state.streamCategory}
                    </Link>
                    </h5>
                </Col>
            </Row>
        ) : <i><h3 className='text-center mt-5'>This user is not currently live</h3></i>;
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1>
            : (!this.state.doesUserExist ? <FourOhFour/> : (
                <Container>
                    <Row className="mt-5" xs='4'>
                        <Col>
                            {/*TODO: get profile pic through API call*/}
                            <img src={defaultProfilePic} alt={`${this.props.match.params.username} Profile Picture`}/>
                            <h1>{this.state.displayName || this.props.match.params.username}</h1>
                            <h5>{this.state.location || 'Planet Earth'}</h5>
                            <h5 className='black-link'>
                                <Link to={`/user/${this.props.match.params.username}/subscribers`}>
                                    {this.state.numOfSubscribers} Subscriber{this.state.numOfSubscribers === 1 ? '' : 's'}
                                </Link>
                            </h5>
                            {this.renderSubscribeButton()}
                            <p>{this.state.bio}</p>
                            {this.renderLinks()}
                        </Col>
                        <Col xs='9'>
                            <h3>Upcoming Streams</h3>
                            <Timeline groups={[{id: SCHEDULE_GROUP}]} items={this.state.scheduleItems}
                                      sidebarWidth='0'
                                      visibleTimeStart={this.state.upcomingStreamsStartTime.valueOf()}
                                      visibleTimeEnd={this.state.upcomingStreamsEndTime.valueOf()}/>
                            <hr className="my-4"/>
                            {this.renderLiveStream()}
                        </Col>
                    </Row>
                </Container>
            )
        );
    }

}