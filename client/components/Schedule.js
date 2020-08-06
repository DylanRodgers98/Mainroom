import React from "react";
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {Col, Container, Row, Button} from 'reactstrap';
import 'react-calendar-timeline/lib/Timeline.css'

export default class Schedule extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            scheduleGroups: [],
            scheduleItems: [],
            startTime: moment(),
            endTime: moment().add(24, 'hour')
        }
    }

    componentDidMount() {
        this.getOwnSchedule();
        this.getSchedulesFromSubscriptions();
    }

    getOwnSchedule() {
        axios.get('/user/schedule').then(res => {
            this.buildOwnSchedule({
                username: res.data.username,
                schedule: res.data.schedule
            });
        });
    }

    buildOwnSchedule({username, schedule}) {
        this.setState({
            scheduleGroups: [...this.state.scheduleGroups, {
                id: 0,
                title: 'My Scheduled Streams'
            }]
        });

        schedule.forEach(stream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: 0,
                    title: username,
                    start_time: moment(stream.startTime),
                    end_time: moment(stream.endTime)
                }]
            });
        });
    }

    getSchedulesFromSubscriptions() {
        axios.get('/user/subscriptions').then(res => {
            res.data.subscriptions.forEach(username => {
                this.getScheduleForUser(username);
            });
        });
    }

    getScheduleForUser(username) {
        axios.get('/user/schedule', {
            params: {
                username: username
            }
        }).then(res => {
            this.buildScheduleFromSubscription({
                username: res.data.username,
                schedule: res.data.schedule
            });
        });
    }

    buildScheduleFromSubscription({username, schedule}) {
        const groupId = this.state.scheduleGroups.length;
        let addedToSchedule = false;

        schedule.forEach(stream => {
            const startTime = moment(stream.startTime);
            const endTime = moment(stream.endTime);

            if (startTime.isBetween(this.state.startTime, this.state.endTime)
                || endTime.isBetween(this.state.startTime, this.state.endTime)) {
                this.setState({
                    scheduleItems: [...this.state.scheduleItems, {
                        id: this.state.scheduleItems.length,
                        group: groupId,
                        title: username,
                        start_time: startTime,
                        end_time: endTime
                    }]
                });
                addedToSchedule = true;
            }
        });

        if (addedToSchedule) {
            this.setState({
                scheduleGroups: [...this.state.scheduleGroups, {
                    id: groupId,
                    title: username
                }]
            });
        }
    }

    render() {
        return (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>Schedule</h4>
                    </Col>
                    <Col>
                        <Button className='btn btn-dark float-right'>Schedule a Stream</Button>
                    </Col>
                </Row>
                <hr className='my-4'/>
                <Timeline groups={this.state.scheduleGroups} items={this.state.scheduleItems}
                          defaultTimeStart={this.state.startTime} defaultTimeEnd={this.state.endTime} />
                <p className='my-3 text-center'>
                    {this.state.scheduleGroups.length > 1 ? ''
                    : 'Streams scheduled by your subscriptions during the selected time period will appear here'}
                </p>
            </Container>
        )
    }

}