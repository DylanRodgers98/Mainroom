import React from "react";
import axios from "axios";
import {Container, Row, Col, Button} from "reactstrap";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import FourOhFour from "./FourOhFour";

import defaultProfilePic from '../img/defaultProfilePic.png';

export default class UserProfile extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            doesUserExist: false,
            isProfileOfLoggedInUser: false,
            location: '',
            bio: '',
            subscribers: 0,
            scheduleItems: [],
            isUserLive: false
        }
    }

    componentDidMount() {
        this.getUserInfo();
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
            isProfileOfLoggedInUser: user.username === this.props.match.params.username,
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
                        <Button>Subscribe</Button>
                        <p>{this.state.bio}</p>
                    </Col>
                    <Col xs='9'>
                        <h3>Upcoming Streams</h3>
                        <Timeline groups={[{id: 0}]} items={this.state.scheduleItems} sidebarWidth='0'
                                  visibleTimeStart={moment().startOf('day')}
                                  visibleTimeEnd={moment().add(7, 'day')} />
                        <hr className="my-4"/>
                        <h3>This user is {this.state.isUserLive ? '' : 'not '}currently live</h3>
                    </Col>
                </Row>
            </Container>
        );
    }

}