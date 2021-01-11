import React from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';
import {Container, Row, Col, DropdownToggle, DropdownMenu, DropdownItem, Dropdown, Button} from 'reactstrap';

const STARTING_PAGE = 1;

export default class LiveStreamsByCategory extends React.Component {

    constructor(props) {
        super(props);

        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.setGenreFilter = this.setGenreFilter.bind(this);
        this.clearGenreFilter = this.clearGenreFilter.bind(this);

        this.state = {
            loaded: false,
            liveStreams: [],
            nextPage: STARTING_PAGE,
            genres: [],
            genreDropdownOpen: false,
            genreFilter: '',
            showLoadMoreButton: false
        }
    }

    componentDidMount() {
        this.getLiveStreams();
        this.getFilters();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.match.params.category !== this.props.match.params.category) {
            this.setState({
                loaded: false,
                liveStreams: [],
                nextPage: STARTING_PAGE,
                genreFilter: ''
            }, async () => {
                await this.getLiveStreams();
            });
        } else if (prevState.genreFilter !== this.state.genreFilter) {
            this.setState({
                loaded: false,
                liveStreams: [],
                nextPage: STARTING_PAGE
            }, async () => {
                await this.getLiveStreams();
            });
        }
    }

    async getLiveStreams() {
        const queryParams = {
            params: {
                page: this.state.nextPage,
                limit: config.pagination.large
            }
        };
        if (this.props.match.params.category) {
            queryParams.params.category = decodeURIComponent(this.props.match.params.category);
        }
        if (this.state.genreFilter) {
            queryParams.params.genre = this.state.genreFilter;
        }

        const res = await axios.get('/api/livestreams', queryParams);
        this.setState({
            liveStreams: [...this.state.liveStreams, ...(res.data.streams || [])],
            nextPage: res.data.nextPage,
            showLoadMoreButton: !!res.data.nextPage,
            loaded: true
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters/genres');
        this.setState({
            genres: res.data.genres
        })
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    setGenreFilter(event) {
        this.setState({
            genreFilter: event.currentTarget.textContent
        });
    }

    clearGenreFilter() {
        this.setState({
            genreFilter: ''
        });
    }

    render() {
        const streams = this.state.liveStreams.map((liveStream, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                <span className='live-label'>LIVE</span>
                <Link to={`/user/${liveStream.username}/live`}>
                    <div className='stream-thumbnail'>
                        <img src={liveStream.thumbnailURL} alt={`${liveStream.username} Stream Thumbnail`}/>
                    </div>
                </Link>
                <span className='username'>
                    <Link to={`/user/${liveStream.username}/live`}>
                        {liveStream.displayName || liveStream.username}
                    </Link>
                </span>
            </Col>
        ));

        const streamBoxes = streams.length ? (
            <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                {streams}
            </Row>
        ) : (
            <p className='my-4 text-center'>
                No one matching your search is live right now :(
            </p>
        );

        const pageHeader = `${decodeURIComponent(this.props.match.params.category)} Livestreams`;

        const genreDropdownText = this.state.genreFilter || 'Filter';

        const genres = this.state.genres.map((genre, index) => (
            <div key={index}>
                <DropdownItem onClick={this.setGenreFilter}>{genre}</DropdownItem>
            </div>
        ));

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4 mb-4'>
                <Button className='btn-dark' onClick={async () => await this.getLiveStreams()}>
                    Load More
                </Button>
            </div>
        );

        return (
            <Container fluid='lg' className='mt-5'>
                <Row>
                    <Col>
                        <h4>{pageHeader}</h4>
                    </Col>
                    <Col>
                        <Dropdown className='dropdown-hover-darkred float-right' isOpen={this.state.genreDropdownOpen}
                                  toggle={this.genreDropdownToggle} size='sm'>
                            <DropdownToggle caret>{genreDropdownText}</DropdownToggle>
                            <DropdownMenu right>
                                <DropdownItem onClick={this.clearGenreFilter} disabled={!this.state.genreFilter}>
                                    Clear Filter
                                </DropdownItem>
                                <DropdownItem divider/>
                                {genres}
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>
                <hr className='my-4'/>
                {!this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
                    <React.Fragment>
                        {streamBoxes}
                        {loadMoreButton}
                    </React.Fragment>
                )}
            </Container>
        );
    }
}