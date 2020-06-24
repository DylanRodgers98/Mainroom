import React from "react";
import axios from 'axios';
import config from '../server/config/default';
import './css/livestreams.scss';
import {Link} from "react-router-dom";

export default class LiveStreams extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            live_streams: []
        }
    }

    getLiveStreams() {
        axios.get('http://127.0.0.1:' + config.rtmp_server.http.port + '/api/streams').then(res => {
            const streams = res.data['live'];
            if (typeof streams !== 'undefined') {
                const streamKeys = this.extractStreamKeys(streams);
                this.getStreamsInfo(streamKeys);
            }
        });
    }

    extractStreamKeys(liveStreams) {
        const streamKeys = [];
        for (const stream in liveStreams) {
            if (liveStreams.hasOwnProperty(stream)) {
                streamKeys.push(stream);
            }
        }
        return streamKeys;
    }

    getStreamsInfo(streamKeys) {
        axios.get('/streams/search', {
            params: {
                stream_keys: streamKeys,
                query: this.props.match.params.query
            }
        }).then(res => {
            this.setState({
                live_streams: res.data
            });
        });
    }

    render() {
        this.getLiveStreams();
        const streams = this.state.live_streams.map((stream, index) => {
            return (
                <div className="stream col-xs-12 col-sm-12 col-md-3 col-lg-4" key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${stream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${stream.stream_key}.png`}
                                 alt={`${stream.username} Stream Thumbnail`}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={`/user/${stream.username}/live`}>
                            {stream.username}
                        </Link>
                    </span>
                </div>
            );
        });

        return (
            <div className="container mt-5">
                <h4>"{this.props.match.params.query}"</h4>
                <hr className="my-4"/>

                <div className="streams row">
                    {streams}
                </div>
            </div>
        )
    }

}