import React from 'react';
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {Col, Container, Row, Button, DropdownToggle, Dropdown, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import DateTimeRangeContainer from 'react-advanced-datetimerange-picker';

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
            loggedInUser: '',
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
        this.getScheduleIfLoggedIn();
    }

    async getScheduleIfLoggedIn() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUser: res.data.username
            }, () => {
                this.getSchedule();
            });
        } else {
            window.location.href = `/login?redirectTo=${window.location.pathname}`;
        }
    }

    async getSchedule() {
        const res = await axios.get(`/api/users/${this.state.loggedInUser}/schedule`, {
            params: {
                scheduleStartTime: this.state.startTime.toDate(),
                scheduleEndTime: this.state.endTime.toDate()
            }
        });
        // JSON serializes dates as strings, so parse start and end times using moment
        const scheduleItems = res.data.scheduleItems.map(scheduleItem => {
            scheduleItem.start_time = moment(scheduleItem.start_time);
            scheduleItem.end_time = moment(scheduleItem.end_time);
            return scheduleItem;
        });
        this.setState({
            scheduleGroups: [...this.state.scheduleGroups, ...res.data.scheduleGroups],
            scheduleItems: [...this.state.scheduleItems, ...scheduleItems],
            loaded: true
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
        const res = await axios.get('/api/filters');
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
        await axios.post('/api/scheduled-streams', {
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

        const genres = this.state.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
            </div>
        ));

        const categories = this.state.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
            </div>
        ));

        const dateFormat = this.getDatePickerFormat().format;

        return (
            <Modal isOpen={this.state.scheduleStreamOpen} toggle={this.scheduleStreamToggle} size='lg' centered={true}>
                <ModalHeader toggle={this.scheduleStreamToggle}>Schedule a Stream</ModalHeader>
                <ModalBody>
                    <table>
                        <tbody>
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
                                        <Dropdown className='dropdown-hover-darkred' size='sm' toggle={() => {}}>
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
                                    <h5 className='mt-2'>Title:</h5>
                                </td>
                                <td>
                                    <input className='w-100 rounded-border' type='text'
                                           value={this.state.scheduleStreamTitle} onChange={this.setTitle}/>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Genre:</h5>
                                </td>
                                <td>
                                    <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                              toggle={this.genreDropdownToggle} size='sm'>
                                        <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                                        <DropdownMenu>{genres}</DropdownMenu>
                                    </Dropdown>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Category:</h5>
                                </td>
                                <td>
                                    <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                              toggle={this.categoryDropdownToggle} size='sm'>
                                        <DropdownToggle caret>{categoryDropdownText}</DropdownToggle>
                                        <DropdownMenu>{categories}</DropdownMenu>
                                    </Dropdown>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Tags:</h5>
                                </td>
                                <td>
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <input className='mt-1 rounded-border' type='text'
                                                           value={this.state.scheduleStreamTags} onChange={this.setTags}/>
                                                </td>
                                                <td>
                                                    <i className='ml-1'>Comma-separated</i>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.addToSchedule}>Add to Schedule</Button>
                </ModalFooter>
            </Modal>
        );
    }

    render() {
        // TODO: create proper loading screen, to be used across components
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <React.Fragment>
                <Container fluid className='my-5'>
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
                            <Dropdown className='dropdown-hover-darkred' size='sm' toggle={() => {}}>
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