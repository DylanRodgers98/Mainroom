import React from 'react';
import axios from 'axios';
import {Dropdown, DropdownItem, DropdownMenu, DropdownToggle} from "reactstrap";
import {Link} from "react-router-dom";

const genres = require('./genres.json');

export default class Settings extends React.Component {

    constructor(props) {
        super(props);

        this.generateStreamKey = this.generateStreamKey.bind(this);
        this.genreDropdownToggle = this.genreDropdownToggle.bind(this);
        this.getGenre = this.getGenre.bind(this);
        this.setGenre = this.setGenre.bind(this);

        this.state = {
            streamKey: '',
            selectedGenre: '',
            genres: [],
            genreDropdownOpen: false
        };
    }

    componentDidMount() {
        this.getStreamKey();
        this.getGenre();
        this.setState({
            genres: Array.from(genres.genres).sort()
        });
    }

    genreDropdownToggle() {
        this.setState(prevState => ({
            genreDropdownOpen: !prevState.genreDropdownOpen
        }));
    }

    generateStreamKey() {
        axios.post('/settings/stream_key').then(res => {
            this.setState({
                streamKey: res.data.stream_key
            });
        })
    }

    getStreamKey() {
        axios.get('/settings/stream_key').then(res => {
            this.setState({
                streamKey: res.data.stream_key
            });
        })
    }

    getGenre() {
        axios.get('/settings/genre').then(res => {
            this.setState({
                selectedGenre: res.data.genre
            })
        });
    }

    setGenre(dropdownValue) {
        axios.post('/settings/genre', {
            genre: dropdownValue.currentTarget.textContent
        }).then(res => {
            this.setState({
                selectedGenre: res.data.genre
            })
        });
    }

    getGenreDropdownText() {
        return this.state.selectedGenre ? this.state.selectedGenre : 'Select a genre...';
    }

    render() {
        const genres = this.state.genres.map((genre) => {
            return <DropdownItem onClick={this.setGenre}>{genre}</DropdownItem>
        });

        return (
            <React.Fragment>
                <div className="container mt-5">
                    <h4>Streaming Key</h4>
                    <hr className="my-4"/>

                    <div className="col-xs-12 col-sm-12 col-md-8 col-lg-6">
                        <div className="row">
                            <h5>{this.state.stream_key}</h5>
                        </div>
                        <div className="row">
                            <button
                                className="btn btn-dark mt-2"
                                onClick={this.generateStreamKey}>
                                Generate a new key
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container mt-5">
                    <h4>Select a Genre</h4>
                    <hr className="my-4"/>

                    <div className="col-xs-12 col-sm-12 col-md-8 col-lg-6">
                        <div className="row">
                            <Dropdown isOpen={this.state.genreDropdownOpen} toggle={this.genreDropdownToggle}>
                                <DropdownToggle caret>{this.getGenreDropdownText()}</DropdownToggle>
                                <DropdownMenu>{genres}</DropdownMenu>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                <div className="container mt-5">
                    <h4>How to Stream</h4>
                    <hr className="my-4"/>

                    <div className="col-12">
                        <div className="row">
                            <p>
                                You can use <a target="_blank" href="https://obsproject.com/">OBS</a> or
                                <a target="_blank" href="https://www.xsplit.com/">XSplit</a> to Live stream. If you're
                                using OBS, go to Settings > Stream and select Custom from service dropdown.
                                Enter <b>rtmp://127.0.0.1:1935/live</b> in server input field. Also, add your stream
                                key.
                                Click apply to save.
                            </p>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        )
    }
}