import React from 'react';
import {pagination, siteName} from '../../mainroom.config';
import axios from 'axios';
import {displayErrorMessage, displayGenreAndCategory, getAlert, LoadingSpinner} from '../utils/displayUtils';
import {Button, Col, Container, Row, Spinner} from 'reactstrap';
import {Link} from 'react-router-dom';
import {timeSince} from '../utils/dateUtils';
import ViewersIcon from '../icons/eye.svg';
import {shortenNumber} from '../utils/numberUtils';

const STARTING_PAGE = 1;

export default class Event extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            eventName: '',
            createdBy: '',
            startTime: 0,
            endTime: 0,
            bannerPicURL: '',
            stages: [],
            recordedStreams: [],
            recordedStreamsNextPage: STARTING_PAGE,
            showLoadMoreButton: false,
            showLoadMoreSpinner: false,
            alertText: '',
            alertColor: ''
        }
    }

    componentDidMount() {
        this.fillComponent();
    }

    async fillComponent() {
        try {
            await Promise.all([
                this.getEventData(),
                this.getRecordedStreams()
            ]);
            this.setState({
                loaded: true
            });
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    async getEventData() {
        const res = await axios.get(`/api/events/${this.props.match.params.eventId}`);
        document.title = `${res.data.eventName} - ${siteName}`;
        this.setState({
            eventName: res.data.eventName,
            createdBy: res.data.createdBy,
            startTime: res.data.startTime,
            endTime: res.data.endTime,
            bannerPicURL: res.data.bannerPicURL,
            stages: res.data.stages
        });
    }

    async getRecordedStreams() {
        this.setState({showLoadMoreSpinner: true}, async () => {
            try {
                const res = await axios.get(`/api/events/${this.props.match.params.eventId}/recorded-streams`, {
                    params: {
                        page: this.state.nextPage,
                        limit: pagination.small
                    }
                });
                this.setState({
                    recordedStreams: [...this.state.recordedStreams, ...(res.data.recordedStreams || [])],
                    nextPage: res.data.nextPage,
                    showLoadMoreButton: !!res.data.nextPage,
                    showLoadMoreSpinner: false
                });
            } catch (err) {
                this.setState({showLoadMoreSpinner: false});
                displayErrorMessage(this, `An error occurred when loading past streams. Please try again later. (${err})`);
            }
        });
    }

    renderStages() {
        const stages = this.state.stages.map((stage, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                {!stage.isLive ? undefined : <span className='live-label'>LIVE</span>}
                {!stage.isLive ? undefined : (
                    <span className='view-count'>
                        <img src={ViewersIcon} width={18} height={18} className='mr-1 my-1' alt='Viewers icon'/>
                        {shortenNumber(stage.streamInfo.viewCount)}
                    </span>
                )}
                <Link to={stage.isLive ? `/stage/${stage._id}` : ''}>
                    <img className='w-100' src={stage.thumbnailURL} alt={`${stage.stageName} Stage Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                    <tr>
                        <td className='w-100'>
                            <h5>
                                <Link to={stage.isLive ? `/stage/${stage._id}` : ''}>
                                    {stage.stageName}
                                </Link>
                                {!stage.isLive ? undefined : (
                                    <span className='black-link'>
                                        <Link to={stage.isLive ? `/stage/${stage._id}` : ''}>
                                            {stage.streamInfo.title ? ` - ${stage.streamInfo.title}` : ''}
                                        </Link>
                                    </span>
                                )}
                            </h5>
                            {!stage.isLive ? undefined : (
                                <h6>
                                    {displayGenreAndCategory({
                                        genre: stage.streamInfo.genre,
                                        category: stage.streamInfo.category
                                    })}
                                </h6>
                            )}
                        </td>
                    </tr>
                    </tbody>
                </table>
            </Col>
        ));

        return (
            <React.Fragment>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {stages}
                </Row>
            </React.Fragment>
        );
    }

    renderPastStreams() {
        if (!this.state.recordedStreams || !this.state.recordedStreams.length) {
            return undefined;
        }

        const pastStreams = this.state.recordedStreams.map((stream, index) => (
            <Row key={index} className='margin-bottom-thick'>
                <Col className='stream' md='6' lg='4'>
                    <span className='video-duration'>{stream.videoDuration}</span>
                    <span className='view-count'>
                        <img src={ViewersIcon} width={18} height={18} className='mr-1 my-1' alt='Views icon'/>
                        {shortenNumber(stream.viewCount)}
                    </span>
                    <Link to={`/stream/${stream._id}`}>
                        <img className='w-100' src={stream.thumbnailURL}
                             alt={`${stream.title} Stream Thumbnail`}/>
                    </Link>
                </Col>
                <Col md='6' lg='8'>
                    <h5 className='black-link text-break'>
                        <Link to={`/stream/${stream._id}`}>
                            {stream.title}
                        </Link>
                    </h5>
                    <h6>
                        {displayGenreAndCategory({
                            genre: stream.genre,
                            category: stream.category
                        })}
                    </h6>
                    <h6>{timeSince(stream.timestamp)}</h6>
                </Col>
            </Row>
        ));

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={this.getRecordedStreams}>
                    {this.state.showLoadMoreSpinner ? <Spinner size='sm' /> : undefined}
                    {this.state.showLoadMoreSpinner ? undefined : 'Load More'}
                </Button>
            </div>
        );

        return (
            <React.Fragment>
                <h5>Past Streams</h5>
                <hr className='my-4'/>
                <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                    {pastStreams}
                </Row>
                {loadMoreButton}
            </React.Fragment>
        );
    }

    render() {
        return !this.state.loaded ? <LoadingSpinner /> : (
            <Container fluid='lg'>
                {getAlert(this)}

                {!this.state.bannerPicURL ? undefined : (
                    <Row>
                        <Col>
                            <img className='w-100' height={200}
                                 src={this.state.bannerPicURL} alt={`${this.state.eventName} Banner Pic`}/>
                        </Col>
                    </Row>
                )}
                <Row className='mt-4'>
                    <Col>
                        <h4>{this.state.eventName}</h4>
                        <h6>Created by&nbsp;
                            <Link to={`/user/${this.state.createdBy.username}`}>
                                {this.state.createdBy.displayName || this.state.createdBy.username}
                            </Link>
                        </h6>
                    </Col>
                </Row>
                <hr className='my-4'/>
                {this.renderStages()}
                {this.renderPastStreams()}
            </Container>
        );
    }

}