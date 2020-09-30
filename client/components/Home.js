import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col} from "reactstrap";
import '../css/livestreams.scss';

export default class Home extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            liveStreams: [],
            subscriptionLiveStreams: [],
            loggedInUser: ''
        }
    }

    componentDidMount() {
        this.getLiveStreams();
    }

    async getLiveStreams() {
        const res = await axios.get(`http://${config.rtmpServer.host}:${config.rtmpServer.http.port}/api/streams`);
        if (res.data.live) {
            const streamKeys = this.extractStreamKeys(res.data.live);
            await this.getStreamsInfo(streamKeys);
            await this.getSubscriptionsIfLoggedIn(streamKeys);
        }
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

    async getStreamsInfo(streamKeys) {
        const res = await axios.get('/api/streams', {
            params: {
                streamKeys: streamKeys
            }
        });
        this.setState({
            liveStreams: res.data
        });
    }

    async getSubscriptionsIfLoggedIn(streamKeys) {
        const loggedInRes = await axios.get('/api/users/logged-in');
        if (loggedInRes.data.username) {
            const subsRes = await axios.get(`/api/users/${loggedInRes.data.username}/subscriptions`);
            if (subsRes.data.subscriptions) {
                const subscriptionUsernames = subsRes.data.subscriptions.map(sub => sub.username);
                const streamsRes = await axios.get(`/api/streams/`, {
                    params: {
                        streamKeys: streamKeys,
                        usernames: subscriptionUsernames
                    }
                });
                this.setState({
                    subscriptionLiveStreams: streamsRes.data
                });
            }
        }
    }

    renderSubscriptions() {
        return !this.state.subscriptionLiveStreams.length ? undefined : (
            <React.Fragment>
                {this.renderLiveStreams('Subscriptions', this.state.subscriptionLiveStreams)}
                <hr className="my-4"/>
            </React.Fragment>
        );
    }

    renderLiveStreams(title, liveStreams) {
        const streamBoxes = liveStreams.map((liveStream, index) => {
            return (
                <Col className='stream' key={index}>
                    <span className="live-label">LIVE</span>
                    <Link to={`/user/${liveStream.username}/live`}>
                        <div className="stream-thumbnail">
                            <img src={`/thumbnails/${liveStream.streamKey}.png`}
                                 alt={`${liveStream.username} Stream Thumbnail`}/>
                        </div>
                    </Link>

                    <span className="username">
                        <Link to={`/user/${liveStream.username}/live`}>
                            {liveStream.displayName || liveStream.username}
                        </Link>
                    </span>
                </Col>
            );
        });

        return !streamBoxes.length ? undefined : (
            <React.Fragment>
                <Row>
                    <Col>
                        <h4>{title}</h4>
                    </Col>
                </Row>
                <Row className="streams mt-3" xs='1' sm='1' md='2' lg='3' xl='3'>
                    {streamBoxes}
                </Row>
            </React.Fragment>
        );
    }

    renderStreamBoxes() {
        const subscriptions = this.renderSubscriptions();
        const liveStreams = this.renderLiveStreams('Featured', this.state.liveStreams);

        return subscriptions || liveStreams ? (
            <React.Fragment>
                {subscriptions}
                {liveStreams}
            </React.Fragment>
        ) : (
            <p className='my-4 text-center'>
                No one is live right now :(
            </p>
        );
    }

    render() {
        return (
            <Container className="mt-5">
                {this.renderStreamBoxes()}
            </Container>
        )
    }
}