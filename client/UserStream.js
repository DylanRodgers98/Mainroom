import React from 'react';
import videojs from 'video.js'
import axios from 'axios';
import config from '../server/config/default';
import {Link} from "react-router-dom";
import {Row} from "reactstrap";
import io from "socket.io-client";
import './css/userstream.scss';

const LOGGER = require('node-media-server/node_core_logger');

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
            stream_username: '',
            stream_title: '',
            stream_genre: '',
            stream_tags: [],
            msg: '',
            chat: [],
            viewer_username: ''
        }
    }

    componentDidMount() {
        axios.get('/user', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            this.setState({
                stream: true,
                videoJsOptions: {
                    autoplay: true,
                    controls: true,
                    sources: [{
                        src: `http://127.0.0.1:${config.rtmp_server.http.port}/live/${res.data.stream_key}/index.m3u8`,
                        type: 'application/x-mpegURL'
                    }],
                    fluid: true,
                },
                stream_username: res.data.username,
                stream_title: res.data.stream_title,
                stream_genre: res.data.stream_genre,
                stream_tags: res.data.stream_tags
            }, () => {
                this.player = videojs(this.videoNode, this.state.videoJsOptions, function onPlayerReady() {
                    LOGGER.log('onPlayerReady', this)
                });
            });

            document.title = [this.state.stream_username, this.state.stream_title, config.siteTitle].filter(Boolean).join(' - ');

            this.socket.on(`chat message ${this.state.stream_username}`, ({viewerUsername, msg}) => {
                this.setState({
                    chat: [...this.state.chat, {viewerUsername, msg}]
                });
            });
        });

        axios.get('/user/loggedin').then(res => {
            this.setState({
                viewer_username: res.data.username
            });
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
        if (e.key === 'Enter' && this.state.msg) {
            this.onMessageSubmit();
        }
    }

    onMessageSubmit() {
        const streamUsername = this.state.stream_username;
        const viewerUsername = this.state.viewer_username;
        const msg = this.state.msg;
        this.socket.emit("chat message", {streamUsername, viewerUsername, msg});
        this.setState({
            msg: ""
        });
    };

    renderChat() {
        return this.state.chat.map(({viewerUsername, msg}, idx) => (
            <div key={idx}>
                <span style={{color: "green"}}>{viewerUsername}: </span>
                <span>{msg}</span>
            </div>
        ));
    }

    render() {
        const streamTitle = this.state.stream_title ? ` - ${this.state.stream_title}` : '';

        return this.state.stream ? (
            <Row className="stream-row">
                <div className="col-lg-8 stream-col">
                    <div data-vjs-player>
                        <video ref={node => this.videoNode = node} className="video-js vjs-big-play-centered"/>
                    </div>
                    <div className="ml-2">
                        <h3>
                            <Link to={`/user/${this.state.stream_username}`}>
                                {this.state.stream_username}
                            </Link>
                            {streamTitle}
                        </h3>
                        <h5>
                            <Link to={`/genre/${this.state.stream_genre}`}>
                                {this.state.stream_genre}
                            </Link>
                        </h5>
                    </div>
                </div>
                <div className='col chat-col'>
                    <div className='chat-messages'>{this.renderChat()}</div>
                    <div className='chat-input'>
                        <input onChange={this.onTextChange} onKeyDown={this.handleKeyDown} value={this.state.msg}/>
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