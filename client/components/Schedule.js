import React from "react";
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {Col, Container, Row, Button, DropdownToggle, Dropdown} from 'reactstrap';
import DateTimeRangeContainer from 'react-advanced-datetimerange-picker';
import 'react-calendar-timeline/lib/Timeline.css'
import '../css/schedule.scss';

export default class Schedule extends React.Component {

    constructor(props) {
        super(props);

        this.applyDate = this.applyDate.bind(this);

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
        axios.get('/user').then(res => {
            this.buildOwnSchedule({
                username: res.data.username,
                scheduledStreams: res.data.scheduledStreams
            });
        });
    }

    buildOwnSchedule({username, scheduledStreams}) {
        this.setState({
            scheduleGroups: [...this.state.scheduleGroups, {
                id: 0,
                title: 'My Scheduled Streams'
            }]
        });

        scheduledStreams.forEach(scheduledStream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: 0,
                    title: username,
                    start_time: moment(scheduledStream.startTime),
                    end_time: moment(scheduledStream.endTime)
                }]
            });
        });
    }

    getSchedulesFromSubscriptions() {
        axios.get('/user/subscriptions').then(res => {
            res.data.subscriptions.forEach(user => {
                this.getScheduleForUser(user.username);
            });
        });
    }

    getScheduleForUser(username) {
        axios.get('/user', {
            params: {
                username: username
            }
        }).then(res => {
            this.buildScheduleFromSubscription({
                username: res.data.username,
                scheduledStreams: res.data.scheduledStreams
            });
        });
    }

    buildScheduleFromSubscription({username, scheduledStreams}) {
        const groupId = this.state.scheduleGroups.length;
        let addedToSchedule = false;

        scheduledStreams.forEach(scheduledStream => {
            const startTime = moment(scheduledStream.startTime);
            const endTime = moment(scheduledStream.endTime);

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

    getDatePickerRange() {
        return {
            'Next 6 Hours': [moment(), moment().add(6,'hours')],
            'Next 12 Hours': [moment(), moment().add(12,'hours')],
            'Next 24 Hours': [moment(), moment().add(24,'hours')],
            'Today': [moment().startOf('day'), moment().endOf('day')],
            'Tomorrow': [moment().startOf('day').add(1, 'day'), moment().endOf('day').add(1, 'day')],
            'Next 3 Days': [moment().startOf('day'), moment().add(3, 'days').startOf('day')],
            'Next 7 Days': [moment().startOf('day'), moment().add(1, 'week').startOf('day')],
            'This Weekend': [moment().isoWeekday('Saturday').startOf('day'), moment().isoWeekday('Sunday').endOf('day')],
            'This Week': [moment().startOf('isoWeek'), moment().endOf('isoWeek')],
            'Next Weekend': [moment().isoWeekday('Saturday').startOf('day').add(1, 'week'), moment().isoWeekday('Sunday').endOf('day').add(1, 'week')],
            'Next Week': [moment().startOf('isoWeek').add(1, 'week'), moment().endOf('isoWeek').add(1, 'week')]
        };
    }

    getDatePickerFormat() {
        return {
            'format': 'DD/MM/YYYY HH:mm',
            'sundayFirst': false
        };
    }

    applyDate(startTime, endTime) {
        this.setState({
            startTime: startTime,
            endTime: endTime
        });
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
                <hr className='mt-4'/>
                <div className='float-right mb-1'>
                    <DateTimeRangeContainer ranges={this.getDatePickerRange()} local={this.getDatePickerFormat()}
                                            start={this.state.startTime} end={this.state.endTime}
                                            applyCallback={this.applyDate} leftMode={true} noMobileMode={true}>
                        <Dropdown className='date-picker-dropdown' size='sm'>
                            <DropdownToggle caret>Select Time Period</DropdownToggle>
                        </Dropdown>
                    </DateTimeRangeContainer>
                </div>
                <Timeline groups={this.state.scheduleGroups} items={this.state.scheduleItems}
                          visibleTimeStart={this.state.startTime.valueOf()}
                          visibleTimeEnd={this.state.endTime.valueOf()}/>
                <p className='my-3 text-center'>
                    {this.state.scheduleGroups.length > 1 ? ''
                        : 'Streams scheduled by your subscriptions during the selected time period will appear here'}
                </p>
            </Container>
        )
    }

}