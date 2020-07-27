import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../mainroom.config';
import {Container, Row, Col} from "reactstrap";
import './css/livestreams.scss';

export default class LiveStreams extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            liveStreams: []
        }
    }

    componentDidMount() {
        this.getLiveStreams();
    }

    getLiveStreams() {
        axios.get(`http://127.0.0.1:${config.rtmpServer.http.port}/api/streams`).then(res => {
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
        axios.get('/streams/all', {
            params: {
                streamKeys: streamKeys
            }
        }).then(res => {
            this.setState({
                liveStreams: res.data
            });
        });
    }

    render() {
        const streams = this.state.liveStreams.map((stream, index) => {
            return (
                <div className="stream col-xs-12 col-sm-12 col-md-3 col-lg-4" key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${stream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${stream.streamKey}.png`}
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
            <Container className="mt-5">
                <Row>
                    <Col>
                        <h4>All Livestreams</h4>
                    </Col>
                </Row>
                <hr className="my-4"/>
                <Row className="streams">
                    {streams}
                </Row>
            </Container>
        )
    }
}