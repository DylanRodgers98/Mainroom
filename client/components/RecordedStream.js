import React from 'react';
import videojs from 'video.js';
import axios from 'axios';
import config from '../../mainroom.config';
import {Link} from 'react-router-dom';
import {Container, Row, Col} from 'reactstrap';

const STARTING_PAGE = 1;

const STARTING_STATE = {
    loaded: false,
    videoJsOptions: null,
    username: '',
    displayName: '',
    profilePicURL: '',
    streamTitle: '',
    streamGenre: '',
    streamCategory: '',
    recordedStreams: [],
    nextPage: STARTING_PAGE
};

export default class RecordedStream extends React.Component {

    constructor(props) {
        super(props);

        this.state = STARTING_STATE;
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        try {
            const res = await axios.get(`/api/recorded-streams/${this.props.match.params.streamId}`);
            if (res.data.recordedStream) {
                this.populateStreamData(res.data.recordedStream);
            }
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    populateStreamData(recordedStream) {
        this.setState({
            loaded: true,
            videoJsOptions: {
                autoplay: true,
                controls: true,
                sources: [{
                    src: recordedStream.videoURL,
                    type: 'video/mp4'
                }],
                fluid: true
            },
            username: recordedStream.user.username,
            displayName: recordedStream.user.displayName,
            profilePicURL: recordedStream.user.profilePicURL,
            streamTitle: recordedStream.title,
            streamGenre: recordedStream.genre,
            streamCategory: recordedStream.category
        }, () => {
            this.player = videojs(this.videoNode, this.state.videoJsOptions);
            document.title = [
                (this.state.displayName || this.state.username),
                this.state.streamTitle,
                config.siteTitle
            ].filter(Boolean).join(' - ');
            this.getRecordedStreams();
        });
    }

    async getRecordedStreams() {
        const res = await axios.get(`/api/recorded-streams`, {
            params: {
                username: this.state.username,
                page: this.state.nextPage,
                limit: config.pagination.small
            }
        });
        this.setState({
            recordedStreams: res.data.recordedStreams,
            nextPage: res.data.nextPage
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.match.params.streamId !== this.props.match.params.streamId) {
            this.setState(STARTING_STATE, () => this.fillComponent());
        }
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose()
        }
        document.title = config.headTitle;
    }

    renderRecordedStreams() {
        const recordedStreams = this.state.recordedStreams.map((stream, index) => {
            const genreAndCategory = (
                <i>
                    <Link to={`/genre/${stream.genre}`}>
                        {stream.genre}
                    </Link> <Link to={`/category/${stream.category}`}>
                    {stream.category}
                </Link>
                </i>
            );
            return stream._id === this.props.match.params.streamId ? undefined : (
                <Row key={index} className='mt-2'>
                    <Col className='stream' xs='6'>
                        <Link to={`/stream/${stream._id}`}>
                            <div className='stream-thumbnail'>
                                <img src={stream.thumbnailURL} alt={`${stream.title} Stream Thumbnail`}/>
                            </div>
                        </Link>
                    </Col>
                    <Col xs='6' className='remove-padding-l'>
                        <div className='black-link'>
                            <Link to={`/stream/${stream._id}`}>
                                {stream.title}
                            </Link>
                        </div>
                        {stream.genre || stream.category ? genreAndCategory : undefined}
                    </Col>
                </Row>
            );
        });

        return (
            <React.Fragment>
                <Row className='mt-2'>
                    <Col>
                        <h5>More from {this.state.displayName || this.state.username}</h5>
                    </Col>
                </Row>
                {recordedStreams}
            </React.Fragment>
        );
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container fluid className='remove-padding-lr'>
                <Row className='remove-margin-r'>
                    <Col className='remove-padding-r' xs='9'>
                        <div data-vjs-player>
                            <video ref={node => this.videoNode = node} className='video-js vjs-big-play-centered'/>
                        </div>
                    </Col>
                    <Col xs='3' className='mb-2'>
                        {this.renderRecordedStreams()}
                    </Col>
                </Row>
                <Row className='remove-margin-r'>
                    <Col className='remove-padding-r stream-headings' xs='9'>
                        <table className='ml-2 mt-2 mb-2'>
                            <tbody>
                                <tr>
                                    <td>
                                        <Link to={`/user/${this.state.username}`}>
                                            <img className='rounded-circle' src={this.state.profilePicURL} width='75' height='75'
                                                 alt={`${this.state.username} profile picture`}/>
                                        </Link>
                                    </td>
                                    <td valign='middle'>
                                        <div className='ml-2'>
                                            <h3 className='text-nowrap'>
                                                <Link to={`/user/${this.state.username}`}>
                                                    {this.state.displayName || this.state.username}
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
                            </tbody>
                        </table>
                    </Col>
                </Row>
            </Container>
        );
    }
}