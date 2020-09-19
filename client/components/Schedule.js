import React from "react";
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {Col, Container, Row, Button, DropdownToggle, Dropdown, DropdownMenu, DropdownItem} from 'reactstrap';
import DateTimeRangeContainer from 'react-advanced-datetimerange-picker';
import 'react-calendar-timeline/lib/Timeline.css'
import '../css/schedule.scss';
import {Modal} from "react-bootstrap";

export default class Schedule extends React.Component {

    constructor(props) {
        super(props);

        this.applyDate = this.applyDate.bind(this);
        this.scheduleStreamToggle = this.scheduleStreamToggle.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.setTags = this.setTags.bind(this);
        this.scheduleStreamApplyDate = this.scheduleStreamApplyDate.bind(this);
        this.addToSchedule = this.addToSchedule.bind(this);

        this.state = {
            loaded: false,
            scheduleGroups: [],
            scheduleItems: [],
            startTime: moment(),
            endTime: moment().add(24, 'hour'),
            genres: [],
            categories: [],
            scheduleStreamOpen: false,
            genreDropdownOpen: false,
            categoryDropdownOpen: false,
            scheduleStreamStartTime: moment(),
            scheduleStreamEndTime: moment().add(1, 'hour'),
            scheduleStreamTitle: '',
            scheduleStreamGenre: '',
            scheduleStreamCategory: '',
            scheduleStreamTags: []
        }
    }

    componentDidMount() {
        this.getSchedule();
    }

    async getSchedule() {
        const res = await axios.get('/users/schedule', {
            params: {
                scheduleStartTime: this.state.startTime.toDate(),
                scheduleEndTime: this.state.endTime.toDate()
            }
        });
        await this.buildOwnSchedule({
            username: res.data.username,
            scheduledStreams: res.data.scheduledStreams
        });
        for (const subscription of res.data.subscriptions) {
             await this.buildScheduleFromSubscription({
                username: subscription.username,
                scheduledStreams: subscription.scheduledStreams
            });
        }
        this.setState({
            loaded: true
        });
    }

    async buildOwnSchedule({username, scheduledStreams}) {
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
                    title: scheduledStream.title || username,
                    start_time: moment(scheduledStream.startTime),
                    end_time: moment(scheduledStream.endTime)
                }]
            });
        });
    }

    async buildScheduleFromSubscription({username, scheduledStreams}) {
        const groupId = this.state.scheduleGroups.length;

        this.setState({
            scheduleGroups: [...this.state.scheduleGroups, {
                id: groupId,
                title: username
            }]
        });

        scheduledStreams.forEach(scheduledStream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: groupId,
                    title: scheduledStream.title || username,
                    start_time: moment(scheduledStream.startTime),
                    end_time: moment(scheduledStream.endTime)
                }]
            });
        });
    }

    getDatePickerRange() {
        return {
            'Next 6 Hours': [moment(), moment().add(6, 'hours')],
            'Next 12 Hours': [moment(), moment().add(12, 'hours')],
            'Next 24 Hours': [moment(), moment().add(24, 'hours')],
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
            scheduleGroups: [],
            scheduleItems: [],
            loaded: false,
            startTime: startTime,
            endTime: endTime
        }, () => {
            this.getSchedule();
        });
    }

    scheduleStreamToggle() {
        this.setState(prevState => ({
            scheduleStreamOpen: !prevState.scheduleStreamOpen
        }), () => {
            if (this.state.scheduleStreamOpen && !(this.state.genres.length || this.state.categories.length)) {
                this.getFilters();
            }
        });
    }

    async getFilters() {
        const res = await axios.get('/filters');
        this.setState({
            genres: res.data.genres,
            categories: res.data.categories
        })
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    categoryDropdownToggle() {
        this.setState(prevState => ({
            categoryDropdownOpen: !prevState.categoryDropdownOpen
        }));
    }

    setTitle(event) {
        this.setState({
            scheduleStreamTitle: event.target.value
        });
    }

    setGenre(event) {
        this.setState({
            scheduleStreamGenre: event.currentTarget.textContent
        });
    }

    setCategory(event) {
        this.setState({
            scheduleStreamCategory: event.currentTarget.textContent,
        });
    }

    setTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        this.setState({
            scheduleStreamTags: tags
        });
    }

    scheduleStreamApplyDate(startTime, endTime) {
        this.setState({
            scheduleStreamStartTime: startTime,
            scheduleStreamEndTime: endTime
        });
    }

    async addToSchedule() {
        await axios.post('/scheduled-streams', {
            startTime: this.state.scheduleStreamStartTime,
            endTime: this.state.scheduleStreamEndTime,
            title: this.state.scheduleStreamTitle,
            genre: this.state.scheduleStreamGenre,
            category: this.state.scheduleStreamCategory,
            tags: this.state.scheduleStreamTags
        });
        this.scheduleStreamToggle();
        this.setState({
            scheduleGroups: [],
            scheduleItems: [],
            loaded: false
        }, () => {
            this.getSchedule();
        });
    }

    renderScheduleStream() {
        const genreDropdownText = this.state.scheduleStreamGenre || 'Select a genre...';
        const categoryDropdownText = this.state.scheduleStreamCategory || 'Select a category...';

        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
        });

        const categories = this.state.categories.map((category) => {
            return <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
        });

        const dateFormat = this.getDatePickerFormat().format;

        return (
            <Modal show={this.state.scheduleStreamOpen} onHide={this.scheduleStreamToggle} size='lg' centered>
                <Modal.Header closeButton>
                    <Modal.Title>Schedule a Stream</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <table>
                        <tr>
                            <td>
                                <h5>Date & Time:</h5>
                            </td>
                            <td>
                                <DateTimeRangeContainer start={this.state.scheduleStreamStartTime}
                                                        end={this.state.scheduleStreamEndTime}
                                                        ranges={this.getDatePickerRange()}
                                                        local={this.getDatePickerFormat()} noMobileMode={true}
                                                        applyCallback={this.scheduleStreamApplyDate} autoApply
                                                        style={{standaloneLayout: {display: 'flex', maxWidth: 'fit-content'}}}>
                                    <Dropdown className='date-picker-dropdown' size='sm' toggle={() => {}}>
                                        <DropdownToggle caret>
                                            {this.state.scheduleStreamStartTime.format(dateFormat) + ' - '
                                            + this.state.scheduleStreamEndTime.format(dateFormat)}
                                        </DropdownToggle>
                                    </Dropdown>
                                </DateTimeRangeContainer>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Title:</h5>
                            </td>
                            <td>
                                <input className="settings-title" type="text" value={this.state.scheduleStreamTitle}
                                       onChange={this.setTitle}/>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Genre:</h5>
                            </td>
                            <td>
                                <Dropdown className="settings-dropdown" isOpen={this.state.genreDropdownOpen}
                                          toggle={this.genreDropdownToggle} size="sm">
                                    <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                                    <DropdownMenu>{genres}</DropdownMenu>
                                </Dropdown>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Category:</h5>
                            </td>
                            <td>
                                <Dropdown className="settings-dropdown" isOpen={this.state.categoryDropdownOpen}
                                          toggle={this.categoryDropdownToggle} size="sm">
                                    <DropdownToggle caret>{categoryDropdownText}</DropdownToggle>
                                    <DropdownMenu>{categories}</DropdownMenu>
                                </Dropdown>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Tags:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input className="mt-1" type="text" value={this.state.scheduleStreamTags}
                                               onChange={this.setTags}/>
                                    </td>
                                    <td>
                                        <i className="ml-1">Comma-separated</i>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                    </table>
                </Modal.Body>
                <Modal.Footer>
                    <Button className='btn-dark' onClick={this.addToSchedule}>Add to Schedule</Button>
                </Modal.Footer>
            </Modal>
        );
    }

    render() {
        // TODO: create proper loading screen, to be used across components
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <React.Fragment>
                <Container className='my-5'>
                    <Row>
                        <Col>
                            <h4>Schedule</h4>
                        </Col>
                        <Col>
                            <Button className='btn-dark float-right' onClick={this.scheduleStreamToggle}>
                                Schedule a Stream
                            </Button>
                        </Col>
                    </Row>
                    <hr className='mt-4'/>
                    <div className='float-right mb-1'>
                        <DateTimeRangeContainer ranges={this.getDatePickerRange()} local={this.getDatePickerFormat()}
                                                start={this.state.startTime} end={this.state.endTime}
                                                applyCallback={this.applyDate} leftMode={true} noMobileMode={true}>
                            <Dropdown className='date-picker-dropdown' size='sm' toggle={() => {}}>
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

                {this.renderScheduleStream()}
            </React.Fragment>
        )
    }

}