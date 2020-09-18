import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from "react-router-dom";
import {Row, Button} from "reactstrap";
import io from "socket.io-client";
import FourOhFour from "./FourOhFour";
import '../css/user-stream.scss';

export default class UserStream extends React.Component {

    constructor(props) {
        super(props);

        this.onMessageTextChange = this.onMessageTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageSubmit = this.onMessageSubmit.bind(this);

        this.state = {
            doesUserExist: false,
            stream: false,
            videoJsOptions: null,
            viewerUsername: '',
            streamTitle: '',
            streamGenre: '',
            streamCategory: '',
            msg: '',
            chat: []
        }
    }

    componentDidMount() {
        axios.get('/users/stream-info', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            this.setState({
                doesUserExist: !!res
            });
            if (res) {
                this.populateStreamDataIfUserIsLive(res);
            }
        });
    }

    populateStreamDataIfUserIsLive(res) {
        axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams/live/${res.data.streamKey}`).then(stream => {
            if (stream.data.isLive) {
                this.populateStreamData(res);
                this.getViewerUsername();
                this.connectToChat();
            }
        });
    }

    populateStreamData(res) {
        this.setState({
            stream: true,
            videoJsOptions: {
                autoplay: true,
                controls: true,
                sources: [{
                    src: `http://127.0.0.1:${config.rtmpServer.http.port}/live/${res.data.streamKey}/index.m3u8`,
                    type: 'application/x-mpegURL'
                }],
                fluid: true
            },
            streamTitle: res.data.title,
            streamGenre: res.data.genre,
            streamCategory: res.data.category
        }, () => {
            this.player = videojs(this.videoNode, this.state.videoJsOptions);
            document.title = [
                this.props.match.params.username,
                this.state.streamTitle,
                config.siteTitle
            ].filter(Boolean).join(' - ');
        });
    }

    getViewerUsername() {
        axios.get('/users/logged-in').then(res => {
            this.setState({
                viewerUsername: res.data.username
            });
        });
    }

    connectToChat() {
        this.socket = io.connect(`http://127.0.0.1:${config.server.port.http}`);
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

    render() {
        return this.state.stream ? (
            <Row className="stream-row">
                <div className="col-lg-8 stream-col">
                    <div data-vjs-player>
                        <video ref={node => this.videoNode = node} className="video-js vjs-big-play-centered"/>
                    </div>
                    <div className="ml-2">
                        <h3>
                            <Link to={`/user/${this.props.match.params.username}`}>
                                {this.props.match.params.username}
                            </Link>
                            {this.state.streamTitle ? ` - ${this.state.streamTitle}` : ''}
                        </h3>
                        <h5>
                            <Link to={`/genre/${this.state.streamGenre}`}>
                                {this.state.streamGenre}
                            </Link> <Link to={`/category/${this.state.streamCategory}`}>
                                {this.state.streamCategory}
                            </Link>
                        </h5>
                    </div>
                </div>
                <div className='col chat-col'>
                    <div className='chat-messages' id='messages'>{this.renderChat()}</div>
                    <div className='chat-input'>
                        <textarea onChange={this.onMessageTextChange} onKeyDown={this.handleKeyDown}
                                  value={this.state.msg}/>
                        <button onClick={this.onMessageSubmit}>Send</button>
                    </div>
                </div>
            </Row>
        ) : (
            !this.state.doesUserExist ? <FourOhFour/> : (
                <div className='mt-5 not-live'>
                    <h3>Cannot find livestream for user {this.props.match.params.username}</h3>
                    <Button className='btn-dark' tag={Link} to={`/user/${this.props.match.params.username}`}>
                        Go To Profile
                    </Button>
                </div>
            )
        )
    }
}