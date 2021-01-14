import React from 'react';
import axios from 'axios';
import {Container, Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import {Link} from 'react-router-dom';
import moment from 'moment';
import config from '../../mainroom.config';
import normalizeUrl from 'normalize-url';
import ImageUploader from 'react-images-upload';

const STARTING_PAGE = 1;

const STARTING_STATE = {
    loaded: false,
    loggedInUser: '',
    loggedInUserId: '',
    isLoggedInUserSubscribed: false,
    profilePicURL: '',
    displayName: '',
    location: '',
    bio: '',
    links: [],
    numOfSubscribers: 0,
    scheduledStreams: [],
    streamKey: '',
    streamTitle: '',
    streamGenre: '',
    streamCategory: '',
    streamThumbnailUrl: '',
    streamViewCount: 0,
    upcomingStreamsStartTime: moment(),
    editProfileOpen: false,
    unsavedChanges: false,
    editDisplayName: '',
    editLocation: '',
    editBio: '',
    editLinks: [],
    indexesOfInvalidLinks: [],
    showChangeProfilePicButton: false,
    changeProfilePicOpen: false,
    uploadedProfilePic: undefined,
    recordedStreams: [],
    showLoadMoreButton: false,
    nextPage: STARTING_PAGE
};

export default class UserProfile extends React.Component {

    constructor(props) {
        super(props);

        this.onClickSubscribeButton = this.onClickSubscribeButton.bind(this);
        this.editProfileToggle = this.editProfileToggle.bind(this);
        this.setDisplayName = this.setDisplayName.bind(this);
        this.setLocation = this.setLocation.bind(this);
        this.setBio = this.setBio.bind(this);
        this.addLink = this.addLink.bind(this);
        this.setLinkTitle = this.setLinkTitle.bind(this);
        this.setLinkUrl = this.setLinkUrl.bind(this);
        this.saveProfile = this.saveProfile.bind(this);
        this.mouseEnterProfilePic = this.mouseEnterProfilePic.bind(this);
        this.mouseLeaveProfilePic = this.mouseLeaveProfilePic.bind(this);
        this.changeProfilePicToggle = this.changeProfilePicToggle.bind(this);
        this.onProfilePicUpload = this.onProfilePicUpload.bind(this);
        this.saveNewProfilePic = this.saveNewProfilePic.bind(this);

        this.state = STARTING_STATE;
    }

    componentDidMount() {
        this.loadUserProfile();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.match.params.username !== this.props.match.params.username) {
            this.reloadProfile();
        }
    }

    async loadUserProfile() {
        try {
            const promiseResults = await Promise.all([
                this.getUserData(),
                this.getUpcomingStreams(),
                this.getLiveStreamIfLive(),
                this.getRecordedStreams(),
                this.getLoggedInUser()
            ]);
            const user = promiseResults[0];
            const scheduledStreams = promiseResults[1];
            this.setState({
                profilePicURL: user.profilePicURL,
                displayName: user.displayName,
                location: user.location,
                bio: user.bio,
                links: user.links,
                numOfSubscribers: user.numOfSubscribers,
                scheduledStreams,
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

    async getUserData() {
        const res = await axios.get(`/api/users/${this.props.match.params.username}`);
        return res.data;
    }

    async getUpcomingStreams() {
        const res = await axios.get('/api/scheduled-streams', {
            params: {
                username: this.props.match.params.username,
                scheduleStartTime: this.state.upcomingStreamsStartTime.toDate()
            }
        });
        return res.data.scheduledStreams;
    }

    async getLoggedInUser() {
        const res = await axios.get('/logged-in-user')
        this.setState({
            loggedInUser: res.data.username,
            loggedInUserId: res.data._id
        }, async () => {
            await this.isLoggedInUserSubscribed()
        });
    }

    async isLoggedInUserSubscribed() {
        if (this.state.loggedInUser && this.state.loggedInUser !== this.props.match.params.username) {
            const res = await axios.get(`/api/users/${this.state.loggedInUser}/subscribed-to/${this.props.match.params.username}`);
            this.setState({
                isLoggedInUserSubscribed: res.data
            });
        }
    }

    reloadProfile() {
        this.setState(STARTING_STATE, () => this.loadUserProfile());
    }

    async subscribeToUser() {
        const res = await axios.post(`/api/users/${this.state.loggedInUser}/subscribe/${this.props.match.params.username}`);
        if (res.status === 200) {
            this.setState({
                isLoggedInUserSubscribed: true,
                numOfSubscribers: this.state.numOfSubscribers + 1
            });
        }
    }

    async unsubscribeFromUser() {
        const res = await axios.post(`/api/users/${this.state.loggedInUser}/unsubscribe/${this.props.match.params.username}`);
        if (res.status === 200) {
            this.setState({
                isLoggedInUserSubscribed: false,
                numOfSubscribers: this.state.numOfSubscribers - 1
            });
        }
    }

    async getLiveStreamIfLive() {
        const stream = await axios.get(`/api/users/${this.props.match.params.username}/stream-info`);
        const streamKey = stream.data.streamKey;
        const res = await axios.get(`http://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_HTTP_PORT}/api/streams/live/${streamKey}`);
        if (res.data.isLive) {
            const thumbnail = await axios.get(`/api/livestreams/${streamKey}/thumbnail`);
            this.setState({
                streamKey: streamKey,
                streamTitle: stream.data.title,
                streamGenre: stream.data.genre,
                streamCategory: stream.data.category,
                streamViewCount: stream.data.viewCount,
                streamThumbnailUrl: thumbnail.data.thumbnailURL
            });
        }
    }

    async getRecordedStreams() {
        const res = await axios.get(`/api/recorded-streams`, {
            params: {
                username: this.props.match.params.username,
                page: this.state.nextPage,
                limit: config.pagination.small
            }
        });
        this.setState({
            recordedStreams: [...this.state.recordedStreams, ...(res.data.recordedStreams || [])],
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage
        });
    }

    onClickSubscribeButton() {
        this.state.isLoggedInUserSubscribed ? this.unsubscribeFromUser() : this.subscribeToUser();
    }

    renderSubscribeOrEditProfileButton() {
        return this.state.loggedInUser ? (
            this.state.loggedInUser === this.props.match.params.username ? (
                <Button className='btn-dark subscribe-button' onClick={this.editProfileToggle}>
                    Edit Profile
                </Button>
            ) : (
                <Button className='btn-dark subscribe-button' onClick={this.onClickSubscribeButton}>
                    {this.state.isLoggedInUserSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
            )
        ) : (
            <Button className='btn-dark subscribe-button' href={`/login?redirectTo=${window.location.pathname}`}>
                Subscribe
            </Button>
        );
    }

    renderLinks() {
        return this.state.links.map((link, index) => (
            <div key={index}>
                <a href={link.url} target='_blank' rel='noopener noreferrer'>{link.title || link.url}</a>
            </div>
        ));
    }

    renderLiveStream() {
        return !this.state.streamKey ?  undefined : (
            <React.Fragment>
                <Row className='mb-2'>
                    <Col>
                        <h2>Live Now</h2>
                    </Col>
                </Row>
                <Row>
                    <Col className='stream' md='6'>
                        <span className='live-label'>LIVE</span>
                        <span className='view-count'>{this.state.streamViewCount} viewer{this.state.streamViewCount === 1 ? '' : 's'}</span>
                        <Link to={`/user/${this.props.match.params.username}/live`}>
                            <div className='stream-thumbnail'>
                                <img src={this.state.streamThumbnailUrl}
                                     alt={`${this.props.match.params.username} Stream Thumbnail`}/>
                            </div>
                        </Link>
                    </Col>
                    <Col md='6'>
                        <h3 className='black-link'>
                            <Link to={`/user/${this.props.match.params.username}/live`}>
                                {this.state.streamTitle}
                            </Link>
                        </h3>
                        <h5>
                            <Link to={`/genre/${this.state.streamGenre}`}>
                                {this.state.streamGenre}
                            </Link> <Link to={`/category/${this.state.streamCategory}`}>
                                {this.state.streamCategory}
                            </Link>
                        </h5>
                    </Col>
                </Row>
                <hr className='mb-4'/>
            </React.Fragment>
        );
    }

    renderUpcomingStreams() {
        const scheduledStreams = this.state.scheduledStreams.map((stream, index) => {
            const genreAndCategory = (
                <h6>
                    <i>
                        <Link to={`/genre/${stream.genre}`}>
                            {stream.genre}
                        </Link> <Link to={`/category/${stream.category}`}>
                            {stream.category}
                        </Link>
                    </i>
                </h6>
            );
            const startTime = moment(stream.startTime).format('ddd, DD MMM, yyyy · HH:mm');
            const endTime = moment(stream.endTime).format('HH:mm');
            return (
                <Col key={index} md='6'>
                    <h5>{stream.title}</h5>
                    {stream.genre || stream.category ? genreAndCategory : undefined}
                    <p>{startTime}-{endTime}</p>
                </Col>
            );
        });

        return (
            <React.Fragment>
                <Row className='mb-2'>
                    <Col>
                        <h2>Upcoming Streams</h2>
                    </Col>
                </Row>
                <Row>
                    {scheduledStreams.length ? scheduledStreams : (
                        <Col>
                            <p>{this.state.displayName || this.props.match.params.username} has no upcoming streams.</p>
                        </Col>
                    )}
                </Row>
            </React.Fragment>
        );
    }

    renderPastStreams() {
        const pastStreams = this.state.recordedStreams.map((stream, index) => {
            const genreAndCategory = (
                <h6>
                    <i>
                        <Link to={`/genre/${stream.genre}`}>
                            {stream.genre}
                        </Link> <Link to={`/category/${stream.category}`}>
                            {stream.category}
                        </Link>
                    </i>
                </h6>
            );
            return (
                <Row key={index} className='margin-bottom-thick'>
                    <Col className='stream' md='6' lg='4'>
                        <Link to={`/stream/${stream._id}`}>
                            <div className='stream-thumbnail'>
                                <img src={stream.thumbnailURL} alt={`${stream.title} Stream Thumbnail`}/>
                            </div>
                        </Link>
                    </Col>
                    <Col md='6' lg='8'>
                        <h5 className='black-link'>
                            <Link to={`/stream/${stream._id}`}>
                                {stream.title}
                            </Link>
                        </h5>
                        {stream.genre || stream.category ? genreAndCategory : undefined}
                        <h6>{stream.viewCount} view{stream.viewCount === 1 ? '' : 's'} · {stream.timestamp}</h6>
                    </Col>
                </Row>
            );
        });

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={async () => await this.getRecordedStreams()}>
                    Load More
                </Button>
            </div>
        );

        return (
            <React.Fragment>
                <Row className='mb-2'>
                    <Col>
                        <h2>Past Streams</h2>
                    </Col>
                </Row>
                {pastStreams.length ? pastStreams : (
                    <Row>
                        <Col>
                            <p>{this.state.displayName || this.props.match.params.username} has no past streams.</p>
                        </Col>
                    </Row>
                )}
                {loadMoreButton}
            </React.Fragment>
        );
    }

    editProfileToggle() {
        this.setState(prevState => ({
            editProfileOpen: !prevState.editProfileOpen,
            editDisplayName: this.state.displayName,
            editLocation: this.state.location,
            editBio: this.state.bio,
            editLinks: this.state.links,
        }));
    }

    setDisplayName(event) {
        this.setState({
            editDisplayName: event.target.value,
            unsavedChanges: true
        });
    }

    setLocation(event) {
        this.setState({
            editLocation: event.target.value,
            unsavedChanges: true
        });
    }

    setBio(event) {
        this.setState({
            editBio: event.target.value,
            unsavedChanges: true
        });
    }

    setLinkTitle(event, index) {
        const links = this.state.editLinks;
        links[index].title = event.target.value;
        this.setState({
            editLinks: links,
            unsavedChanges: true
        });
    }

    setLinkUrl(event, index) {
        const links = this.state.editLinks;
        links[index].url = event.target.value;
        this.setState({
            editLinks: links,
            unsavedChanges: true
        });
    }

    async saveProfile() {
        if (await this.areLinksValid()) {
            this.normaliseLinkUrls();
            const res = await axios.patch(`/api/users/${this.state.loggedInUser}`, {
                displayName: this.state.editDisplayName,
                location: this.state.editLocation,
                bio: this.state.editBio,
                links: this.state.editLinks
            });
            if (res.status === 200) {
                this.reloadProfile();
            }
        }
    }

    async areLinksValid() {
        let isValid = true;
        this.setState({
            indexesOfInvalidLinks: this.state.editLinks.map((link, index) => {
                if (!link.url) {
                    isValid = false;
                    return index;
                }
            })
        });
        return isValid;
    }

    normaliseLinkUrls() {
        this.setState({
            editLinks: this.state.editLinks.map(link => {
                link.url = normalizeUrl(link.url, {
                    forceHttps: true,
                    stripWWW: false
                });
                return link;
            })
        });
    }

    addLink() {
        this.setState({
            editLinks: [...this.state.editLinks, {
                title: '',
                url: ''
            }],
            unsavedChanges: true
        });
    }

    removeLink(index) {
        const links = this.state.editLinks;
        links.splice(index, 1);
        this.setState({
            editLinks: links,
            unsavedChanges: true
        });
    }

    renderEditLinks() {
        const headers = !this.state.editLinks.length ? undefined : (
            <tr>
                <td>Title:</td>
                <td>URL:</td>
            </tr>
        );

        const links = this.state.editLinks.map((link, index) => (
            <tr key={index}>
                <td>
                    <input className='mt-1 rounded-border' type='text' value={link.title}
                           onChange={e => this.setLinkTitle(e, index)}/>
                </td>
                <td>
                    <input className='mt-1 rounded-border' type='text' value={link.url}
                           onChange={e => this.setLinkUrl(e, index)} size={30}/>
                </td>
                <td>
                    <Button className='btn-dark mt-1 ml-1' size='sm' onClick={() => this.removeLink(index)}>
                        Remove Link
                    </Button>
                </td>
                <td>
                    <div className='ml-1'>
                        {this.state.indexesOfInvalidLinks.includes(index) ? 'Link must have a URL' : ''}
                    </div>
                </td>
            </tr>
        ));

        return (
            <React.Fragment>
                {headers}
                {links}
            </React.Fragment>
        );
    }

    renderEditProfile() {
        return (
            <Modal isOpen={this.state.editProfileOpen} toggle={this.editProfileToggle} size='lg' centered={true}>
                <ModalHeader toggle={this.editProfileToggle}>Edit Profile</ModalHeader>
                <ModalBody>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <h5 className='mr-3'>Display Name:</h5>
                                </td>
                                <td>
                                    <input className='rounded-border' type='text' value={this.state.editDisplayName}
                                           onChange={this.setDisplayName}/>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-1 mr-3'>Location:</h5>
                                </td>
                                <td>
                                    <input className='mt-1 rounded-border' type='text' value={this.state.editLocation}
                                           onChange={this.setLocation}/>
                                </td>
                            </tr>
                            <tr>
                                <td valign='top'>
                                    <h5 className='mt-1'>Bio:</h5>
                                </td>
                                <td>
                                    <textarea className='mt-1 rounded-border' value={this.state.editBio}
                                              onChange={this.setBio}/>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <h5 className='mt-1'>Links:</h5>
                    <hr/>
                    <table>
                        <tbody>
                            {this.renderEditLinks()}
                            <tr>
                                <td>
                                    <Button className='btn-dark mt-2' size='sm' onClick={this.addLink}>
                                        Add Link
                                    </Button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' disabled={!this.state.unsavedChanges} onClick={this.saveProfile}>
                        Save Changes
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    mouseEnterProfilePic() {
        this.setState({
            showChangeProfilePicButton: true
        });
    }

    mouseLeaveProfilePic() {
        this.setState({
            showChangeProfilePicButton: false
        });
    }

    changeProfilePicToggle() {
        this.setState(prevState => ({
            changeProfilePicOpen: !prevState.changeProfilePicOpen
        }));
    }

    onProfilePicUpload(pictureFiles) {
        this.setState({
            uploadedProfilePic: pictureFiles[0]
        });
    }

    async saveNewProfilePic() {
        const data = new FormData();
        data.append('profilePic', this.state.uploadedProfilePic);

        const res = await axios.put(`/api/users/${this.state.loggedInUserId}/profile-pic`, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        if (res.status === 200) {
            location.reload();
        }
    }

    renderChangeProfilePic() {
        return (
            <Modal show={this.state.changeProfilePicOpen} toggle={this.changeProfilePicToggle} centered={true}>
                <ModalHeader toggle={this.changeProfilePicToggle}>Change Profile Picture</ModalHeader>
                <ModalBody>
                    <ImageUploader buttonText='Choose Image' label='Maximum file size: 2MB'
                                   maxFileSize={2 * 1024 * 1024} onChange={this.onProfilePicUpload}
                                   withPreview={true} singleImage={true} withIcon={false}/>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' disabled={!this.state.uploadedProfilePic}
                            onClick={this.saveNewProfilePic}>
                        Upload
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    renderProfilePic() {
        const profilePic = <img src={this.state.profilePicURL}
                                alt={`${this.props.match.params.username} Profile Picture`}/>;

        const changeProfilePicButton = (
            <Button className='btn-dark change-profile-pic-btn' onClick={this.changeProfilePicToggle}>
                Change Profile Picture
            </Button>
        );

        return this.state.loggedInUser === this.props.match.params.username ? (
            <div className='profile-pic'
                 onMouseEnter={this.mouseEnterProfilePic} onMouseLeave={this.mouseLeaveProfilePic}>
                {profilePic}
                {this.state.showChangeProfilePicButton ? changeProfilePicButton : undefined}
            </div>
        ) : (
            <div className='profile-pic'>
                {profilePic}
            </div>
        );
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <React.Fragment>
                <Container fluid='lg' className='mt-5'>
                    <Row>
                        <Col md='4' lg='3'>
                            {this.renderProfilePic()}
                            <h1>{this.state.displayName || this.props.match.params.username}</h1>
                            <h5>{this.state.location || 'Planet Earth'}</h5>
                            <h5 className='black-link'>
                                <Link to={`/user/${this.props.match.params.username}/subscribers`}>
                                    {this.state.numOfSubscribers} Subscriber{this.state.numOfSubscribers === 1 ? '' : 's'}
                                </Link>
                            </h5>
                            {this.renderSubscribeOrEditProfileButton()}
                            <p>{this.state.bio}</p>
                            {this.renderLinks()}
                            <hr className='my-4'/>
                        </Col>
                        <Col md='8' lg='9'>
                            {this.renderLiveStream()}
                            {this.renderUpcomingStreams()}
                            <hr className='my-4'/>
                            {this.renderPastStreams()}
                        </Col>
                    </Row>
                </Container>

                {this.renderChangeProfilePic()}
                {this.renderEditProfile()}
            </React.Fragment>
        );
    }

}