import React, {Suspense, lazy} from 'react';
import {dateFormat, filters, pagination, siteName, storage, validation} from '../../mainroom.config';
import axios from 'axios';
import {
    displayErrorMessage,
    displayGenreAndCategory, displaySuccessMessage,
    getAlert,
    LoadingSpinner
} from '../utils/displayUtils';
import {
    Alert,
    Button,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem, NavLink, Progress,
    Row,
    Spinner, TabContent, TabPane
} from 'reactstrap';
import {Link} from 'react-router-dom';
import {convertLocalToUTC, convertUTCToLocal, formatDateRange, timeSince} from '../utils/dateUtils';
import ViewersIcon from '../icons/eye.svg';
import {shortenNumber} from '../utils/numberUtils';
import moment from 'moment';
import EditIcon from '../icons/edit.svg';
import DeleteIcon from '../icons/trash.svg';
import SubscribedIcon from '../icons/user-check.svg';
import SubscribeIcon from '../icons/user-plus.svg';
import RemoveIcon from '../icons/x.svg';
import DateTimeRangeContainer from 'react-advanced-datetimerange-picker';
import AddIcon from '../icons/plus-white-20.svg';
import WhiteDeleteIcon from '../icons/trash-white-20.svg';
import CalendarIcon from '../icons/calendar-white-20.svg';
import Timeline from 'react-calendar-timeline';
import PlusIcon from '../icons/plus-white.svg';
import io from 'socket.io-client';
import {ReactHeight} from 'react-height/lib/ReactHeight';

const ImageUploader = lazy(() => import('react-images-upload'));

const STARTING_PAGE = 1;
const STREAMS_TAB_ID = 0;
const SCHEDULE_TAB_ID = 1
const CHAT_TAB_ID = 2;
const SCROLL_MARGIN_HEIGHT = 30;
const CHAT_HEIGHT_NAVBAR_OFFSET = 56;
const S3_PART_SIZE = 1024 * 1024 * 5;

export default class Event extends React.Component {

    constructor(props) {
        super(props);

        this.toggleOptionsDropdown = this.toggleOptionsDropdown.bind(this);
        this.toggleEditEventModal = this.toggleEditEventModal.bind(this);
        this.setEditEventName = this.setEditEventName.bind(this);
        this.editEventApplyDate = this.editEventApplyDate.bind(this);
        this.setEditTags = this.setEditTags.bind(this);
        this.onBannerImageUpload = this.onBannerImageUpload.bind(this);
        this.onEventThumbnailUpload = this.onEventThumbnailUpload.bind(this);
        this.addStage = this.addStage.bind(this);
        this.setEditStageName = this.setEditStageName.bind(this);
        this.removeStage = this.removeStage.bind(this);
        this.onStageSplashThumbnailUpload = this.onStageSplashThumbnailUpload.bind(this);
        this.editEvent = this.editEvent.bind(this);
        this.toggleDeleteEventModal = this.toggleDeleteEventModal.bind(this);
        this.deleteEvent = this.deleteEvent.bind(this);
        this.onClickSubscribeButton = this.onClickSubscribeButton.bind(this);
        this.scheduleApplyDate = this.scheduleApplyDate.bind(this);
        this.toggleScheduleTab = this.toggleScheduleTab.bind(this);
        this.toggleChatTab = this.toggleChatTab.bind(this);
        this.toggleScheduleStreamModal = this.toggleScheduleStreamModal.bind(this);
        this.stageDropdownToggle = this.stageDropdownToggle.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setScheduleStage = this.setScheduleStage.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.clearGenre = this.clearGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.clearCategory = this.clearCategory.bind(this);
        this.setTags = this.setTags.bind(this);
        this.scheduleStreamApplyDate = this.scheduleStreamApplyDate.bind(this);
        this.addToSchedule = this.addToSchedule.bind(this);
        this.deselectScheduledStream = this.deselectScheduledStream.bind(this);
        this.onMessageTextChange = this.onMessageTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageSubmit = this.onMessageSubmit.bind(this);
        this.addMessageToChat = this.addMessageToChat.bind(this);
        this.onVideoFileSelected = this.onVideoFileSelected.bind(this);

        this.state = {
            eventName: '',
            createdBy: '',
            startTime: 0,
            endTime: 0,
            datePickerStartTime: 0,
            datePickerEndTime: 0,
            bannerPicURL: '',
            stages: [],
            tags: [],
            numOfSubscribers: 0,
            recordedStreams: [],
            loggedInUser: undefined,
            isLoggedInUserSubscribed: false,
            isOptionsDropdownOpen: false,
            activeTab: 0,
            isEditEventModalOpen: false,
            editEventName: '',
            editEventStartTime: undefined,
            editEventEndTime: undefined,
            editEventTags: [],
            editEventStages: [],
            editEventUploadedBannerImage: undefined,
            editEventUploadedEventThumbnail: undefined,
            showEditEventSpinnerAndProgress: false,
            editEventProgress: 0,
            editEventErrorMessage: '',
            isDeleteEventModalOpen: false,
            showDeleteSpinner: false,
            isScheduleLoaded: false,
            scheduleStages: [],
            genres: [],
            categories: [],
            scheduleStreamModalOpen: false,
            stageDropdownOpen: false,
            genreDropdownOpen: false,
            categoryDropdownOpen: false,
            scheduleStreamStage: undefined,
            scheduleStreamStartTime: 0,
            scheduleStreamEndTime: 0,
            scheduleStreamTitle: '',
            scheduleStreamGenre: '',
            scheduleStreamCategory: '',
            scheduleStreamTags: [],
            selectedVideoFileSize: 0,
            showAddToScheduleSpinner: false,
            addToScheduleErrorMessage: '',
            socketIOURL: '',
            chat: [],
            unreadChatMessages: 0,
            msg: '',
            chatHeight: 0,
            chatHeightOffset: 0,
            recordedStreamsNextPage: STARTING_PAGE,
            showLoadMoreButton: false,
            showLoadMoreSpinner: false,
            alertText: '',
            alertColor: ''
        }
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        try {
            await this.getEventData();
            await Promise.all([
                this.getRecordedStreams(),
                this.getLoggedInUser()
            ]);
            this.setState({
                loaded: true
            });
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    async getEventData() {
        try {
            const res = await axios.get(`/api/events/${this.props.match.params.eventId}`);
            document.title = `${res.data.eventName} - ${siteName}`;
            const startTime = convertUTCToLocal(res.data.startTime);
            const endTime = convertUTCToLocal(res.data.endTime);
            const scheduleStreamEndTime = moment(startTime).add(1, 'hour');
            this.setState({
                eventName: res.data.eventName,
                createdBy: res.data.createdBy,
                startTime,
                endTime,
                datePickerStartTime: startTime,
                datePickerEndTime: endTime,
                scheduleStreamStartTime: startTime,
                scheduleStreamEndTime: scheduleStreamEndTime.isAfter(endTime) ? endTime : scheduleStreamEndTime,
                bannerPicURL: res.data.bannerPicURL,
                tags: res.data.tags,
                stages: res.data.stages,
                numOfSubscribers: res.data.numOfSubscribers,
                socketIOURL: res.data.socketIOURL
            }, () => {
                if (!this.socket) {
                    this.connectToSocketIO();
                }
            });
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                displayErrorMessage(this, `An error occurred when loading event info. Please try again later. (${err})`);
            }
        }
    }

    async getRecordedStreams() {
        this.setState({showLoadMoreSpinner: true}, async () => {
            try {
                const res = await axios.get(`/api/events/${this.props.match.params.eventId}/recorded-streams`, {
                    params: {
                        page: this.state.nextPage,
                        limit: pagination.small
                    }
                });
                this.setState({
                    recordedStreams: [...this.state.recordedStreams, ...(res.data.recordedStreams || [])],
                    nextPage: res.data.nextPage,
                    showLoadMoreButton: !!res.data.nextPage,
                    showLoadMoreSpinner: false
                });
            } catch (err) {
                this.setState({showLoadMoreSpinner: false});
                displayErrorMessage(this, `An error occurred when loading past streams. Please try again later. (${err})`);
            }
        });
    }

    getSchedule() {
        this.setState({isScheduleLoaded: false}, async () => {
            const res = await axios.get(`/api/events/${this.props.match.params.eventId}/scheduled-streams`, {
                params: {
                    scheduleStartTime: convertLocalToUTC(this.state.datePickerStartTime).toDate(),
                    scheduleEndTime: convertLocalToUTC(this.state.datePickerEndTime).toDate()
                }
            });

            const scheduleItems = res.data.scheduleItems.map(scheduleItem => {
                // JSON serializes dates as strings, so parse start and end times into moment objects
                scheduleItem.start_time = convertUTCToLocal(scheduleItem.start_time);
                scheduleItem.end_time = convertUTCToLocal(scheduleItem.end_time);

                // disable movement of schedule item
                scheduleItem.canMove = false;
                scheduleItem.canResize = false;
                scheduleItem.canChangeGroup = false;

                scheduleItem.itemProps = {
                    onDoubleClick: () => this.selectScheduledStream(scheduleItem.id)
                };

                return scheduleItem;
            });

            this.setState({
                scheduleGroups: res.data.scheduleGroups,
                scheduleItems,
                isScheduleLoaded: true
            });
        });
    }

    async getLoggedInUser() {
        const res = await axios.get('/api/logged-in-user')
        this.setState({
            loggedInUser: res.data
        }, () => {
            this.isLoggedInUserSubscribed();
        });
    }

    async isLoggedInUserSubscribed() {
        if (this.state.loggedInUser && this.state.loggedInUser._id && this.state.loggedInUser._id !== this.state.createdBy._id) {
            const res = await axios.get(`/api/users/${this.state.loggedInUser._id}/subscribed-to-event/${this.props.match.params.eventId}`);
            this.setState({
                isLoggedInUserSubscribed: res.data
            });
        }
    }

    connectToSocketIO() {
        this.socket = io(this.state.socketIOURL, {transports: [ 'websocket' ]});
        this.socket.on(`chatMessage_${this.props.match.params.eventId}`, this.addMessageToChat);
    }

    componentWillUnmount() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    addMessageToChat({sender, msg}) {
        const displayName = this.state.loggedInUser && sender.username === this.state.loggedInUser.username
            ? <b>You:</b>
            : (sender.displayName || sender.username) + ':';

        const chatMessage = (
            <div className='ml-1' key={this.state.chat.length}>
                <span className='black-link' title={`Go to ${sender.displayName || sender.username}'s profile`}>
                    <Link to={`/user/${sender.username}`}>
                        <img src={sender.profilePicURL} width='25' height='25'
                             alt={`${sender.username} profile picture`} className='rounded-circle'/>
                        <span className='ml-1' style={{color: sender.chatColour}}>{displayName}</span>
                    </Link>
                </span>
                &nbsp;
                <span>{msg}</span>
            </div>
        );

        let unreadChatMessages = this.state.unreadChatMessages;
        if (this.state.activeTab !== CHAT_TAB_ID && unreadChatMessages !== '99+') {
            unreadChatMessages++;
            if (unreadChatMessages > 99) {
                unreadChatMessages = '99+';
            }
        }

        this.setState({
            chat: [...this.state.chat, chatMessage],
            unreadChatMessages
        });
    }

    setActiveTab(tab) {
        if (this.state.activeTab !== tab) {
            this.setState({
                activeTab: tab
            });
        }
    }

    toggleScheduleTab() {
        if (!this.state.scheduleGroups || !this.state.scheduleItems) {
            this.getSchedule();
        }
        this.setActiveTab(SCHEDULE_TAB_ID);
    }

    toggleChatTab() {
        this.setActiveTab(CHAT_TAB_ID);
        window.scrollTo(0, document.body.scrollHeight);
        this.setState({unreadChatMessages: 0});
    }

    toggleOptionsDropdown() {
        this.setState(prevState => ({
            isOptionsDropdownOpen: !prevState.isOptionsDropdownOpen
        }));
    }

    toggleEditEventModal() {
        this.setState(prevState => ({
            isEditEventModalOpen: !prevState.isEditEventModalOpen,
            editEventName: this.state.eventName,
            editEventStartTime: this.state.startTime,
            editEventEndTime: this.state.endTime,
            editEventTags: [...this.state.tags],
            editEventStages: this.state.stages.map(stage => {
                return {
                    _id: stage._id,
                    stageName: stage.stageName,
                    uploadedSplashThumbnail: undefined
                };
            })
        }));
    }

    setEditEventName(e) {
        this.setState({
            editEventName: e.target.value
        });
    }

    editEventDatePickerRange() {
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
            'format': dateFormat,
            'sundayFirst': false
        };
    }

    isNoMobileMode() {
        const mdBreakpointValue = window.getComputedStyle(document.documentElement)
            .getPropertyValue('--breakpoint-md')
            .replace('px', '');
        return window.screen.width >= mdBreakpointValue;
    }

    editEventApplyDate(startTime, endTime) {
        this.setState({
            editEventStartTime: startTime,
            editEventEndTime: endTime
        });
    }

    setEditTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        if (tags.length > validation.event.tagsMaxAmount) {
            return;
        }
        this.setState({
            editEventTags: tags
        });
    }

    onBannerImageUpload(pictureFiles) {
        this.setState({
            editEventUploadedBannerImage: pictureFiles[0]
        });
    }

    onEventThumbnailUpload(pictureFiles) {
        this.setState({
            editEventUploadedEventThumbnail: pictureFiles[0]
        });
    }

    setEditStageName(e, index) {
        const editEventStages = this.state.editEventStages;
        editEventStages[index].stageName = event.target.value;
        this.setState({editEventStages});
    }

    addStage() {
        if (this.state.editEventStages.length === validation.event.stagesMaxAmount) {
            return;
        }
        this.setState({
            editEventStages: [...this.state.editEventStages, {
                stageName: '',
                uploadedSplashThumbnail: undefined
            }]
        });
    }

    removeStage(index) {
        const editEventStages = this.state.editEventStages;
        editEventStages.splice(index, 1);
        this.setState({editEventStages});
    }

    onStageSplashThumbnailUpload(pictureFiles, pictureData, index) {
        const editEventStages = this.state.editEventStages;
        editEventStages[index].uploadedSplashThumbnail = pictureFiles[0];
        this.setState({editEventStages});
    }

    editEvent() {
        this.setState({
            showEditEventSpinnerAndProgress: true,
            editEventProgress: 0,
            editEventErrorMessage: ''
        }, async () => {
            let steps = this.state.editEventStages.length + 1;
            if (this.state.editEventUploadedBannerImage) steps++;
            if (this.state.editEventUploadedEventThumbnail) steps++;
            const percentPerStep = (100 - this.state.editEventProgress) / steps;

            try {
                let res;
                try {
                    res = await axios.put('/api/events', {
                        eventId: this.props.match.params.eventId,
                        userId: this.state.loggedInUser._id,
                        eventName: this.state.editEventName,
                        startTime: convertLocalToUTC(this.state.editEventStartTime),
                        endTime: convertLocalToUTC(this.state.editEventEndTime),
                        tags: this.state.editEventTags,
                        stages: this.state.editEventStages.map(stage => {
                            return {
                                _id: stage._id,
                                stageName: stage.stageName
                            };
                        })
                    });
                } catch (err) {
                    if (err.response.status === 403) {
                        return this.setState({
                            showCreateEventSpinnerAndProgress: false,
                            createEventProgress: 0,
                            createEventErrorMessage: err.response.data
                        });
                    }
                    throw err;
                }

                this.setState({editEventProgress: this.state.editEventProgress + percentPerStep});

                if (this.state.editEventUploadedBannerImage) {
                    const data = new FormData();
                    data.set(storage.formDataKeys.event.bannerPic, this.state.editEventUploadedBannerImage);

                    await axios.patch(`/api/events/${res.data.eventId}/banner-pic`, data, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    this.setState({editEventProgress: this.state.editEventProgress + percentPerStep});
                }

                if (this.state.editEventUploadedEventThumbnail) {
                    const data = new FormData();
                    data.set(storage.formDataKeys.event.thumbnail, this.state.editEventUploadedEventThumbnail);

                    await axios.patch(`/api/events/${res.data.eventId}/thumbnail`, data, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    this.setState({editEventProgress: this.state.editEventProgress + percentPerStep});
                }

                for (let i = 0; i < this.state.editEventStages.length; i++) {
                    const uploadedStageSplashThumbnail = this.state.editEventStages[i].uploadedSplashThumbnail;
                    if (uploadedStageSplashThumbnail) {
                        const eventStageId = res.data.eventStageIds[i];

                        const data = new FormData();
                        data.set(storage.formDataKeys.eventStage.splashThumbnail, uploadedStageSplashThumbnail);

                        await axios.patch(`/api/events/${res.data.eventId}/stage/${eventStageId}/splash-thumbnail`, data, {
                            headers: {
                                'Content-Type': 'multipart/form-data'
                            }
                        });
                    }

                    this.setState({editEventProgress: this.state.editEventProgress + percentPerStep});
                }

                location.reload(); // reload page to refresh pics in browser cache
            } catch (err) {
                displayErrorMessage(this, `An error occurred when editing event. Please try again later. (${err})`);
                this.toggleEditEventModal();
                this.setState({
                    showEditEventSpinnerAndProgress: false,
                    editEventProgress: 0
                });
            }
        });
    }

    renderEditStages() {
        return this.state.editEventStages.map((stage, index) => (
            <Row className='mt-1' key={index}>
                <Col xs='12'>Stage Name</Col>
                <Col className={index === 0 ? undefined : 'remove-padding-r'} xs={index === 0 ? 12 : 11}>
                    <input className='rounded-border w-100' type='text' value={stage.stageName}
                           onChange={e => this.setEditStageName(e, index)}
                           maxLength={validation.eventStage.stageNameMaxLength}/>
                </Col>
                {index === 0 ? undefined : (
                    <Col className='remove-padding-l' xs='1'>
                        <a href='javascript:;' onClick={() => this.removeStage(index)}>
                            <img src={RemoveIcon} className='ml-2' alt='Remove Link icon'/>
                        </a>
                    </Col>
                )}
                <Col className='mt-2' xs='12'>
                    <details>
                        <summary>Change Splash Thumbnail</summary>
                        <Suspense fallback={<LoadingSpinner />}>
                            <ImageUploader buttonText='Choose Splash Thumbnail' label='Maximum file size: 2MB'
                                           maxFileSize={2 * 1024 * 1024}
                                           onChange={(files, pics) => this.onStageSplashThumbnailUpload(files, pics, index)}
                                           withPreview={true} singleImage={true} withIcon={false}/>
                        </Suspense>
                    </details>
                    {index === validation.event.stagesMaxAmount - 1 ? undefined : <hr className='my-2'/>}
                </Col>
            </Row>
        ));
    }

    renderEditEventModal() {
        return !this.state.isEditEventModalOpen ? undefined : (
            <Modal isOpen={this.state.isEditEventModalOpen} toggle={this.toggleEditEventModal} centered={true}>
                <ModalHeader toggle={this.toggleEditEventModal}>
                    Edit Event
                </ModalHeader>
                <ModalBody>
                    <Container fluid className='remove-padding-lr'>
                        <Row>
                            <Col xs='12'>
                                <h5>Event Name</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='w-100 rounded-border' type='text' value={this.state.editEventName}
                                       onChange={this.setEditEventName} maxLength={validation.event.eventNameMaxLength} />
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Date & Time</h5>
                            </Col>
                            <Col xs='12'>
                                <DateTimeRangeContainer start={this.state.editEventStartTime}
                                                        end={this.state.editEventEndTime}
                                                        ranges={this.editEventDatePickerRange()}
                                                        local={this.getDatePickerFormat()}
                                                        noMobileMode={this.isNoMobileMode()}
                                                        applyCallback={this.editEventApplyDate} autoApply
                                                        style={{standaloneLayout: {display: 'flex', maxWidth: 'fit-content'}}}>
                                    <Dropdown className='dropdown-hover-darkred' size='sm' toggle={() => {}}>
                                        <DropdownToggle caret>
                                            {formatDateRange({
                                                start: this.state.editEventStartTime,
                                                end: this.state.editEventEndTime
                                            })}
                                        </DropdownToggle>
                                    </Dropdown>
                                </DateTimeRangeContainer>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Tags</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='rounded-border w-100' type='text'
                                       value={this.state.editEventTags} onChange={this.setEditTags}/>
                            </Col>
                            <Col xs='12'>
                                <i>Up to {validation.event.tagsMaxAmount} comma-separated tags, no spaces</i>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <details>
                                    <summary>Change Banner Image</summary>
                                    <Suspense fallback={<LoadingSpinner />}>
                                        <ImageUploader buttonText='Choose Banner Image' label='Maximum file size: 2MB'
                                                       maxFileSize={2 * 1024 * 1024} onChange={this.onBannerImageUpload}
                                                       withPreview={true} singleImage={true} withIcon={false}/>
                                    </Suspense>
                                </details>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <details>
                                    <summary>Change Thumbnail</summary>
                                    <Suspense fallback={<LoadingSpinner />}>
                                        <ImageUploader buttonText='Choose Thumbnail' label='Maximum file size: 2MB'
                                                       maxFileSize={2 * 1024 * 1024} onChange={this.onEventThumbnailUpload}
                                                       withPreview={true} singleImage={true} withIcon={false}/>
                                    </Suspense>
                                </details>
                            </Col>
                        </Row>
                    </Container>
                    <h5 className='mt-4'>Stages</h5>
                    <hr/>
                    <Container fluid className='remove-padding-lr'>
                        {this.renderEditStages()}
                        {this.state.editEventStages.length === validation.event.stagesMaxAmount ? undefined : (
                            <Row className='mt-2'>
                                <Col xs='12'>
                                    <Button className='btn-dark' size='sm' onClick={this.addStage}>
                                        <img src={AddIcon} className='mr-1' alt='Add Stage icon'/>
                                        Add Stage
                                    </Button>
                                </Col>
                            </Row>
                        )}
                    </Container>
                    {!this.state.showEditEventSpinnerAndProgress ? undefined :
                        <Progress className='mt-2' value={this.state.editEventProgress} />}
                    <Alert className='mt-4' isOpen={!!this.state.editEventErrorMessage} color='danger'>
                        {this.state.editEventErrorMessage}
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.editEvent}>
                        {this.state.showEditEventSpinnerAndProgress ? <Spinner size='sm' /> : undefined}
                        <span className={this.state.showEditEventSpinnerAndProgress ? 'sr-only' : undefined}>
                            Edit Event
                        </span>
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    toggleDeleteEventModal() {
        this.setState(prevState => ({
            isDeleteEventModalOpen: !prevState.isDeleteEventModalOpen
        }));
    }

    deleteEvent() {
        this.setState({showDeleteSpinner: true}, async () => {
            try {
                await axios.delete(`/api/events/${this.props.match.params.eventId}`);
                window.location.href = '/events';
            } catch (err) {
                displayErrorMessage(this, `An error occurred when deleting ${this.state.eventName}. Please try again later. (${err})`);
                this.setState({
                    showDeleteSpinner: false,
                    isDeleteEventModalOpen: false
                });
            }
        });
    }
    
    renderDeleteEventModal() {
        return !this.state.isDeleteEventModalOpen ? undefined : (
            <Modal isOpen={this.state.isDeleteEventModalOpen} toggle={this.toggleDeleteEventModal}
                   size='md' centered={true}>
                <ModalHeader toggle={this.toggleDeleteEventModal}>
                    Delete Event
                </ModalHeader>
                <ModalBody>
                    <p>Are you sure you want to delete '{this.state.eventName}'?</p>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-danger' onClick={this.deleteEvent}>
                        {this.state.showDeleteSpinner ? <Spinner size='sm'/> : undefined}
                        <span className={this.state.showDeleteSpinner ? 'sr-only' : undefined}>
                            <img src={WhiteDeleteIcon} width={18} height={18} className='mr-2 mb-1'
                                 alt='Delete Event icon'/>
                            Delete
                        </span>
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    onClickSubscribeButton() {
        this.state.isLoggedInUserSubscribed ? this.unsubscribeFromEvent() : this.subscribeToEvent();
    }

    async subscribeToEvent() {
        try {
            await axios.post(`/api/users/${this.state.loggedInUser._id}/subscribe-to-event/${this.props.match.params.eventId}`);
            this.setState({
                isLoggedInUserSubscribed: true,
                numOfSubscribers: this.state.numOfSubscribers + 1
            });
        } catch (err) {
            displayErrorMessage(this, `An error occurred when subscribing to event. Please try again later. (${err})`);
        }
    }

    async unsubscribeFromEvent() {
        try {
            await axios.post(`/api/users/${this.state.loggedInUser._id}/unsubscribe-from-event/${this.props.match.params.eventId}`);
            this.setState({
                isLoggedInUserSubscribed: false,
                numOfSubscribers: this.state.numOfSubscribers - 1
            });
        } catch (err) {
            displayErrorMessage(this, `An error occurred when unsubscribing from event. Please try again later. (${err})`);
        }
    }

    renderOptionsOrSubscribeButton() {
        return this.state.loggedInUser ? (
            this.state.loggedInUser._id === this.state.createdBy._id ? (
                <Dropdown className='float-right options-dropdown' isOpen={this.state.isOptionsDropdownOpen}
                          toggle={this.toggleOptionsDropdown} size='sm'>
                    <DropdownToggle className='pr-0' caret>
                        Options
                    </DropdownToggle>
                    <DropdownMenu right>
                        <DropdownItem onClick={this.toggleEditEventModal}>
                            <img src={EditIcon} width={22} height={22} className='mr-3'
                                 alt='Edit Event icon'/>
                            Edit
                        </DropdownItem>
                        <DropdownItem onClick={this.toggleDeleteEventModal}>
                            <img src={DeleteIcon} width={22} height={22} className='mr-3'
                                 alt='Delete Event icon'/>
                            Delete
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            ) : (
                <Button className='btn-dark' onClick={this.onClickSubscribeButton}>
                    <img src={this.state.isLoggedInUserSubscribed ? SubscribedIcon : SubscribeIcon}
                         alt={this.state.isLoggedInUserSubscribed ? 'Subscribed icon' : 'Subscribe icon'}
                         className='float-left mr-2'/>
                    {this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            )
        ) : (
            <Button className='btn-dark' href={`/login?redirectTo=${window.location.pathname}`}>
                <img src={SubscribeIcon} className='float-left mr-2' alt='Subscribe icon'/>
                Subscribe
            </Button>
        );
    }

    renderStages() {
        const stages = this.state.stages.map((stage, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                {!stage.isLive ? undefined : <span className='live-label'>LIVE</span>}
                {!stage.isLive ? undefined : (
                    <span className='view-count'>
                        <img src={ViewersIcon} width={18} height={18} className='mr-1 my-1' alt='Viewers icon'/>
                        {shortenNumber(stage.streamInfo.viewCount)}
                    </span>
                )}
                <Link to={`/stage/${stage._id}`}
                      title={stage.isLive ? stage.stageName : `${stage.stageName} closed`}>
                    <img className='w-100' src={stage.thumbnailURL} alt={`${stage.stageName} Stage Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                    <tr>
                        <td className='w-100'>
                            <h5>
                                <Link to={`/stage/${stage._id}`}
                                      title={stage.isLive ? stage.stageName : `${stage.stageName} closed`}>
                                    {stage.stageName}
                                </Link>
                                {!stage.isLive ? undefined : (
                                    <span className='black-link'>
                                        <Link to={stage.isLive ? `/stage/${stage._id}` : ''}>
                                            {stage.streamInfo.title ? ` - ${stage.streamInfo.title}` : ''}
                                        </Link>
                                    </span>
                                )}
                            </h5>
                            {!stage.isLive ? undefined : (
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: stage.streamInfo.genre,
                                        category: stage.streamInfo.category
                                    })}
                                </h6>
                            )}
                        </td>
                    </tr>
                    </tbody>
                </table>
            </Col>
        ));

        return (
            <React.Fragment>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {stages}
                </Row>
            </React.Fragment>
        );
    }

    renderPastStreams() {
        if (!this.state.recordedStreams || !this.state.recordedStreams.length) {
            return undefined;
        }

        const pastStreams = this.state.recordedStreams.map((stream, index) => (
            <Row key={index} className='margin-bottom-thick'>
                <Col className='stream' md='6' lg='4'>
                    <span className='video-duration'>{stream.videoDuration}</span>
                    <span className='view-count'>
                        <img src={ViewersIcon} width={18} height={18} className='mr-1 my-1' alt='Views icon'/>
                        {shortenNumber(stream.viewCount)}
                    </span>
                    <Link to={`/stream/${stream._id}`}>
                        <img className='w-100' src={stream.thumbnailURL}
                             alt={`${stream.title} Stream Thumbnail`}/>
                    </Link>
                </Col>
                <Col md='6' lg='8'>
                    <h5 className='black-link text-break'>
                        <Link to={`/stream/${stream._id}`}>
                            {stream.title}
                        </Link>
                    </h5>
                    <h6>
                        {displayGenreAndCategory({
                            genre: stream.genre,
                            category: stream.category
                        })}
                    </h6>
                    <h6>{timeSince(stream.timestamp)}</h6>
                </Col>
            </Row>
        ));

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={this.getRecordedStreams}>
                    {this.state.showLoadMoreSpinner ? <Spinner size='sm' /> : undefined}
                    {this.state.showLoadMoreSpinner ? undefined : 'Load More'}
                </Button>
            </div>
        );

        return (
            <React.Fragment>
                <h5>Past Streams</h5>
                <hr className='my-4'/>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {pastStreams}
                </Row>
                {loadMoreButton}
            </React.Fragment>
        );
    }

    scheduleDatePickerRange() {
        return {
            'Full Event': [this.state.startTime, this.state.endTime]
        };
    }

    scheduleApplyDate(startTime, endTime) {
        this.setState({
            datePickerStartTime: moment(startTime).isBefore(this.state.startTime) ? this.state.startTime : startTime,
            datePickerEndTime: moment(endTime).isAfter(this.state.endTime) ? this.state.endTime : endTime
        }, () => {
            this.getSchedule();
        });
    }

    toggleScheduleStreamModal() {
        this.setState(prevState => ({
            scheduleStreamModalOpen: !prevState.scheduleStreamModalOpen
        }), () => {
            this.getStagesForScheduleDropdown()
            if (this.state.scheduleStreamModalOpen && !(this.state.genres.length || this.state.categories.length)) {
                this.getFilters();
            }
        });
    }

    getFilters() {
        const genres = filters.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
            </div>
        ));

        const categories = filters.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
            </div>
        ));

        this.setState({
            genres,
            categories
        });
    }

    getStagesForScheduleDropdown() {
        const stages = this.state.stages.map((stage, index) => (
            <div key={index}>
                <DropdownItem onClick={() => this.setScheduleStage(stage)}>{stage.stageName}</DropdownItem>
            </div>
        ));

        this.setState( {
            scheduleStages: stages
        });
    }

    stageDropdownToggle() {
        this.setState(prevState => ({
            stageDropdownOpen: !prevState.stageDropdownOpen
        }));
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

    setScheduleStage({_id, stageName}) {
        this.setState({
            scheduleStreamStage: {_id, stageName}
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
        if (tags.length > validation.streamSettings.tagsMaxAmount) {
            return;
        }
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

    onVideoFileSelected() {
        const videoFileInput = document.getElementById('videoFileInput');
        if (videoFileInput.files && videoFileInput.files.length === 1) {
            this.setState({
                selectedVideoFileSize: videoFileInput.files[0].size
            });
        }
    }

    addToSchedule() {
        if (!this.state.scheduleStreamStage) {
            return this.setState({
                addToScheduleErrorMessage: 'Please select a stage'
            });
        }

        this.setState({
            addToScheduleErrorMessage: '',
            showAddToScheduleSpinner: true
        }, async () => {
            try {
                let prerecordedVideoFile;
                if (this.state.selectedVideoFileSize) {
                    prerecordedVideoFile = await this.uploadVideoFile();
                }

                await axios.post('/api/scheduled-streams', {
                    userId: this.state.loggedInUser._id,
                    eventStageId: this.state.scheduleStreamStage._id,
                    startTime: convertLocalToUTC(this.state.scheduleStreamStartTime),
                    endTime: convertLocalToUTC(this.state.scheduleStreamEndTime),
                    title: this.state.scheduleStreamTitle,
                    genre: this.state.scheduleStreamGenre,
                    category: this.state.scheduleStreamCategory,
                    tags: this.state.scheduleStreamTags,
                    prerecordedVideoFile
                });

                const dateRange = formatDateRange({
                    start: this.state.scheduleStreamStartTime,
                    end: this.state.scheduleStreamEndTime
                });
                const alertText = `Successfully scheduled ${this.state.scheduleStreamTitle ?
                    `'${this.state.scheduleStreamTitle}'` : 'stream'} for ${dateRange}`;

                const scheduleStreamEndTime = moment(this.state.endTime).add(1, 'hour');
                this.setState({
                    scheduleStreamStage: undefined,
                    scheduleStreamStartTime: this.state.startTime,
                    scheduleStreamEndTime: scheduleStreamEndTime.isAfter(this.state.endTime) ? this.state.endTime : scheduleStreamEndTime,
                    scheduleStreamTitle: '',
                    scheduleStreamGenre: '',
                    scheduleStreamCategory: '',
                    scheduleStreamTags: [],
                    isScheduleLoaded: false,
                    activeTab: SCHEDULE_TAB_ID
                }, () => {
                    displaySuccessMessage(this, alertText);
                    this.getSchedule();
                });
            } catch (err) {
                displayErrorMessage(this, `An error occurred when creating scheduled stream. Please try again later. (${err})`);
            }
            this.toggleScheduleStreamModal();
            this.setState({showAddToScheduleSpinner: false});
        });
    }
    
    async uploadVideoFile() {
        const videoFileInput = document.getElementById('videoFileInput');
        if (videoFileInput.files && videoFileInput.files.length === 1) {
            const videoFile = videoFileInput.files[0];
            const fileExtension = videoFile.name.substring(videoFile.name.lastIndexOf('.') + 1);
            const numberOfParts = Math.ceil(this.state.selectedVideoFileSize / S3_PART_SIZE);

            const {data} = await axios.get(`/api/events/${this.state.scheduleStreamStage._id}/init-stream-upload`, {
                params: {fileExtension, numberOfParts}
            });

            const axiosForUpload = axios.create();
            delete axiosForUpload.defaults.headers.put['Content-Type']

            const uploadPromises = data.signedURLs.map((signedURL, index) => {
                const start = index * S3_PART_SIZE;
                const end = (index + 1) * S3_PART_SIZE
                const videoFilePart = index < data.signedURLs.length
                    ? videoFile.slice(start, end)
                    : videoFile.slice(start)

                return axios.put(signedURL, videoFilePart);
            });

            const uploadResult = await Promise.all(uploadPromises);
            const uploadedParts = uploadResult.map((upload, index) => ({
                ETag: upload.headers.etag,
                PartNumber: index + 1
            }));

            await axios.post(`/api/events/${this.state.scheduleStreamStage._id}/complete-stream-upload`, {
                bucket: data.bucket,
                key: data.key,
                uploadId: data.uploadId,
                uploadedParts
            });

            return {
                bucket: data.bucket,
                key: data.key
            };
        }
    }

    renderScheduleStreamModal() {
        return !this.state.scheduleStreamModalOpen ? undefined : (
            <Modal isOpen={this.state.scheduleStreamModalOpen} toggle={this.toggleScheduleStreamModal} centered={true}>
                <ModalHeader toggle={this.toggleScheduleStreamModal}>
                    Schedule a Stream
                </ModalHeader>
                <ModalBody>
                    <Container fluid className='remove-padding-lr'>
                        <Row>
                            <Col xs='12'>
                                <h5>Stage</h5>
                            </Col>
                            <Col xs='12'>
                                <Dropdown className='dropdown-hover-darkred' isOpen={this.state.stageDropdownOpen}
                                          toggle={this.stageDropdownToggle} size='sm'>
                                    <DropdownToggle caret>
                                        {this.state.scheduleStreamStage ? this.state.scheduleStreamStage.stageName : 'Select a stage...'}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        {this.state.scheduleStages}
                                    </DropdownMenu>
                                </Dropdown>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Date & Time</h5>
                            </Col>
                            <Col xs='12'>
                                <DateTimeRangeContainer start={this.state.scheduleStreamStartTime}
                                                        end={this.state.scheduleStreamEndTime}
                                                        ranges={this.scheduleDatePickerRange()}
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
                            <Col className='mt-3' xs='12'>
                                <details>
                                    <summary>Upload Prerecorded Stream <i>(optional)</i></summary>
                                    <input id='videoFileInput' className='mt-1' type='file' accept='video/*'
                                           onChange={this.onVideoFileSelected}/>
                                </details>
                            </Col>
                            <Col className='mt-3' xs='12'>
                                <h5>Title</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='w-100 rounded-border' type='text' value={this.state.scheduleStreamTitle}
                                       onChange={this.setTitle} maxLength={validation.streamSettings.titleMaxLength} />
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
                                <input className='rounded-border w-100' type='text'
                                       value={this.state.scheduleStreamTags} onChange={this.setTags}/>
                            </Col>
                            <Col xs='12'>
                                <i>Up to {validation.streamSettings.tagsMaxAmount} comma-separated tags, no spaces</i>
                            </Col>
                        </Row>
                    </Container>
                    <Alert className='mt-4' isOpen={!!this.state.addToScheduleErrorMessage} color='danger'>
                        {this.state.addToScheduleErrorMessage}
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.addToSchedule}>
                        {this.state.showAddToScheduleSpinner ? <Spinner size='sm' /> : undefined}
                        <span className={this.state.showAddToScheduleSpinner ? 'sr-only' : undefined}>
                            Add to Schedule
                        </span>
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    renderSchedule() {
        return !this.state.isScheduleLoaded ? (
            <div className='mt-5'>
                <LoadingSpinner />
            </div>
        ) : (
            <Row className='mt-4'>
                <Col>
                    {!this.state.loggedInUser || this.state.loggedInUser._id !== this.state.createdBy._id ? undefined : (
                        <div className='float-left mb-2'>
                            <Button className='btn-dark' size='sm' onClick={this.toggleScheduleStreamModal}>
                                <img src={PlusIcon} width={22} height={22} className='mr-1'
                                     alt='Schedule a Stream icon'/>
                                Schedule a Stream
                            </Button>
                        </div>
                    )}
                    <div className='float-right mb-2'>
                        <DateTimeRangeContainer ranges={this.scheduleDatePickerRange()} local={this.getDatePickerFormat()}
                                                start={this.state.datePickerStartTime} end={this.state.datePickerEndTime}
                                                applyCallback={this.scheduleApplyDate} leftMode={true}
                                                noMobileMode={this.isNoMobileMode()}>
                            <Dropdown className='dropdown-hover-darkred' size='sm' toggle={() => {}}>
                                <DropdownToggle caret>
                                    <img src={CalendarIcon} width={18} height={18} className='mr-2 mb-1'
                                         alt='Select Time Period icon'/>
                                    Select Time Period
                                </DropdownToggle>
                            </Dropdown>
                        </DateTimeRangeContainer>
                    </div>
                    <Timeline groups={this.state.scheduleGroups} items={this.state.scheduleItems}
                              onItemSelect={this.selectScheduledStream} onItemClick={this.selectScheduledStream}
                              visibleTimeStart={this.state.datePickerStartTime.valueOf()}
                              visibleTimeEnd={this.state.datePickerEndTime.valueOf()}/>
                </Col>
            </Row>
        )
    }

    selectScheduledStream(itemId, e, time) {
        this.setState({
            selectedScheduleItem: this.state.scheduleItems[itemId]
        });
    }

    deselectScheduledStream() {
        this.setState({
            selectedScheduleItem: undefined
        });
    }

    async cancelStream(streamId) {
        try {
            await axios.delete(`/api/scheduled-streams/${streamId}`);
            this.setState({selectedScheduleItem: undefined}, () => {
                displaySuccessMessage(this, 'Successfully cancelled scheduled stream');
                this.getSchedule();
            });
        } catch (err) {
            displayErrorMessage(this, `An error occurred when cancelling scheduled stream. Please try again later. (${err})`);
        }
    }

    renderSelectedScheduledStream() {
        const scheduledStream = this.state.selectedScheduleItem;
        return !scheduledStream ? undefined : (
            <Modal isOpen={true} toggle={this.deselectScheduledStream} centered={true}>
                <ModalBody>
                    <table>
                        <tbody>
                        <tr>
                            <td valign='middle' className='w-100'>
                                <h5>{scheduledStream.title}</h5>
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: scheduledStream.genre,
                                        category: scheduledStream.category
                                    })}
                                </h6>
                                {formatDateRange({
                                    start: scheduledStream.start_time,
                                    end: scheduledStream.end_time
                                })}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </ModalBody>
                {!this.state.loggedInUser || this.state.loggedInUser._id !== this.state.createdBy._id ? undefined : (
                    <ModalFooter>
                        <Button className='btn-danger' size='sm' onClick={() => this.cancelStream(scheduledStream._id)}>
                            <img src={WhiteDeleteIcon} width={18} height={18} className='mr-1 mb-1'
                                 alt='Cancel Stream icon'/>
                            Cancel Stream
                        </Button>
                    </ModalFooter>
                )}
            </Modal>
        );
    }

    onMessageTextChange(e) {
        this.setState({
            msg: e.target.value
        });
    }

    handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.onMessageSubmit();
        }
    }

    onMessageSubmit() {
        if (this.state.msg) {
            const sender = this.state.loggedInUser;
            const msg = this.state.msg;
            this.socket.emit('chatMessage', {sender, msg});
            this.setState({
                msg: ''
            });
        }
    }

    componentDidUpdate() {
        const messages = document.getElementById('messages');
        if (messages) {
            const isScrolledToBottom = messages.scrollHeight - messages.clientHeight <= messages.scrollTop + SCROLL_MARGIN_HEIGHT;
            if (isScrolledToBottom) {
                messages.scrollTop = messages.scrollHeight - messages.clientHeight;
            }
        }
    }

    setChatHeight(height) {
        if (height !== this.state.chatHeight) {
            this.setState({
                chatHeight: height
            });
        }
    }

    setChatHeightOffset(height) {
        if (height !== this.state.chatHeightOffset) {
            this.setState({
                chatHeightOffset: height
            });
        }
    }

    renderChat() {
        return (
            <Row className='h-100'>
                <Col>
                    <div id='messages' className='chat-messages'
                         style={{height: (this.state.chatHeight - this.state.chatHeightOffset + CHAT_HEIGHT_NAVBAR_OFFSET) + 'px'}}>
                        {this.state.chat}
                    </div>
                    {!(this.state.loggedInUser && this.state.loggedInUser.username) ? (
                        <div className='text-center mt-1'>
                            To participate in the chat, please <a href={`/login?redirectTo=${window.location.pathname}`}>log in</a>
                        </div>
                    ) : (
                        <div className='chat-input' style={{height: '34px', paddingRight: '30px', backgroundColor: '#F9F9F9'}}>
                            <textarea onChange={this.onMessageTextChange} onKeyDown={this.handleKeyDown}
                                      value={this.state.msg}/>
                            <button onClick={this.onMessageSubmit}>Send</button>
                        </div>
                    )}
                </Col>
            </Row>
        );
    }

    render() {
        return !this.state.loaded ? <LoadingSpinner /> : (
            <React.Fragment>
                <Container className='h-100' fluid='lg'>
                    <ReactHeight onHeightReady={height => this.setChatHeightOffset(height)}>
                        {!this.state.bannerPicURL ? undefined : (
                            <Row>
                                <Col>
                                    <img className='w-100' height={200}
                                         src={this.state.bannerPicURL} alt={`${this.state.eventName} Banner Pic`}/>
                                </Col>
                            </Row>
                        )}
                        {getAlert(this)}
                        <Row className='mt-3'>
                            <Col xs='8'>
                                <h4>{this.state.eventName}</h4>
                                <h6>
                                    {formatDateRange({
                                        start: this.state.startTime,
                                        end: this.state.endTime
                                    })}
                                </h6>
                                <h6>Created by&nbsp;
                                    <Link to={`/user/${this.state.createdBy.username}`}>
                                        {this.state.createdBy.displayName || this.state.createdBy.username}
                                    </Link>
                                </h6>
                            </Col>
                            <Col xs='4'>
                                <div className='float-right'>
                                    <h5 className='black-link text-right'>
                                        <Link to={`/event/${this.props.match.params.eventId}/subscribers`}>
                                            {shortenNumber(this.state.numOfSubscribers)} Subscriber{this.state.numOfSubscribers === 1 ? '' : 's'}
                                        </Link>
                                    </h5>
                                    {this.renderOptionsOrSubscribeButton()}
                                </div>
                            </Col>
                        </Row>
                    </ReactHeight>
                    <Nav className='mt-3' tabs>
                        <NavItem>
                            <NavLink className={this.state.activeTab === STREAMS_TAB_ID ? 'active active-tab-nav-link' : 'tab-nav-link'}
                                     onClick={() => this.setActiveTab(STREAMS_TAB_ID)}>
                                Stages
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink className={this.state.activeTab === SCHEDULE_TAB_ID ? 'active active-tab-nav-link' : 'tab-nav-link'}
                                     onClick={this.toggleScheduleTab}>
                                Schedule
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink className={this.state.activeTab === CHAT_TAB_ID ? 'active active-tab-nav-link' : 'tab-nav-link'}
                                     onClick={this.toggleChatTab}>
                                Chat {this.state.unreadChatMessages ? <i>({this.state.unreadChatMessages} unread)</i> : undefined}
                            </NavLink>
                        </NavItem>
                    </Nav>
                    <ReactHeight className='h-100' onHeightReady={height => this.setChatHeight(height)}>
                        <TabContent activeTab={this.state.activeTab} className='h-100'>
                            <TabPane tabId={STREAMS_TAB_ID}>
                                <div className='mt-4'>
                                    {this.renderStages()}
                                    {this.renderPastStreams()}
                                </div>
                            </TabPane>
                            <TabPane tabId={SCHEDULE_TAB_ID}>
                                {this.renderSchedule()}
                            </TabPane>
                            <TabPane tabId={CHAT_TAB_ID} className='h-100'>
                                {this.renderChat()}
                            </TabPane>
                        </TabContent>
                    </ReactHeight>
                </Container>
                
                {this.renderEditEventModal()}
                {this.renderDeleteEventModal()}
                {this.renderSelectedScheduledStream()}
                {this.renderScheduleStreamModal()}
            </React.Fragment>
        );
    }

}