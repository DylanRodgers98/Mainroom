import React from 'react';
import {Button, Col, Container, Row} from 'reactstrap';
import {Link} from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import config from '../../mainroom.config';

const STARTING_PAGE = 1;

export default class ManageRecordedStreams extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            loaded: false,
            loggedInUser: '',
            recordedStreams: [],
            showLoadMoreButton: false,
            nextPage: STARTING_PAGE
        }
    }

    componentDidMount() {
        this.getRecordedStreamsIfLoggedIn();
    }

    async getRecordedStreamsIfLoggedIn() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUser: res.data.username
            }, async () => {
                await this.getRecordedStreams();
                this.setState({
                    loaded: true
                });
            });
        } else {
            window.location.href = `/login?redirectTo=${window.location.pathname}`;
        }
    }

    async getRecordedStreams() {
        const res = await axios.get(`/api/recorded-streams`, {
            params: {
                username: this.state.loggedInUser,
                page: this.state.nextPage,
                limit: config.pagination.large
            }
        });
        this.setState({
            recordedStreams: [...this.state.recordedStreams, ...(res.data.recordedStreams || [])],
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage
        });
    }

    renderPastStreams() {
        const pastStreams = this.state.recordedStreams.map((stream, index) => {
            const genreAndCategory = (
                <h6>
                    <i>
                        <Link to={`/genre/${stream.genre}`}>
                            {stream.genre}
                        </Link> <Link to={`/category/${stream.category}`}>
                            {stream.category}
                        </Link>
                    </i>
                </h6>
            );
            const timestamp = moment(stream.timestamp).format('ddd, DD MMM, yyyy · HH:mm');
            return (
                <Row key={index} className='margin-bottom-thick'>
                    <Col className='stream' md='6' lg='4'>
                        <Link to={`/stream/${stream._id}`}>
                            <div className='stream-thumbnail'>
                                <img src={stream.thumbnailURL} alt={`${stream.title} Stream Thumbnail`}/>
                            </div>
                        </Link>
                    </Col>
                    <Col md='6' lg='8'>
                        <h5 className='black-link'>
                            <Link to={`/stream/${stream._id}`}>
                                {stream.title}
                            </Link>
                        </h5>
                        {stream.genre || stream.category ? genreAndCategory : undefined}
                        <h6>{timestamp}</h6>
                        <h6>{stream.viewCount} view{stream.viewCount === 1 ? '' : 's'}</h6>
                    </Col>
                </Row>
            );
        });

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={async () => await this.getRecordedStreams()}>
                    Load More
                </Button>
            </div>
        );

        return (
            <React.Fragment>
                {pastStreams.length ? pastStreams : (
                    <Row>
                        <Col>
                            <p>You have no recorded streams. Go live and we will record the stream for you!</p>
                        </Col>
                    </Row>
                )}
                {loadMoreButton}
            </React.Fragment>
        );
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <React.Fragment>
                <Container fluid='lg' className='mt-5'>
                    <Row>
                        <Col>
                            <h4>Manage Recorded Streams</h4>
                        </Col>
                    </Row>
                    <hr className='mt-4'/>
                    {this.renderPastStreams()}
                </Container>
            </React.Fragment>
        );
    }

}