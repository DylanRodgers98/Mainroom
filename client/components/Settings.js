import React from 'react';
import axios from 'axios';
import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from "reactstrap";
import './settings.scss';

const genres = require('./genres.json');

export default class Settings extends React.Component {

    constructor(props) {
        super(props);

        this.getUserSettings = this.getUserSettings.bind(this);
        this.populateGenresDropdown = this.populateGenresDropdown.bind(this);
        this.generateStreamKey = this.generateStreamKey.bind(this);
        this.copyStreamKey = this.copyStreamKey.bind(this);
        this.copyServerUrl = this.copyServerUrl.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.setTitle = this.setTitle.bind(this);
        this.setGenre = this.setGenre.bind(this);
        this.setTags = this.setTags.bind(this);
        this.saveSettings = this.saveSettings.bind(this);

        this.state = {
            genres: [],
            genreDropdownOpen: false,
            unsavedChanges: false,
            stream_key: '',
            stream_title: '',
            stream_genre: '',
            stream_tags: []
        };
    }

    componentDidMount() {
        this.getUserSettings();
        this.populateGenresDropdown();
    }

    getUserSettings() {
        axios.get('/settings/all').then(res => {
            this.setState({
                stream_key: res.data.stream_key,
                stream_title: res.data.stream_title,
                stream_genre: res.data.stream_genre,
                stream_tags: res.data.stream_tags
            });
        });
    }

    populateGenresDropdown() {
        this.setState({
            genres: Array.from(genres.genres).sort()
        });
    }

    generateStreamKey() {
        axios.post('/settings/stream_key').then(res => {
            this.setState({
                stream_key: res.data.stream_key
            });
        })
    }

    copyServerUrl() {
        document.getElementById('serverUrlInput').select();
        document.execCommand('copy');
    }

    copyStreamKey() {
        document.getElementById('streamKeyInput').select();
        document.execCommand('copy');
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    setTitle(event) {
        this.setState({
            stream_title: event.target.value,
            unsavedChanges: true
        });
    }

    setGenre(event) {
        this.setState({
            stream_genre: event.currentTarget.textContent,
            unsavedChanges: true
        });
    }

    setTags(event) {
        const tags = event.target.value.replace(/\s/g, '').split(',');
        this.setState({
            stream_tags: tags,
            unsavedChanges: true
        });
    }

    saveSettings() {
        axios.post('/settings/all', {
            stream_title: this.state.stream_title,
            stream_genre: this.state.stream_genre,
            stream_tags: this.state.stream_tags
        }).then(res => {
            this.setState({
                stream_title: res.data.stream_title,
                stream_genre: res.data.stream_genre,
                stream_tags: res.data.stream_tags,
                unsavedChanges: false
            })
        });
    }

    getGenreDropdownText() {
        return this.state.stream_genre ? this.state.stream_genre : 'Select a genre...';
    }

    render() {
        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
        });

        return (
            <React.Fragment>
                <div className="container mt-5">
                    <h4>Stream Settings</h4>
                    <hr className="my-4"/>
                    <table>
                        <tr>
                            <td>
                                <h5 className="mr-3">Server URL:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input id="serverUrlInput" type="text" value="rtmp://127.0.0.1:1935/live"/>
                                    </td>
                                    <td>
                                        <Button className="btn btn-dark ml-1" size="sm" onClick={this.copyServerUrl}>
                                            Copy
                                        </Button>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2 mr-3">Streaming Key:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input id="streamKeyInput" className="mt-2" type="text"
                                               value={this.state.stream_key}/>
                                    </td>
                                    <td>
                                        <Button className="btn btn-dark mt-2 ml-1" size="sm"
                                                onClick={this.copyStreamKey}>
                                            Copy
                                        </Button>
                                        <Button className="btn btn-dark mt-2 ml-1" onClick={this.generateStreamKey}
                                                size="sm">
                                            Generate a new key
                                        </Button>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Title:</h5>
                            </td>
                            <td>
                                <input className="settings-title" type="text" value={this.state.stream_title}
                                       onChange={this.setTitle}/>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Genre:</h5>
                            </td>
                            <td>
                                <Dropdown className="settings-dropdown" isOpen={this.state.genreDropdownOpen}
                                          toggle={this.genreDropdownToggle} size="sm">
                                    <DropdownToggle caret>{this.getGenreDropdownText()}</DropdownToggle>
                                    <DropdownMenu>{genres}</DropdownMenu>
                                </Dropdown>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Tags:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input className="mt-1" type="text" value={this.state.stream_tags}
                                               onChange={this.setTags}/>
                                    </td>
                                    <td>
                                        <i className="ml-1">Comma-separated</i>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                    </table>
                    <hr className="my-4"/>
                    <div className="float-right">
                        <Button className="btn btn-dark" size="lg" disabled={!this.state.unsavedChanges}
                                onClick={this.saveSettings}>
                            Save Settings
                        </Button>
                    </div>
                </div>
            </React.Fragment>
        )
    }
}