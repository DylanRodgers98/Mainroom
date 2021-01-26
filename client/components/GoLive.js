import React from 'react';
import axios from 'axios';
import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Col} from 'reactstrap';
import Container from 'reactstrap/es/Container';

const RTMP_SERVER_URL = `rtmp://${process.env.RTMP_SERVER_HOST}:${process.env.RTMP_SERVER_RTMP_PORT}/live`;

export default class GoLive extends React.Component {

    constructor(props) {
        super(props);

        this.generateStreamKey = this.generateStreamKey.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.categoryDropdownToggle = this.categoryDropdownToggle.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.clearGenre = this.clearGenre.bind(this);
        this.setCategory = this.setCategory.bind(this);
        this.clearCategory = this.clearCategory.bind(this);
        this.setTags = this.setTags.bind(this);
        this.saveSettings = this.saveSettings.bind(this);

        this.state = {
            loaded: false,
            loggedInUser: '',
            genres: [],
            categories: [],
            genreDropdownOpen: false,
            categoryDropdownOpen: false,
            unsavedChanges: false,
            streamKey: '',
            streamTitle: '',
            streamGenre: '',
            streamCategory: '',
            streamTags: []
        };
    }

    componentDidMount() {
        this.fillComponentIfLoggedIn();
    }

    async fillComponentIfLoggedIn() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUser: res.data.username
            }, () => {
                this.fillComponent();
            });
        } else {
            window.location.href = `/login?redirectTo=${window.location.pathname}`;
        }
    }

    async fillComponent() {
        await Promise.all([
            this.getUserSettings(),
            this.getFilters()
        ]);
        this.setState({
            loaded: true
        });
    }

    async getUserSettings() {
        const res = await axios.get(`/api/users/${this.state.loggedInUser}/stream-info`);
        this.setState({
            streamKey: res.data.streamKey,
            streamTitle: res.data.title,
            streamGenre: res.data.genre,
            streamCategory: res.data.category,
            streamTags: res.data.tags
        });
    }

    async getFilters() {
        const res = await axios.get('/api/filters')

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

    async generateStreamKey() {
        const res = await axios.post(`/api/users/${this.state.loggedInUser}/stream-key`);
        if (res.status === 200) {
            this.setState({
                streamKey: res.data.streamKey
            });
        }
    }

    copyFrom(elementId) {
        document.getElementById(elementId).select();
        document.execCommand('copy');
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
            streamTitle: event.target.value,
            unsavedChanges: true
        });
    }

    setGenre(event) {
        this.setState({
            streamGenre: event.currentTarget.textContent,
            unsavedChanges: true
        });
    }

    clearGenre() {
        this.setState({
            streamGenre: '',
            unsavedChanges: true
        });
    }

    setCategory(event) {
        this.setState({
            streamCategory: event.currentTarget.textContent,
            unsavedChanges: true
        });
    }

    clearCategory() {
        this.setState({
            streamCategory: '',
            unsavedChanges: true
        });
    }

    setTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        this.setState({
            streamTags: tags,
            unsavedChanges: true
        });
    }

    async saveSettings() {
        const res = await axios.patch(`/api/users/${this.state.loggedInUser}/stream-info`, {
            title: this.state.streamTitle,
            genre: this.state.streamGenre,
            category: this.state.streamCategory,
            tags: this.state.streamTags
        });
        if (res.status === 200) {
            this.setState({
                streamTitle: res.data.title,
                streamGenre: res.data.genre,
                streamCategory: res.data.category,
                streamTags: res.data.tags,
                unsavedChanges: false
            });
        }
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container fluid='lg' className='mt-5'>
                <h4>Stream Settings</h4>
                <hr className='mt-4'/>
                <i>Copy and paste the Server URL and Stream Key into your streaming software</i>
                <Row className='mt-3'>
                    <Col xs='12'>
                        <h5>Server URL:</h5>
                    </Col>
                    <Col xs='12'>
                        <input id='serverUrlInput' className='rounded-border w-50-xs w-25-md' type='text'
                               value={RTMP_SERVER_URL} readOnly={true}/>
                        <Button className='btn-dark ml-1' size='sm'
                                onClick={() => this.copyFrom('serverUrlInput')}>
                            Copy
                        </Button>
                    </Col>
                    <Col className='mt-2' xs='12'>
                        <h5>Stream Key:</h5>
                    </Col>
                    <Col xs='12'>
                        <input id='streamKeyInput' className='rounded-border w-25' type='text'
                               value={this.state.streamKey} readOnly={true}/>
                        <Button className='btn-dark ml-1' size='sm'
                                onClick={() => this.copyFrom('streamKeyInput')}>
                            Copy
                        </Button>
                        <Button className='btn-dark ml-1' size='sm'
                                onClick={this.generateStreamKey}>
                            Generate a new key
                        </Button>
                    </Col>
                    <Col className='mt-2' xs='12'>
                        <h5>Title:</h5>
                    </Col>
                    <Col xs='12'>
                        <input className='w-100-xs w-50-md rounded-border' type='text' value={this.state.streamTitle}
                               onChange={this.setTitle}/>
                    </Col>
                    <Col className='mt-2' xs='12'>
                        <h5>Genre:</h5>
                    </Col>
                    <Col xs='12'>
                        <Dropdown className='dropdown-hover-darkred' isOpen={this.state.genreDropdownOpen}
                                  toggle={this.genreDropdownToggle} size='sm'>
                            <DropdownToggle caret>
                                {this.state.streamGenre || 'Select a genre...'}
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={this.clearGenre} disabled={!this.state.streamGenre}>
                                    Clear Genre
                                </DropdownItem>
                                <DropdownItem divider/>
                                {this.state.genres}
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                    <Col className='mt-2' xs='12'>
                        <h5>Category:</h5>
                    </Col>
                    <Col xs='12'>
                        <Dropdown className='dropdown-hover-darkred' isOpen={this.state.categoryDropdownOpen}
                                  toggle={this.categoryDropdownToggle} size='sm'>
                            <DropdownToggle caret>
                                {this.state.streamCategory || 'Select a category...'}
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={this.clearCategory} disabled={!this.state.streamCategory}>
                                    Clear Category
                                </DropdownItem>
                                <DropdownItem divider/>
                                {this.state.categories}
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                    <Col className='mt-2' xs='12'>
                        <h5>Tags:</h5>
                    </Col>
                    <Col xs='12'>
                        <input className='rounded-border w-100-xs w-25-md' type='text'
                               value={this.state.streamTags} onChange={this.setTags}/>
                        <i className='ml-1'>Comma-separated, no spaces</i>
                    </Col>
                </Row>
                <hr className='my-4'/>
                <div className='float-right mb-4'>
                    <Button className='btn-dark' size='lg' disabled={!this.state.unsavedChanges}
                            onClick={this.saveSettings}>
                        Save Settings
                    </Button>
                </div>
            </Container>
        );
    }
}