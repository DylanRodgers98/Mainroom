import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from "react-router-dom";
import {Button} from "reactstrap";
import io from "socket.io-client";
import '../css/user-stream.scss';
import {Row, Col} from "react-bootstrap";

export default class UserStream extends React.Component {

    constructor(props) {
        super(props);

        this.onMessageTextChange = this.onMessageTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageSubmit = this.onMessageSubmit.bind(this);

        this.state = {
            stream: false,
            videoJsOptions: null,
            viewerUsername: '',
            displayName: '',
            profilePicURL: '',
            streamTitle: '',
            streamGenre: '',
            streamCategory: '',
            msg: '',
            chat: [],
            chatHeight: '0px'
        }
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        try {
            const res = await axios.get(`/api/users/${this.props.match.params.username}/stream-info`);
            if (res.data) {
                await this.populateStreamDataIfUserIsLive(res.data);
            }
            this.setChatHeight();
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    async populateStreamDataIfUserIsLive(data) {
        const stream = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams/live/${data.streamKey}`);
        if (stream.data.isLive) {
            this.populateStreamData(data);
            await this.getViewerUsername();
            this.connectToChat();
        }
    }

    populateStreamData(data) {
        this.setState({
            stream: true,
            videoJsOptions: {
                autoplay: true,
                controls: true,
                sources: [{
                    src: `http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/live/${data.streamKey}/index.m3u8`,
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
                this.props.match.params.username,
                this.state.streamTitle,
                config.siteTitle
            ].filter(Boolean).join(' - ');
        });
    }

    async getViewerUsername() {
        const res = await axios.get('/logged-in-user');
        this.setState({
            viewerUsername: res.data.username
        });
    }

    connectToChat() {
        this.socket = io.connect(`http://${config.server.host}:${config.server.http.port}`);
        this.socket.on(`chatMessage_${this.props.match.params.username}`, ({viewerUsername, msg}) => {
            this.setState({
                chat: [...this.state.chat, {viewerUsername, msg}]
            });
        });
    }

    setChatHeight() {
        const messages = document.getElementById('messages');
        const livestream = document.getElementById('vjs_video_3');
        if (messages && livestream) {
            this.setState({
                chatHeight: livestream.clientHeight.toString() + 'px'
            });
        }
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose()
        }
        document.title = config.headTitle;
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
            const streamUsername = this.props.match.params.username;
            const viewerUsername = this.state.viewerUsername;
            const msg = this.state.msg;
            this.socket.emit("chatMessage", {streamUsername, viewerUsername, msg});
            this.setState({
                msg: ""
            });
        }
    }

    renderChat() {
        return this.state.chat.map(({viewerUsername, msg}, i) => (
            <div className='ml-1' key={i}>
                <span style={{color: "green"}}>{viewerUsername}: </span>
                <span>{msg}</span>
            </div>
        ));
    }

    componentDidUpdate() {
        const messages = document.getElementById('messages');
        if (messages) {
            const downArrowHeight = 25;
            const isScrolledToBottom = messages.scrollHeight - messages.clientHeight <= messages.scrollTop + downArrowHeight;
            if (isScrolledToBottom) {
                messages.scrollTop = messages.scrollHeight - messages.clientHeight;
            }
        }
    }

    renderChatInput() {
        return !this.state.viewerUsername ? (
            <div className='text-center mt-3'>
                To participate in the chat, please <a href={`/login?redirectTo=${window.location.pathname}`}>log in</a>
            </div>
        ) : (
            <div className='chat-input'>
                <textarea onChange={this.onMessageTextChange} onKeyDown={this.handleKeyDown} value={this.state.msg}/>
                <button onClick={this.onMessageSubmit}>Send</button>
            </div>
        );
    }

    render() {
        return this.state.stream ? (
            <Row className='stream-row'>
                <Col className='stream-col' xs='8' sm='8' md='8' lg='8' xl='8'>
                    <div data-vjs-player>
                        <video ref={node => this.videoNode = node} className="video-js vjs-big-play-centered"/>
                    </div>
                    <div>
                        <table className='ml-2 mt-2 mb-2'>
                            <tr>
                                <td>
                                    <Link to={`/user/${this.props.match.params.username}`}>
                                        <img src={this.state.profilePicURL} width='75' height='75'
                                             alt={`${this.props.match.params.username} profile picture`}/>
                                    </Link>
                                </td>
                                <td valign='middle'>
                                    <div className="ml-2">
                                        <h3>
                                            <Link to={`/user/${this.props.match.params.username}`}>
                                                {this.state.displayName || this.props.match.params.username}
                                            </Link>
                                            {this.state.streamTitle ? ` - ${this.state.streamTitle}` : ''}
                                        </h3>
                                        <h6>
                                            <Link to={`/genre/${this.state.streamGenre}`}>
                                                {this.state.streamGenre}
                                            </Link> <Link to={`/category/${this.state.streamCategory}`}>
                                            {this.state.streamCategory}
                                        </Link>
                                        </h6>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </Col>
                <Col className='chat-col' xs='4' sm='4' md='4' lg='4' xl='4'>
                    <div className='chat-messages' id='messages'
                         style={{height: this.state.chatHeight, maxHeight: this.state.chatHeight}}>
                        {this.renderChat()}
                    </div>
                    <div>
                        {this.renderChatInput()}
                    </div>
                </Col>
            </Row>
        ) : (
            <div className='mt-5 text-center'>
                <h3>{this.props.match.params.username} is not currently live</h3>
                <Button className='btn-dark mt-2' tag={Link} to={`/user/${this.props.match.params.username}`}>
                    Go To Profile
                </Button>
            </div>
        );
    }
}