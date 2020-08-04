import React from "react";
import axios from "axios";
import {Container, Row, Col, Button} from "reactstrap";
import {Redirect} from "react-router-dom";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import FourOhFour from "./FourOhFour";
import '../css/user-profile.scss';

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
            isUserLive: false,
            redirectToEditProfile: false
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
            numOfSubscribers: user.numOfSubscribers
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

    renderRedirectToEditProfile() {
        if (this.state.redirectToEditProfile) {
            return <Redirect to={'/edit-profile'}/>;
        }
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
                        <h5>{this.state.numOfSubscribers} Subscribers</h5>
                        <div>
                            {this.renderRedirectToEditProfile()}
                            <Button className='btn btn-dark subscribe-button'
                                    onClick={this.onClickSubscribeOrEditProfileButton}>
                                {this.getSubscribeOrEditProfileButtonText()}
                            </Button>
                        </div>
                        <p>{this.state.bio || 'BIO BIO BIO BIO BIO'}</p>
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