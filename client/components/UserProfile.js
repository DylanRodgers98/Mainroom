import React from "react";
import axios from "axios";
import {Container, Row, Col, Button} from "reactstrap";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import FourOhFour from "./FourOhFour";
import '../css/user-profile.scss';

import defaultProfilePic from '../img/defaultProfilePic.png';
import {Redirect} from "react-router-dom";

export default class UserProfile extends React.Component {

    constructor(props) {
        super(props);

        this.onClickSubscribeButton = this.onClickSubscribeButton.bind(this);

        this.state = {
            doesUserExist: false,
            isProfileOfLoggedInUser: false,
            isLoggedInUserSubscribed: false,
            location: '',
            bio: '',
            subscribers: 0,
            scheduleItems: [],
            isUserLive: false,
            redirect: false
        }
    }

    componentDidMount() {
        this.getUserInfo();
        this.setProfileOfLoggedInUser();
        this.setLoggedInUserSubscribed();
    }

    getUserInfo() {
        axios.get('/user', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            if (res.data.username) {
                this.populateProfile(res.data)
                this.buildSchedule(res.data.schedule);
            }
        });
    }

    populateProfile(user) {
        this.setState({
            doesUserExist: true,
            location: user.location,
            bio: user.bio,
            subscribers: user.numOfSubscribers
        });
    }

    buildSchedule(schedule) {
        schedule.forEach(stream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: 0,
                    title: this.props.match.params.username,
                    start_time: moment(stream.startDate),
                    end_time: moment(stream.endDate)
                }]
            });
        });
    }

    setProfileOfLoggedInUser() {
        axios.get('/user/loggedIn').then(res => {
            this.setState({
                isProfileOfLoggedInUser: res.data.username === this.props.match.params.username,
            });
        });
    }

    setLoggedInUserSubscribed() {
        if (!this.state.isProfileOfLoggedInUser) {
            axios.get('/user/subscribedTo', {
                params: {
                    otherUser: this.props.match.params.username
                }
            }).then(res => {
                this.setState({
                    isLoggedInUserSubscribed: res.data.subscribed
                });
            })
        }
    }

    getSubscribeButtonText() {
        return this.state.isProfileOfLoggedInUser ? 'Edit Profile'
            : this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe';
    }

    onClickSubscribeButton() {
        if (!this.state.isProfileOfLoggedInUser) {
            if (this.state.isLoggedInUserSubscribed) {
                this.unsubscribeFromUser();
            } else {
                this.subscribeToUser();
            }
        }
        this.setState({
            redirect: true
        });
    }

    subscribeToUser() {
        axios.post('/user/subscribe', {
            userToSubscribeTo: this.props.match.params.username
        }).then(res => {
            this.setState({
                isLoggedInUserSubscribed: res.data.subscribed
            });
        });
    }

    unsubscribeFromUser() {
        axios.post('/user/unsubscribe', {
            userToUnsubscribeFrom: this.props.match.params.username
        }).then(res => {
            this.setState({
                isLoggedInUserSubscribed: res.data.subscribed
            });
        });
    }

    renderRedirect() {
        if (this.state.redirect) {
            return <Redirect to={this.getRedirect()} />;
        }
    }

    getRedirect() {
        return this.state.isProfileOfLoggedInUser ? '/edit-profile' : `/user/${this.props.match.params.username}`
    }

    render() {
        return !this.state.doesUserExist ? <FourOhFour/> : (
            <Container>
                <Row className="mt-5" xs='4'>
                    <Col>
                        {/*TODO: get profile pic through API call*/}
                        <img src={defaultProfilePic}/>
                        <h1>{this.props.match.params.username}</h1>
                        <h5>{this.state.location || 'Planet Earth'}</h5>
                        <h5>{this.state.subscribers} Subscribers</h5>
                        <div>
                            {this.renderRedirect()}
                            <Button className='btn btn-dark subscribe-button' onClick={this.onClickSubscribeButton}>
                                {this.getSubscribeButtonText()}
                            </Button>
                        </div>
                        <p>{this.state.bio || 'This is my bio hello I am a good person'}</p>
                    </Col>
                    <Col xs='9'>
                        <h3>Upcoming Streams</h3>
                        <Timeline groups={[{id: 0}]} items={this.state.scheduleItems} sidebarWidth='0'
                                  visibleTimeStart={moment().startOf('day')}
                                  visibleTimeEnd={moment().startOf('day').add(7, 'day')}/>
                        <hr className="my-4"/>
                        <h3>This user is {this.state.isUserLive ? '' : 'not '}currently live</h3>
                    </Col>
                </Row>
            </Container>
        );
    }

}