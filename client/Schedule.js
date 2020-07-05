import React from "react";
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {Container} from 'reactstrap';
import 'react-calendar-timeline/lib/Timeline.css'

export default class Schedule extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            scheduleGroups: [],
            scheduleItems: []
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
                    id: this.scheduleItems.length,
                    group: 0,
                    title: username,
                    start_time: moment(new Date(stream.startDate)),
                    end_time: moment(new Date(stream.endDate))
                }]
            });
        });
    }

    getSchedulesFromSubscriptions() {
        axios.get('/user/subscriptions').then(res => {
            const subscriptions = res.data.subscriptions;
            for (const username in subscriptions) {
                if (subscriptions.hasOwnProperty(username)) {
                    this.getScheduleForUser(username);
                }
            }
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
        let groupId = this.state.scheduleGroups.length;

        this.setState({
            scheduleGroups: [...this.state.scheduleGroups, {
                id: groupId,
                title: username
            }]
        });

        schedule.forEach(stream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.scheduleItems.length,
                    group: groupId,
                    title: username,
                    start_time: moment(new Date(stream.startDate)),
                    end_time: moment(new Date(stream.endDate))
                }]
            });
        });
    }

    render() {
        return (
            <Container className='my-5'>
                <Timeline groups={this.state.scheduleGroups}
                          items={this.state.scheduleItems}
                          defaultTimeStart={moment()}
                          defaultTimeEnd={moment().add(24, 'hour')}
                />
            </Container>
        )
    }

}