import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from 'react-router-dom';
import {Button, Container, Row, Col} from 'reactstrap';
import io from 'socket.io-client';
import {ReactHeight} from 'react-height/lib/ReactHeight';

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
            chatHeight: 0
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
                (this.state.displayName || this.props.match.params.username),
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
            this.socket.emit('chatMessage', {streamUsername, viewerUsername, msg});
            this.setState({
                msg: ''
            });
        }
    }

    renderChat() {
        return this.state.chat.map(({viewerUsername, msg}, index) => (
            <div className='ml-1' key={index}>
                <span style={{color: 'green'}}>{viewerUsername}: </span>
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

    setChatHeight(height) {
        if (height !== this.state.chatHeight) {
            this.setState({
                chatHeight: height
            });
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
            <Container fluid className='remove-padding-lr'>
                <Row className='remove-margin-r'>
                    <Col className='remove-padding-r' xs='9'>
                        <div data-vjs-player>
                            <video ref={node => this.videoNode = node} className='video-js vjs-big-play-centered'/>
                        </div>
                    </Col>
                    <Col className='remove-padding-lr' xs='3'>
                        <ReactHeight className='full-height' onHeightReady={height => this.setChatHeight(height)}>
                            <div id='messages' className='chat-messages' style={{height: this.state.chatHeight + 'px'}}>
                                {this.renderChat()}
                            </div>
                        </ReactHeight>
                    </Col>
                </Row>
                <Row className='remove-margin-r'>
                    <Col className='remove-padding-r stream-headings' xs='9'>
                        <table className='ml-2 mt-2 mb-2'>
                            <tr>
                                <td>
                                    <Link to={`/user/${this.props.match.params.username}`}>
                                        <img className='rounded-circle' src={this.state.profilePicURL} width='75' height='75'
                                             alt={`${this.props.match.params.username} profile picture`}/>
                                    </Link>
                                </td>
                                <td valign='middle'>
                                    <div className='ml-2'>
                                        <h3 className='text-nowrap'>
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
                    </Col>
                    <Col className='remove-padding-lr' xs='3'>
                        {this.renderChatInput()}
                    </Col>
                </Row>
            </Container>
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