import React from "react";
import axios from "axios";
import {Container, Row, Col, Button} from "reactstrap";
import {Modal} from "react-bootstrap";
import {Link} from "react-router-dom";
import Timeline from "react-calendar-timeline";
import moment from "moment";
import config from "../../mainroom.config";
import normalizeUrl from "normalize-url";
import ImageUploader from 'react-images-upload';
import '../css/user-profile.scss';
import '../css/livestreams.scss';

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
    scheduleItems: [],
    streamKey: '',
    streamTitle: '',
    streamGenre: '',
    streamCategory: '',
    streamThumbnailUrl: '',
    upcomingStreamsStartTime: moment().startOf('day'),
    upcomingStreamsEndTime: moment().startOf('day').add(3, 'day'),
    editProfileOpen: false,
    unsavedChanges: false,
    editDisplayName: '',
    editLocation: '',
    editBio: '',
    editLinks: [],
    indexesOfInvalidLinks: [],
    showChangeProfilePicButton: false,
    changeProfilePicOpen: false,
    uploadedProfilePic: undefined
};

const SCHEDULE_GROUP = 0;

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
            const res = await axios.get(`/api/users/${this.props.match.params.username}`, {
                params: {
                    scheduleStartTime: this.state.upcomingStreamsStartTime.toDate(),
                    scheduleEndTime: this.state.upcomingStreamsEndTime.toDate(),
                }
            });
            if (res.data.username) {
                await this.fillComponent(res.data);
            }
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

    async fillComponent(user) {
        this.populateProfile(user)
        this.buildSchedule(user.scheduledStreams);
        await this.getLiveStreamIfLive();
        await this.getLoggedInUser();
        await this.isLoggedInUserSubscribed();
    }

    populateProfile(user) {
        this.setState({
            profilePicURL: user.profilePicURL,
            displayName: user.displayName,
            location: user.location,
            bio: user.bio,
            links: user.links,
            numOfSubscribers: user.numOfSubscribers
        });
    }

    buildSchedule(scheduledStreams) {
        scheduledStreams.forEach(scheduledStream => {
            this.setState({
                scheduleItems: [...this.state.scheduleItems, {
                    id: this.state.scheduleItems.length,
                    group: SCHEDULE_GROUP,
                    title: scheduledStream.title || this.props.match.params.username,
                    start_time: moment(scheduledStream.startTime),
                    end_time: moment(scheduledStream.endTime)
                }]
            });
        });
    }

    async getLoggedInUser() {
        const res = await axios.get('/auth/logged-in')
        this.setState({
            loggedInUser: res.data.username,
            loggedInUserId: res.data._id
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
        const res = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams/live/${streamKey}`);
        if (res.data.isLive) {
            const thumbnail = await axios.get(`/api/livestreams/${streamKey}/thumbnail`);
            this.setState({
                streamKey: streamKey,
                streamTitle: stream.data.title,
                streamGenre: stream.data.genre,
                streamCategory: stream.data.category,
                streamThumbnailUrl: thumbnail.data.thumbnailURL
            });
        }
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
        return this.state.links.map(link => (
            <div>
                <a href={link.url} target='_blank' rel="noopener noreferrer">{link.title || link.url}</a>
            </div>
        ));
    }

    renderLiveStream() {
        return this.state.streamKey ? (
            <Row className='streams' xs='2'>
                <Col className='stream mb-4'>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${this.props.match.params.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={this.state.streamThumbnailUrl}
                                 alt={`${this.props.match.params.username} Stream Thumbnail`}/>
                        </div>
                    </Link>
                    <span className="username">
                        <Link to={`/user/${this.props.match.params.username}/live`}>
                            {this.state.displayName || this.props.match.params.username}
                        </Link>
                    </span>
                </Col>
                <Col>
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
        ) : <i><h3 className='text-center mt-5'>This user is not currently live</h3></i>;
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
            indexesOfInvalidLinks: this.state.editLinks.map((link, i) => {
                if (!link.url) {
                    isValid = false;
                    return i;
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

        const links = this.state.editLinks.map((link, i) => (
            <tr>
                <td>
                    <input className="mt-1 rounded-border" type="text" value={link.title}
                           onChange={e => this.setLinkTitle(e, i)}/>
                </td>
                <td>
                    <input className="mt-1 rounded-border" type="text" value={link.url}
                           onChange={e => this.setLinkUrl(e, i)} size={30}/>
                </td>
                <td>
                    <Button className="btn-dark mt-1 ml-1" size="sm" onClick={() => this.removeLink(i)}>
                        Remove Link
                    </Button>
                </td>
                <td>
                    <div className='ml-1'>
                        {this.state.indexesOfInvalidLinks.includes(i) ? 'Link must have a URL' : ''}
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
            <Modal show={this.state.editProfileOpen} onHide={this.editProfileToggle} size='lg' centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <table>
                        <tr>
                            <td>
                                <h5 className="mr-3">Display Name:</h5>
                            </td>
                            <td>
                                <input className='rounded-border' type="text" value={this.state.editDisplayName}
                                       onChange={this.setDisplayName}/>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-1 mr-3">Location:</h5>
                            </td>
                            <td>
                                <input className="mt-1 rounded-border" type="text" value={this.state.editLocation}
                                       onChange={this.setLocation}/>
                            </td>
                        </tr>
                        <tr>
                            <td valign='top'>
                                <h5 className="mt-1">Bio:</h5>
                            </td>
                            <td>
                                <textarea className="mt-1 rounded-border" value={this.state.editBio}
                                          onChange={this.setBio}/>
                            </td>
                        </tr>
                    </table>
                    <h5 className="mt-1">Links:</h5>
                    <hr/>
                    <table>
                        {this.renderEditLinks()}
                        <tr>
                            <td>
                                <Button className="btn-dark mt-2" size="sm" onClick={this.addLink}>
                                    Add Link
                                </Button>
                            </td>
                        </tr>
                    </table>
                </Modal.Body>
                <Modal.Footer>
                    <Button className="btn-dark" disabled={!this.state.unsavedChanges} onClick={this.saveProfile}>
                        Save Changes
                    </Button>
                </Modal.Footer>
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

    onProfilePicUpload(pictureFiles, pictureDataURLs) {
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
            this.reloadProfile();
        }
    }

    renderChangeProfilePic() {
        return (
            <Modal show={this.state.changeProfilePicOpen} onHide={this.changeProfilePicToggle} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Change Profile Picture</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ImageUploader buttonText='Choose Image' label='Maximum file size: 2MB'
                                   maxFileSize={2 * 1024 * 1024} onChange={this.onProfilePicUpload}
                                   withPreview={true} singleImage={true} withIcon={false}/>
                </Modal.Body>
                <Modal.Footer>
                    <Button className="btn-dark" disabled={!this.state.uploadedProfilePic}
                            onClick={this.saveNewProfilePic}>
                        Upload
                    </Button>
                </Modal.Footer>
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
                <Container>
                    <Row className="mt-5" xs='4'>
                        <Col>
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
                        </Col>
                        <Col xs='9'>
                            <h3>Upcoming Streams</h3>
                            <Timeline groups={[{id: SCHEDULE_GROUP}]} items={this.state.scheduleItems}
                                      sidebarWidth='0'
                                      visibleTimeStart={this.state.upcomingStreamsStartTime.valueOf()}
                                      visibleTimeEnd={this.state.upcomingStreamsEndTime.valueOf()}/>
                            <hr className="my-4"/>
                            {this.renderLiveStream()}
                        </Col>
                    </Row>
                </Container>

                {this.renderChangeProfilePic()}
                {this.renderEditProfile()}
            </React.Fragment>
        );
    }

}