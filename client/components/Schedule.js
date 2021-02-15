import React from 'react';
import axios from 'axios';
import Timeline from 'react-calendar-timeline'
import moment from 'moment'
import {
    Alert,
    Button,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Row,
    Spinner
} from 'reactstrap';
import DateTimeRangeContainer from 'react-advanced-datetimerange-picker';
import {convertLocalToUTC, convertUTCToLocal, formatDateRange, LONG_DATE_FORMAT} from '../utils/dateUtils';
import {alertTimeout} from '../../mainroom.config';

export default class Schedule extends React.Component {

    constructor(props) {
        super(props);

        this.applyDate = this.applyDate.bind(this);
        this.scheduleStreamToggle = this.scheduleStreamToggle.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.clearGenre = this.clearGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.clearCategory = this.clearCategory.bind(this);
        this.setTags = this.setTags.bind(this);
        this.scheduleStreamApplyDate = this.scheduleStreamApplyDate.bind(this);
        this.addToSchedule = this.addToSchedule.bind(this);

        this.state = {
            loaded: false,
            loggedInUser: '',
            loggedInUserId: '',
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
            scheduleStreamTags: [],
            showSpinner: false,
            alertText: ''
        }
    }

    componentDidMount() {
        this.getScheduleIfLoggedIn();
    }

    async getScheduleIfLoggedIn() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUser: res.data.username,
                loggedInUserId: res.data._id
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
                scheduleStartTime: convertLocalToUTC(this.state.startTime).toDate(),
                scheduleEndTime: convertLocalToUTC(this.state.endTime).toDate()
            }
        });
        // JSON serializes dates as strings, so parse start and end times using moment
        const scheduleItems = res.data.scheduleItems.map(scheduleItem => {
            scheduleItem.start_time = convertUTCToLocal(scheduleItem.start_time);
            scheduleItem.end_time = convertUTCToLocal(scheduleItem.end_time);
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
            'format': LONG_DATE_FORMAT,
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

        const genres = res.data.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
            </div>
        ));

        const categories = res.data.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
            </div>
        ));

        this.setState({
            genres,
            categories
        });
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

    clearGenre() {
        this.setState({
            scheduleStreamGenre: ''
        });
    }

    setCategory(event) {
        this.setState({
            scheduleStreamCategory: event.currentTarget.textContent,
        });
    }

    clearCategory() {
        this.setState({
            scheduleStreamCategory: ''
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

    addToSchedule() {
        this.setState({showSpinner: true}, async () => {
            const res = await axios.post('/api/scheduled-streams', {
                userId: this.state.loggedInUserId,
                startTime: convertLocalToUTC(this.state.scheduleStreamStartTime),
                endTime: convertLocalToUTC(this.state.scheduleStreamEndTime),
                title: this.state.scheduleStreamTitle,
                genre: this.state.scheduleStreamGenre,
                category: this.state.scheduleStreamCategory,
                tags: this.state.scheduleStreamTags
            });
            if (res.status === 200) {
                const dateRange = formatDateRange({
                    start: this.state.scheduleStreamStartTime,
                    end: this.state.scheduleStreamEndTime
                });
                const alertText = `Successfully scheduled ${this.state.scheduleStreamTitle ? 
                    `'${this.state.scheduleStreamTitle}'` : 'stream'} for ${dateRange}`;

                this.scheduleStreamToggle();
                this.setState({
                    alertText,
                    scheduleGroups: [],
                    scheduleItems: [],
                    scheduleStreamStartTime: moment(),
                    scheduleStreamEndTime: moment().add(1, 'hour'),
                    scheduleStreamTitle: '',
                    scheduleStreamGenre: '',
                    scheduleStreamCategory: '',
                    scheduleStreamTags: [],
                    loaded: false,
                    showSpinner: false
                }, () => {
                    setTimeout(() => this.setState({alertText: ''}), alertTimeout);
                    this.getSchedule();
                });
            }
        });
    }

    isNoMobileMode() {
        const mdBreakpointValue = window.getComputedStyle(document.documentElement)
            .getPropertyValue('--breakpoint-md')
            .replace('px', '');
        return window.screen.width >= mdBreakpointValue;
    }

    renderScheduleStream() {
        return (
            <Modal isOpen={this.state.scheduleStreamOpen} toggle={this.scheduleStreamToggle} centered={true}>
                <ModalHeader toggle={this.scheduleStreamToggle}>
                    Schedule a Stream
                </ModalHeader>
                <ModalBody>
                    <Container fluid className='remove-padding-lr'>
                        <Row>
                            <Col xs='12'>
                                <h5>Date & Time</h5>
                            </Col>
                            <Col xs='12'>
                                <DateTimeRangeContainer start={this.state.scheduleStreamStartTime}
                                                        end={this.state.scheduleStreamEndTime}
                                                        ranges={this.getDatePickerRange()}
                                                        local={this.getDatePickerFormat()}
                                                        noMobileMode={this.isNoMobileMode()}
                                                        applyCallback={this.scheduleStreamApplyDate} autoApply
                                                        style={{standaloneLayout: {display: 'flex', maxWidth: 'fit-content'}}}>
                                    <Dropdown className='dropdown-hover-darkred' size='sm' toggle={() => {}}>
                                        <DropdownToggle caret>
                                            {formatDateRange({
                                                start: this.state.scheduleStreamStartTime,
                                                end: this.state.scheduleStreamEndTime
                                            })}
                                        </DropdownToggle>
                                    </Dropdown>
                                </DateTimeRangeContainer>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Title</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='w-100 rounded-border' type='text'
                                       value={this.state.scheduleStreamTitle} onChange={this.setTitle}/>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Genre</h5>
                            </Col>
                            <Col xs='12'>
                                <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                          toggle={this.genreDropdownToggle} size='sm'>
                                    <DropdownToggle caret>
                                        {this.state.scheduleStreamGenre || 'Select a genre...'}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={this.clearGenre}
                                                      disabled={!this.state.scheduleStreamGenre}>
                                            Clear Genre
                                        </DropdownItem>
                                        <DropdownItem divider/>
                                        {this.state.genres}
                                    </DropdownMenu>
                                </Dropdown>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Category</h5>
                            </Col>
                            <Col xs='12'>
                                <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                          toggle={this.categoryDropdownToggle} size='sm'>
                                    <DropdownToggle caret>
                                        {this.state.scheduleStreamCategory || 'Select a category...'}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={this.clearCategory}
                                                      disabled={!this.state.scheduleStreamCategory}>
                                            Clear Category
                                        </DropdownItem>
                                        <DropdownItem divider/>
                                        {this.state.categories}
                                    </DropdownMenu>
                                </Dropdown>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Tags</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='rounded-border w-100-xs w-50-md' type='text'
                                       value={this.state.scheduleStreamTags} onChange={this.setTags}/>
                                <i className='ml-1'>Comma-separated, no spaces</i>
                            </Col>
                        </Row>
                    </Container>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.addToSchedule}>
                        {this.state.showSpinner ? <Spinner size='sm' /> : undefined}
                        <span className={this.state.showSpinner ? 'sr-only' : undefined}>
                            Add to Schedule
                        </span>
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    render() {
        return !this.state.loaded ? (
            <div className='position-relative h-100'>
                <Spinner color='dark' className='loading-spinner' />
            </div>
        ) : (
            <React.Fragment>
                <Container fluid>
                    <Alert color='success' className='mt-3' isOpen={this.state.alertText}>
                        {this.state.alertText}
                    </Alert>

                    <Row className={this.state.alertText ? 'mt-4' : 'mt-5'}>
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
                                                applyCallback={this.applyDate} leftMode={true}
                                                noMobileMode={this.isNoMobileMode()}>
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