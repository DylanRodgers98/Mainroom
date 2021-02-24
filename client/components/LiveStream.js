import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import {siteName, loadLivestreamTimeout, headTitle} from '../../mainroom.config';
import {Link} from 'react-router-dom';
import {Button, Col, Container, Row} from 'reactstrap';
import io from 'socket.io-client';
import {ReactHeight} from 'react-height/lib/ReactHeight';
import {displayGenreAndCategory} from '../utils/displayUtils';

const SCROLL_MARGIN_HEIGHT = 30;

export default class LiveStream extends React.Component {

    constructor(props) {
        super(props);

        this.onMessageTextChange = this.onMessageTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageSubmit = this.onMessageSubmit.bind(this);
        this.addMessageToChat = this.addMessageToChat.bind(this);
        this.startStreamFromSocket = this.startStreamFromSocket.bind(this);
        this.endStreamFromSocket = this.endStreamFromSocket.bind(this);
        this.updateStreamInfoFromSocket = this.updateStreamInfoFromSocket.bind(this);

        this.state = {
            stream: false,
            videoJsOptions: null,
            viewerUser: null,
            displayName: '',
            profilePicURL: '',
            streamKey: '',
            streamTitle: '',
            streamGenre: '',
            streamCategory: '',
            socketIOURL: '',
            msg: '',
            chat: [],
            chatHeight: 0,
            chatInputHeight: 0,
            viewCount: 0
        }
    }

    componentDidMount() {
        document.title = headTitle;
        Promise.all([
            this.getStreamInfo(),
            this.getViewerUser()
        ]);
    }

    async getStreamInfo() {
        try {
            const res = await axios.get(`/api/users/${this.props.match.params.username.toLowerCase()}/stream-info`);
            this.setState({
                socketIOURL: res.data.socketIOURL
            }, () => {
                const promises = [];
                if (!this.socket) {
                    promises.push(this.connectToSocketIO());
                }
                if (res.data.isLive) {
                    promises.push(this.populateStreamData(res.data));
                }
                Promise.all(promises);
            });
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    async populateStreamData(data) {
        this.setState({
            stream: true,
            videoJsOptions: {
                autoplay: true,
                controls: true,
                sources: [{
                    src: data.liveStreamURL,
                    type: 'application/x-mpegURL'
                }],
                fluid: true
            },
            displayName: data.displayName,
            profilePicURL: data.profilePicURL,
            streamTitle: data.title,
            streamGenre: data.genre,
            streamCategory: data.category
        }, () => {
            this.player = videojs(this.videoNode, this.state.videoJsOptions);
            document.title = [
                (this.state.displayName || this.props.match.params.username.toLowerCase()),
                this.state.streamTitle,
                siteName
            ].filter(Boolean).join(' - ');
        });
    }

    async getViewerUser() {
        const res = await axios.get('/api/logged-in-user');
        this.setState({
            viewerUser: res.data
        });
    }

    async connectToSocketIO() {
        const streamUsername = this.props.match.params.username.toLowerCase();
        this.socket = io(this.state.socketIOURL, {transports: [ 'websocket' ]});
        this.socket.emit(`connection_${streamUsername}`);
        this.socket.on(`chatMessage_${streamUsername}`, this.addMessageToChat);
        this.socket.on(`liveStreamViewCount_${streamUsername}`, viewCount => this.setState({viewCount}));
        this.socket.on(`streamStarted_${streamUsername}`, this.startStreamFromSocket);
        this.socket.on(`streamEnded_${streamUsername}`, this.endStreamFromSocket);
        this.socket.on(`streamInfoUpdated_${streamUsername}`, this.updateStreamInfoFromSocket);
    }

    addMessageToChat({viewerUser, msg}) {
        const displayName = viewerUser.username === this.state.viewerUser.username
            ? <b>You:</b>
            : (viewerUser.displayName || viewerUser.username) + ':';

        const chatMessage = (
            <div className='ml-1' key={this.state.chat.length}>
                <span className='black-link' title={`Go to ${viewerUser.displayName || viewerUser.username}'s profile`}>
                    <Link to={`/user/${viewerUser.username}`}>
                        <img src={viewerUser.profilePicURL} width='25' height='25'
                             alt={`${viewerUser.username} profile picture`} className='rounded-circle'/>
                        <span className='ml-1' style={{color: viewerUser.chatColour}}>{displayName}</span>
                    </Link>
                </span>
                &nbsp;
                <span>{msg}</span>
            </div>
        );
        this.setState({
            chat: [...this.state.chat, chatMessage]
        });
    }

    startStreamFromSocket() {
        // When a user goes live, their view count is reset to 0 by the server, so this needs to be updated with the
        // current number of people viewing this page. This is done by emitting the connection_${streamUsername}
        // event for each user on this page, which increments the view count for streamUsername.
        const streamUsername = this.props.match.params.username.toLowerCase();
        this.socket.emit(`connection_${streamUsername}`);

        // Stream is not available as soon as user goes live because .m3u8 playlist file needs to populate,
        // so wait a timeout (which needs to be longer than the time of each video segment) before loading.
        setTimeout(() => {
            if (this.state.stream === false) {
                this.getStreamInfo();
            }
        }, loadLivestreamTimeout);
    }

    endStreamFromSocket() {
        if (this.state.stream === true) {
            if (this.player) {
                this.player.dispose();
                this.player = null;
            }
            this.setState({
                stream: false,
                videoJsOptions: null,
                chat: []
            });
        }
    }

    updateStreamInfoFromSocket(streamInfo) {
        this.setState({
            streamTitle: streamInfo.title,
            streamGenre: streamInfo.genre,
            streamCategory: streamInfo.category
        });
    }

    componentWillUnmount() {
        this.socket.disconnect();
        this.socket = null;

        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
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
            const viewerUser = this.state.viewerUser;
            const msg = this.state.msg;
            this.socket.emit('chatMessage', {viewerUser, msg});
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

    setChatInputHeight(height) {
        if (height !== this.state.chatInputHeight) {
            this.setState({
                chatInputHeight: height
            });
        }
    }

    renderChatInput() {
        return !(this.state.viewerUser && this.state.viewerUser.username) ? (
            <div className='text-center mt-3'>
                To participate in the chat, please <a href={`/login?redirectTo=${window.location.pathname}`}>log in</a>
            </div>
        ) : (
            <div className='chat-input' style={{height: this.state.chatInputHeight + 'px'}}>
                <textarea onChange={this.onMessageTextChange} onKeyDown={this.handleKeyDown} value={this.state.msg}/>
                <button onClick={this.onMessageSubmit}>Send</button>
            </div>
        );
    }

    render() {
        return this.state.stream ? (
            <Container fluid className='remove-padding-lr'>
                <Row className='remove-margin-r no-gutters'>
                    <Col xs='12' md='9'>
                        <ReactHeight onHeightReady={height => this.setChatHeight(height)}>
                            <div data-vjs-player>
                                <video ref={node => this.videoNode = node} className='video-js vjs-big-play-centered'/>
                            </div>
                        </ReactHeight>
                        <ReactHeight onHeightReady={height => this.setChatInputHeight(height)}>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>
                                            <Link to={`/user/${this.props.match.params.username.toLowerCase()}`}>
                                                <img className='rounded-circle m-2' src={this.state.profilePicURL}
                                                     width='75' height='75'
                                                     alt={`${this.props.match.params.username.toLowerCase()} profile picture`}/>
                                            </Link>
                                        </td>
                                        <td valign='middle'>
                                            <h3>
                                                <Link to={`/user/${this.props.match.params.username.toLowerCase()}`}>
                                                    {this.state.displayName || this.props.match.params.username.toLowerCase()}
                                                </Link>
                                                {this.state.streamTitle ? ` - ${this.state.streamTitle}` : ''}
                                            </h3>
                                            <h6>
                                                {displayGenreAndCategory({
                                                    genre: this.state.streamGenre,
                                                    category: this.state.streamCategory
                                                })}
                                            </h6>
                                            <h6>
                                                {this.state.viewCount} viewer{this.state.viewCount === 1 ? '' : 's'}
                                            </h6>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </ReactHeight>
                    </Col>
                    <Col xs='12' md='3'>
                        <div id='messages' className='chat-messages' style={{height: this.state.chatHeight + 'px'}}>
                            {this.state.chat}
                        </div>
                        {this.renderChatInput()}
                    </Col>
                </Row>
            </Container>
        ) : (
            <div className='mt-5 text-center'>
                <h3>{this.props.match.params.username.toLowerCase()} is not currently live</h3>
                <Button className='btn-dark mt-2' tag={Link} to={`/user/${this.props.match.params.username.toLowerCase()}`}>
                    Go To Profile
                </Button>
            </div>
        );
    }
}