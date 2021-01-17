import React from 'react';
import {Button, Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Modal, ModalBody, ModalFooter, ModalHeader, Row} from 'reactstrap';
import {Link} from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import config from '../../mainroom.config';

const STARTING_PAGE = 1;

export default class ManageRecordedStreams extends React.Component {

    constructor(props) {
        super(props);

        this.editStreamToggle = this.editStreamToggle.bind(this);
        this.deleteStreamToggle = this.deleteStreamToggle.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.setTags = this.setTags.bind(this);
        this.editRecordedStream = this.editRecordedStream.bind(this);
        this.deleteRecordedStream = this.deleteRecordedStream.bind(this);

        this.state = {
            loaded: false,
            loggedInUser: '',
            recordedStreams: [],
            dropdownState: [],
            selectedStreamIndex: undefined,
            selectedStreamId: '',
            selectedStreamTitle: '',
            selectedStreamGenre: '',
            selectedStreamCategory: '',
            selectedStreamTags: [],
            genres: [],
            categories: [],
            editStreamOpen: false,
            deleteStreamOpen: false,
            genreDropdownOpen: false,
            categoryDropdownOpen: false,
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
            }, () => {
                this.getRecordedStreams();
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
        const recordedStreams = [...this.state.recordedStreams, ...(res.data.recordedStreams || [])];
        this.setState({
            recordedStreams,
            dropdownState: new Array(recordedStreams.length).fill(false),
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage,
            loaded: true
        });
    }

    dropdownToggle(index) {
        const dropdownState = [...this.state.dropdownState];
        dropdownState[index] = !dropdownState[index];
        this.setState({
            dropdownState
        });
    }

    async openEditRecordedStreamModal(index, stream) {
        this.setState({
            selectedStreamIndex: index,
            selectedStreamId: stream._id,
            selectedStreamTitle: stream.title,
            selectedStreamGenre: stream.genre,
            selectedStreamCategory: stream.category,
            selectedStreamTags: stream.tags
        }, () => {
            this.editStreamToggle();
        });
    }

    editStreamToggle() {
        this.setState(prevState => ({
            editStreamOpen: !prevState.editStreamOpen
        }), () => {
            if (this.state.editStreamOpen && !(this.state.genres.length || this.state.categories.length)) {
                this.getFilters();
            }
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters');
        this.setState({
            genres: res.data.genres,
            categories: res.data.categories
        });
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    categoryDropdownToggle() {
        this.setState(prevState => ({
            categoryDropdownOpen: !prevState.categoryDropdownOpen
        }));
    }

    setTitle(event) {
        this.setState({
            selectedStreamTitle: event.target.value
        });
    }

    setGenre(event) {
        this.setState({
            selectedStreamGenre: event.currentTarget.textContent
        });
    }

    setCategory(event) {
        this.setState({
            selectedStreamCategory: event.currentTarget.textContent,
        });
    }

    setTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        this.setState({
            selectedStreamTags: tags
        });
    }

    async editRecordedStream() {
        const res = await axios.patch(`/api/recorded-streams/${this.state.selectedStreamId}`, {
            title: this.state.selectedStreamTitle,
            genre: this.state.selectedStreamGenre,
            category: this.state.selectedStreamCategory,
            tags: this.state.selectedStreamTags
        });
        if (res.status === 200) {
            const recordedStreams = [...this.state.recordedStreams];
            const recordedStream = recordedStreams[this.state.selectedStreamIndex];
            recordedStream.title = res.data.title;
            recordedStream.genre = res.data.genre;
            recordedStream.category = res.data.category;
            recordedStream.tags = res.data.tags;
            recordedStreams[this.state.selectedStreamIndex] = recordedStream;
            this.setState({
                recordedStreams
            }, () => {
                this.editStreamToggle();
            });
        }
    }

    openDeleteRecordedStreamModal(index, stream) {
        this.setState({
            selectedStreamIndex: index,
            selectedStreamId: stream._id,
            selectedStreamTitle: stream.title
        }, () => {
            this.deleteStreamToggle();
        });
    }

    deleteStreamToggle() {
        this.setState(prevState => ({
            deleteStreamOpen: !prevState.deleteStreamOpen
        }));
    }

    async deleteRecordedStream() {
        const res = await axios.delete(`/api/recorded-streams/${this.state.selectedStreamId}`);
        if (res.status === 200) {
            const recordedStreams = [...this.state.recordedStreams];
            recordedStreams.splice(this.state.selectedStreamIndex, 1);
            this.setState({
                recordedStreams
            }, () => {
                this.deleteStreamToggle();
            });
        }
    }

    renderEditRecordedStream() {
        const genreDropdownText = this.state.selectedStreamGenre || 'Select a genre...';
        const categoryDropdownText = this.state.selectedStreamCategory || 'Select a category...';

        const genres = this.state.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
            </div>
        ));

        const categories = this.state.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
            </div>
        ));

        return (
            <Modal isOpen={this.state.editStreamOpen} toggle={this.editStreamToggle} size='lg' centered={true}>
                <ModalHeader toggle={this.editStreamToggle}>Edit Recorded Stream</ModalHeader>
                <ModalBody>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Title:</h5>
                                </td>
                                <td>
                                    <input className='settings-title rounded-border' type='text'
                                           value={this.state.selectedStreamTitle} onChange={this.setTitle}/>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Genre:</h5>
                                </td>
                                <td>
                                    <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                              toggle={this.genreDropdownToggle} size='sm'>
                                        <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                                        <DropdownMenu>{genres}</DropdownMenu>
                                    </Dropdown>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Category:</h5>
                                </td>
                                <td>
                                    <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                              toggle={this.categoryDropdownToggle} size='sm'>
                                        <DropdownToggle caret>{categoryDropdownText}</DropdownToggle>
                                        <DropdownMenu>{categories}</DropdownMenu>
                                    </Dropdown>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h5 className='mt-2'>Tags:</h5>
                                </td>
                                <td>
                                    <table>
                                        <tbody>
                                        <tr>
                                            <td>
                                                <input className='mt-1 rounded-border' type='text'
                                                       value={this.state.selectedStreamTags} onChange={this.setTags}/>
                                            </td>
                                            <td>
                                                <i className='ml-1'>Comma-separated</i>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.editRecordedStream}>Save</Button>
                </ModalFooter>
            </Modal>
        );
    }

    renderDeleteRecordedStream() {
        return (
            <Modal isOpen={this.state.deleteStreamOpen} toggle={this.deleteStreamToggle} size='md' centered={true}>
                <ModalHeader toggle={this.deleteStreamToggle}>
                    Delete Recorded Stream
                </ModalHeader>
                <ModalBody>
                    <p>Are you sure you want to delete '{this.state.selectedStreamTitle}'?</p>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.deleteRecordedStream}>Delete</Button>
                </ModalFooter>
            </Modal>
        );
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
            const dropdown = (
                <Dropdown className='float-right options-dropdown' isOpen={this.state.dropdownState[index]}
                          toggle={() => this.dropdownToggle(index)} size='sm'>
                    <DropdownToggle caret>
                        Options
                    </DropdownToggle>
                    <DropdownMenu right>
                        <DropdownItem onClick={() => this.openEditRecordedStreamModal(index, stream)}>
                            Edit
                        </DropdownItem>
                        <DropdownItem onClick={() => this.openDeleteRecordedStreamModal(index, stream)}>
                            Delete
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
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
                        {dropdown}
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

                {this.renderEditRecordedStream()}
                {this.renderDeleteRecordedStream()}
            </React.Fragment>
        );
    }

}