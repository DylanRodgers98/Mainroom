import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from "react-router-dom";
import {Row} from "reactstrap";
import io from "socket.io-client";
import '../css/user-stream.scss';

export default class UserStream extends React.Component {

    constructor(props) {
        super(props);

        this.onTextChange = this.onTextChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.onMessageSubmit = this.onMessageSubmit.bind(this);

        this.socket = io.connect(`http://localhost:${config.server.port}`);

        this.state = {
            stream: false,
            videoJsOptions: null,
            viewerUsername: '',
            streamUsername: '',
            streamTitle: '',
            streamGenre: '',
            streamTags: [],
            msg: '',
            chat: []
        }
    }

    componentDidMount() {
        axios.get('/streams', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            if (res) {
                this.populateStreamData(res);
                this.socket.on(`chatMessage_${this.state.streamUsername}`, ({viewerUsername, msg}) => {
                    this.setState({
                        chat: [...this.state.chat, {viewerUsername, msg}]
                    });
                });
            }
        });

        axios.get('/user/loggedIn').then(res => {
            this.setState({
                viewerUsername: res.data.username
            });
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
            streamUsername: res.data.username,
            streamTitle: res.data.title,
            streamGenre: res.data.genre,
            streamTags: res.data.tags
        }, () => {
            this.player = videojs(this.videoNode, this.state.videoJsOptions);
            document.title = [this.state.streamUsername, this.state.streamTitle, config.siteTitle].filter(Boolean).join(' - ');
        });
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose()
        }
        document.title = config.headTitle;
    }

    onTextChange(e) {
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
            const streamUsername = this.state.streamUsername;
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
        const streamTitle = this.state.streamTitle ? ` - ${this.state.streamTitle}` : '';

        return this.state.stream ? (
            <Row className="stream-row">
                <div className="col-lg-8 stream-col">
                    <div data-vjs-player>
                        <video ref={node => this.videoNode = node} className="video-js vjs-big-play-centered"/>
                    </div>
                    <div className="ml-2">
                        <h3>
                            <Link to={`/user/${this.state.streamUsername}`}>
                                {this.state.streamUsername}
                            </Link>
                            {streamTitle}
                        </h3>
                        <h5>
                            <Link to={`/genre/${this.state.streamGenre}`}>
                                {this.state.streamGenre}
                            </Link>
                        </h5>
                    </div>
                </div>
                <div className='col chat-col'>
                    <div className='chat-messages' id='messages'>{this.renderChat()}</div>
                    <div className='chat-input'>
                        <textarea onChange={this.onTextChange} onKeyDown={this.handleKeyDown} value={this.state.msg}/>
                        <button onClick={this.onMessageSubmit}>Send</button>
                    </div>
                </div>
            </Row>
        ) : (
            <h3 className="mt-5 not-live">
                Cannot find livestream for user {this.props.match.params.username}
            </h3>
        )
    }
}