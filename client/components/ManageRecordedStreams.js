import React from 'react';
import {
    Alert,
    Button,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Row,
    Spinner
} from 'reactstrap';
import {Link} from 'react-router-dom';
import axios from 'axios';
import {pagination, alertTimeout} from '../../mainroom.config';
import {shortenNumber} from '../utils/numberUtils';
import {formatDate} from '../utils/dateUtils';
import {displayGenreAndCategory} from '../utils/displayUtils';

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
        this.clearGenre = this.clearGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.clearCategory = this.clearCategory.bind(this);
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
            unsavedChanges: false,
            deleteStreamOpen: false,
            genreDropdownOpen: false,
            categoryDropdownOpen: false,
            showLoadMoreButton: false,
            showSaveChangesSpinner: false,
            showDeleteSpinner: false,
            alertIndex: undefined,
            alertText: '',
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
                limit: pagination.large
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

        const genres = res.data.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
            </div>
        ));

        const categories = res.data.categories.map((category, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setCategory}>{category}</DropdownItem>
            </div>
        ));

        this.setState({
            genres,
            categories
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
            selectedStreamTitle: event.target.value,
            unsavedChanges: true
        });
    }

    setGenre(event) {
        this.setState({
            selectedStreamGenre: event.currentTarget.textContent,
            unsavedChanges: true
        });
    }

    clearGenre() {
        this.setState({
            selectedStreamGenre: '',
            unsavedChanges: true
        });
    }

    setCategory(event) {
        this.setState({
            selectedStreamCategory: event.currentTarget.textContent,
            unsavedChanges: true
        });
    }

    clearCategory() {
        this.setState({
            selectedStreamCategory: '',
            unsavedChanges: true
        });
    }

    setTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        this.setState({
            selectedStreamTags: tags,
            unsavedChanges: true
        });
    }

    editRecordedStream() {
        this.setState({showSaveChangesSpinner: true}, async () => {
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

                const alertText = `Successfully edited ${recordedStream.title ? `'${recordedStream.title}'` : 'recorded stream'}`;

                this.setState({
                    recordedStreams,
                    showSaveChangesSpinner: false,
                    alertIndex: this.state.selectedStreamIndex,
                    alertText
                }, () => {
                    this.editStreamToggle();
                    setTimeout(() => {
                        this.setState({
                            alertIndex: undefined,
                            alertText: '',
                            selectedStreamIndex: undefined,
                            selectedStreamId: '',
                            selectedStreamTitle: '',
                            selectedStreamGenre: '',
                            selectedStreamCategory: '',
                            selectedStreamTags: []
                        });
                    }, alertTimeout);
                });
            }
        });
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

    deleteRecordedStream() {
        this.setState({showDeleteSpinner: true}, async () => {
            const res = await axios.delete(`/api/recorded-streams/${this.state.selectedStreamId}`);
            if (res.status === 200) {
                const recordedStreams = [...this.state.recordedStreams];
                recordedStreams.splice(this.state.selectedStreamIndex, 1);

                const alertText = `Successfully deleted ${this.state.selectedStreamTitle ? 
                    `'${this.state.selectedStreamTitle}'` : 'recorded stream'}`

                this.setState({
                    recordedStreams,
                    showDeleteSpinner: false,
                    alertText,
                    alertIndex: this.state.selectedStreamIndex
                }, () => {
                    this.deleteStreamToggle();
                    setTimeout(() => {
                        this.setState({
                            alertIndex: undefined,
                            alertText: '',
                            selectedStreamIndex: undefined,
                            selectedStreamId: '',
                            selectedStreamTitle: ''
                        });
                    }, alertTimeout);
                });
            }
        });
    }

    renderEditRecordedStream() {
        return (
            <Modal isOpen={this.state.editStreamOpen} toggle={this.editStreamToggle} centered={true}>
                <ModalHeader toggle={this.editStreamToggle}>
                    Edit Recorded Stream
                </ModalHeader>
                <ModalBody>
                    <Container fluid className='remove-padding-lr'>
                        <Row>
                            <Col className='mt-2' xs='12'>
                                <h5>Title</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='w-100 rounded-border' type='text'
                                       value={this.state.selectedStreamTitle} onChange={this.setTitle}/>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Genre</h5>
                            </Col>
                            <Col xs='12'>
                                <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                          toggle={this.genreDropdownToggle} size='sm'>
                                    <DropdownToggle caret>
                                        {this.state.selectedStreamGenre || 'Select a genre...'}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={this.clearGenre}
                                                      disabled={!this.state.selectedStreamGenre}>
                                            Clear Genre
                                        </DropdownItem>
                                        <DropdownItem divider/>
                                        {this.state.genres}
                                    </DropdownMenu>
                                </Dropdown>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Category</h5>
                            </Col>
                            <Col xs='12'>
                                <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                          toggle={this.categoryDropdownToggle} size='sm'>
                                    <DropdownToggle caret>
                                        {this.state.selectedStreamCategory || 'Select a category...'}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={this.clearCategory}
                                                      disabled={!this.state.selectedStreamCategory}>
                                            Clear Category
                                        </DropdownItem>
                                        <DropdownItem divider/>
                                        {this.state.categories}
                                    </DropdownMenu>
                                </Dropdown>
                            </Col>
                            <Col className='mt-2' xs='12'>
                                <h5>Tags</h5>
                            </Col>
                            <Col xs='12'>
                                <input className='rounded-border w-100-xs w-50-md' type='text'
                                       value={this.state.selectedStreamTags} onChange={this.setTags}/>
                                <i className='ml-1'>Comma-separated, no spaces</i>
                            </Col>
                        </Row>
                    </Container>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.editRecordedStream}
                            disabled={!this.state.unsavedChanges}>
                        {this.state.showSaveChangesSpinner ? <Spinner size='sm' /> : undefined}
                        <span className={this.state.showSaveChangesSpinner ? 'sr-only' : undefined}>
                            Save Changes
                        </span>
                    </Button>
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
                    <Button className='btn-dark' onClick={this.deleteRecordedStream}>
                        {this.state.showDeleteSpinner ? <Spinner size='sm' /> : undefined}
                        <span className={this.state.showDeleteSpinner ? 'sr-only' : undefined}>
                            Delete
                        </span>
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    renderRecordedStreams() {
        const recordedStreams = this.state.recordedStreams.map((stream, index) => {
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

            const alert = this.state.alertIndex !== index ? undefined : (
                <Alert color='success' className='my-3' isOpen={this.state.alertText}>
                    {this.state.alertText}
                </Alert>
            );
            const nextHasAlert = this.state.alertIndex === index + 1;
            const requiresMargin = !(nextHasAlert && this.state.alertText);

            return (
                <React.Fragment>
                    {alert}
                    <Row key={index} className={requiresMargin ? 'margin-bottom-thick' : undefined}>
                        <Col className='stream' md='6' lg='4'>
                            <span className='video-duration'>{stream.videoDuration}</span>
                            <span className='view-count'>
                                {shortenNumber(stream.viewCount)} view{stream.viewCount === 1 ? '' : 's'}
                            </span>
                            <Link to={`/stream/${stream._id}`}>
                                <img className='w-100' src={stream.thumbnailURL}
                                     alt={`${stream.title} Stream Thumbnail`}/>
                            </Link>
                        </Col>
                        <Col md='6' lg='8'>
                            {dropdown}
                            <h5 className='black-link'>
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
                            <h6>{formatDate(stream.timestamp)}</h6>
                        </Col>
                    </Row>
                </React.Fragment>
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
                {recordedStreams.length ? recordedStreams : (
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
        return !this.state.loaded ? (
            <div className='position-relative h-100'>
                <Spinner color='dark' className='loading-spinner' />
            </div>
        ) : (
            <React.Fragment>
                <Container fluid='lg' className='mt-5'>
                    <Row>
                        <Col>
                            <h4>Manage Recorded Streams</h4>
                        </Col>
                    </Row>
                    <hr className='mt-4'/>
                    {this.renderRecordedStreams()}
                </Container>

                {this.renderEditRecordedStream()}
                {this.renderDeleteRecordedStream()}
            </React.Fragment>
        );
    }

}