import React, {Suspense, lazy} from 'react';
import {dateFormat, defaultEventStageName, pagination, siteName, storage, validation} from '../../mainroom.config';
import axios from 'axios';
import {displayErrorMessage, displayGenreAndCategory, getAlert, LoadingSpinner} from '../utils/displayUtils';
import {
    Alert,
    Button,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Modal, ModalBody, ModalFooter, ModalHeader, Progress,
    Row,
    Spinner
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

const ImageUploader = lazy(() => import('react-images-upload'));

const STARTING_PAGE = 1;

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

        this.state = {
            eventId: '',
            eventName: '',
            createdBy: '',
            startTime: 0,
            endTime: 0,
            bannerPicURL: '',
            stages: [],
            tags: [],
            recordedStreams: [],
            loggedInUserId: '',
            isLoggedInUserSubscribed: false,
            isOptionsDropdownOpen: false,
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
            await Promise.all([
                this.getEventData(),
                this.getRecordedStreams()
            ]);
            await this.getLoggedInUser()
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
        const res = await axios.get(`/api/events/${this.props.match.params.eventId}`);
        document.title = `${res.data.eventName} - ${siteName}`;
        this.setState({
            eventId: res.data._id,
            eventName: res.data.eventName,
            createdBy: res.data.createdBy,
            startTime: convertUTCToLocal(res.data.startTime),
            endTime: convertUTCToLocal(res.data.endTime),
            bannerPicURL: res.data.bannerPicURL,
            tags: res.data.tags,
            stages: res.data.stages
        });
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

    async getLoggedInUser() {
        const res = await axios.get('/api/logged-in-user')
        this.setState({
            loggedInUserId: res.data._id
        }, () => {
            this.isLoggedInUserSubscribed()
        });
    }

    async isLoggedInUserSubscribed() {
        if (this.state.loggedInUserId && this.state.loggedInUserId !== this.state.createdBy._id) {
            // TODO: change URL to match route that checks subscription to Event
            // const res = await axios.get(`/api/users/${this.state.loggedInUser}/subscribed-to/${this.props.match.params.username.toLowerCase()}`);
            // this.setState({
            //     isLoggedInUserSubscribed: res.data
            // });
        }
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
                        eventId: this.state.eventId,
                        userId: this.state.loggedInUserId,
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
                                                        ranges={this.getDatePickerRange()}
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
    
    renderDeleteEventModal() {
        
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
                <Link to={stage.isLive ? `/stage/${stage._id}` : window.location.pathname}
                      title={stage.isLive ? stage.stageName : `${stage.stageName} closed`}>
                    <img className='w-100' src={stage.thumbnailURL} alt={`${stage.stageName} Stage Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                    <tr>
                        <td className='w-100'>
                            <h5>
                                <Link to={stage.isLive ? `/stage/${stage._id}` : window.location.pathname}
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

    renderOptionsOrSubscribeButton() {
        return this.state.loggedInUserId ? (
            this.state.loggedInUserId === this.state.createdBy._id ? (
                <Dropdown className='float-right options-dropdown' isOpen={this.state.isOptionsDropdownOpen}
                          toggle={this.toggleOptionsDropdown} size='sm'>
                    <DropdownToggle caret>
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
                <Button className='float-right btn-dark' onClick={this.onClickSubscribeButton}>
                    <img src={this.state.isLoggedInUserSubscribed ? SubscribedIcon : SubscribeIcon}
                         alt={this.state.isLoggedInUserSubscribed ? 'Subscribed icon' : 'Subscribe icon'}
                         className='float-left mr-2'/>
                    {this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            )
        ) : (
            <Button className='float-right btn-dark' href={`/login?redirectTo=${window.location.pathname}`}>
                <img src={SubscribeIcon} className='float-left mr-2' alt='Subscribe icon'/>
                Subscribe
            </Button>
        );
    }

    render() {
        return !this.state.loaded ? <LoadingSpinner /> : (
            <React.Fragment>
                <Container fluid='lg'>
                    {getAlert(this)}
    
                    {!this.state.bannerPicURL ? undefined : (
                        <Row>
                            <Col>
                                <img className='w-100' height={200}
                                     src={this.state.bannerPicURL} alt={`${this.state.eventName} Banner Pic`}/>
                            </Col>
                        </Row>
                    )}
                    <Row className='mt-4'>
                        <Col>
                            {this.renderOptionsOrSubscribeButton()}
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
                    </Row>
                    <hr className='my-4'/>
                    {this.renderStages()}
                    {this.renderPastStreams()}
                </Container>
                
                {this.renderEditEventModal()}
                {this.renderDeleteEventModal()}
            </React.Fragment>
        );
    }

}