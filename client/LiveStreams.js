import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../server/config/default';
import './css/livestreams.scss';

export default class LiveStreams extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            live_streams: []
        }
    }

    componentDidMount() {
        this.getLiveStreams();
    }

    getLiveStreams() {
        axios.get('http://127.0.0.1:' + config.rtmp_server.http.port + '/api/streams').then(res => {
            const streams = res.data;
            if (typeof streams['live'] !== 'undefined') {
                this.getStreamsInfo(streams['live']);
            }
        });
    }

    getStreamsInfo(live_streams) {
        const queryParams = {
            params: {
                streams: live_streams
            }
        };
        if (this.props.match.params.genre) {
            queryParams.params.genre = this.props.match.params.genre;
        }

        axios.get('/streams/info', queryParams).then(res => {
            this.setState({
                live_streams: res.data
            });
        });
    }

    render() {
        const streams = this.state.live_streams.map((stream, index) => {
            return (
                <div className="stream col-xs-12 col-sm-12 col-md-3 col-lg-4" key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={'/user/' + stream.username}>
                        <div className="stream-thumbnail">
                            <img src={'/thumbnails/' + stream.stream_key + '.png'}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={'/user/' + stream.username}>
                            {stream.username}
                        </Link>
                    </span>
                </div>
            );
        });

        const genre = this.props.match.params.genre ? decodeURIComponent(this.props.match.params.genre) : 'All';

        return (
            <div className="container mt-5">
                <h4>{genre} Livestreams</h4>
                <hr className="my-4"/>

                <div className="streams row">
                    {streams}
                </div>
            </div>
        )
    }
}