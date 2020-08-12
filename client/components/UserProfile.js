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

export default class UserProfile extends React.Component {

    constructor(props) {
        super(props);

        this.onClickSubscribeOrEditProfileButton = this.onClickSubscribeOrEditProfileButton.bind(this);

        this.state = {
            doesUserExist: false,
            isProfileOfLoggedInUser: false,
            isLoggedInUserSubscribed: false,
            location: '',
            bio: '',
            numOfSubscribers: 0,
            scheduleItems: [],
            streamKey: '',
            streamTitle: '',
            streamGenre: '',
            streamCategory: '',
            redirectToEditProfile: false,
            upcomingStreamsStartTime: moment().startOf('day'),
            upcomingStreamsEndTime: moment().startOf('day').add(7, 'day')
        }
    }

    componentDidMount() {
        axios.get('/user', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            if (res.data.username) {
                this.populateProfile(res.data)
                this.buildSchedule(res.data.scheduledStreams);
                this.isProfileOfLoggedInUser();
                this.isLoggedInUserSubscribed();
                this.getLiveStreamIfLive();
            }
        });
    }

    populateProfile(user) {
        this.setState({
            doesUserExist: true,
            location: user.location,
            bio: user.bio,
            numOfSubscribers: user.numOfSubscribers
        });
    }

    buildSchedule(scheduledStreams) {
        scheduledStreams.forEach(scheduledStream => {
            const startTime = moment(scheduledStream.startTime);
            const endTime = moment(scheduledStream.endTime);

            if (startTime.isBetween(this.state.upcomingStreamsStartTime, this.state.upcomingStreamsEndTime)
                || endTime.isBetween(this.state.upcomingStreamsStartTime, this.state.upcomingStreamsEndTime)) {
                this.setState({
                    scheduleItems: [...this.state.scheduleItems, {
                        id: this.state.scheduleItems.length,
                        group: 0,
                        title: this.props.match.params.username,
                        start_time: startTime,
                        end_time: endTime
                    }]
                });
            }
        });
    }

    isProfileOfLoggedInUser() {
        axios.get('/user/loggedIn').then(res => {
            this.setState({
                isProfileOfLoggedInUser: res.data.username === this.props.match.params.username,
            });
        });
    }

    isLoggedInUserSubscribed() {
        if (!this.state.isProfileOfLoggedInUser) {
            axios.get('/user/subscribedTo', {
                params: {
                    otherUsername: this.props.match.params.username
                }
            }).then(res => {
                this.setState({
                    isLoggedInUserSubscribed: res.data
                });
            })
        }
    }

    getSubscribeOrEditProfileButtonText() {
        return this.state.isProfileOfLoggedInUser ? 'Edit Profile'
            : this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe';
    }

    onClickSubscribeOrEditProfileButton() {
        if (this.state.isProfileOfLoggedInUser) {
            this.setState({
                redirectToEditProfile: true
            });
        } else if (this.state.isLoggedInUserSubscribed) {
            this.unsubscribeFromUser();
        } else {
            this.subscribeToUser();
        }
    }

    subscribeToUser() {
        axios.post('/user/subscribe', {
            userToSubscribeTo: this.props.match.params.username
        }).then(res => {
            if (res.status === 200) {
                this.setState({
                    isLoggedInUserSubscribed: true,
                    numOfSubscribers: this.state.numOfSubscribers + 1
                });
            }
        });
    }

    unsubscribeFromUser() {
        axios.post('/user/unsubscribe', {
            userToUnsubscribeFrom: this.props.match.params.username
        }).then(res => {
            if (res.status === 200) {
                this.setState({
                    isLoggedInUserSubscribed: false,
                    numOfSubscribers: this.state.numOfSubscribers - 1
                });
            }
        });
    }

    getLiveStreamIfLive() {
        axios.get('/streams', {
            params: {
                username: this.props.match.params.username
            }
        }).then(stream => {
            const streamKey = stream.data.streamKey;
            axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams/live/${streamKey}`).then(res => {
                if (res.data.isLive) {
                    this.setState({
                        streamKey: streamKey,
                        streamTitle: stream.data.title,
                        streamGenre: stream.data.genre,
                        streamCategory: stream.data.category
                    });
                }
            });
        });
    }

    renderRedirectToEditProfile() {
        if (this.state.redirectToEditProfile) {
            return <Redirect to={'/edit-profile'}/>;
        }
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
                            {this.props.match.params.username}
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
        return !this.state.doesUserExist ? <FourOhFour/> : (
            <Container>
                <Row className="mt-5" xs='4'>
                    <Col>
                        {/*TODO: get profile pic through API call*/}
                        <img src={defaultProfilePic} alt={`${this.props.match.params.username} Profile Picture`}/>
                        <h1>{this.props.match.params.username}</h1>
                        <h5>{this.state.location || 'Planet Earth'}</h5>
                        <h5 className='black-link'>
                            <Link to={`/user/${this.props.match.params.username}/subscribers`}>
                                {this.state.numOfSubscribers} Subscribers
                            </Link>
                        </h5>
                        <div>
                            {this.renderRedirectToEditProfile()}
                            <Button className='btn btn-dark subscribe-button'
                                    onClick={this.onClickSubscribeOrEditProfileButton}>
                                {this.getSubscribeOrEditProfileButtonText()}
                            </Button>
                        </div>
                        <p>{this.state.bio}</p>
                    </Col>
                    <Col xs='9'>
                        <h3>Upcoming Streams</h3>
                        <Timeline groups={[{id: 0}]} items={this.state.scheduleItems} sidebarWidth='0'
                                  visibleTimeStart={this.state.upcomingStreamsStartTime.valueOf()}
                                  visibleTimeEnd={this.state.upcomingStreamsEndTime.valueOf()}/>
                        <hr className="my-4"/>
                        {this.renderLiveStream()}
                    </Col>
                </Row>
            </Container>
        );
    }

}