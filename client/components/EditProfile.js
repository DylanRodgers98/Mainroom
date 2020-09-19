import React from "react";
import axios from 'axios';
import Container from "reactstrap/es/Container";
import {Button, Col, Dropdown, DropdownMenu, DropdownToggle} from "reactstrap";
import {Redirect} from "react-router-dom";

export default class EditProfile extends React.Component {

    constructor(props) {
        super(props);

        this.setDisplayName = this.setDisplayName.bind(this);
        this.setLocation = this.setLocation.bind(this);
        this.setBio = this.setBio.bind(this);
        this.setLinks = this.setLinks.bind(this);
        this.saveProfile = this.saveProfile.bind(this);

        this.state = {
            unsavedChanges: false,
            redirectToProfile: false,
            username: '',
            displayName: '',
            location: '',
            bio: '',
            links: []
        };
    }

    componentDidMount() {
        this.getUserProfile();
    }

    async getUserProfile() {
        const res = await axios.get('/users');
        this.setState({
            username: res.data.username,
            displayName: res.data.displayName,
            location: res.data.location,
            bio: res.data.bio,
            links: res.data.links
        })
    }

    setDisplayName(event) {
        this.setState({
            displayName: event.target.value,
            unsavedChanges: true
        });
    }

    setLocation(event) {
        this.setState({
            location: event.target.value,
            unsavedChanges: true
        });
    }

    setBio(event) {
        this.setState({
            bio: event.target.value,
            unsavedChanges: true
        });
    }

    setLinks(event) {
        this.setState({
            links: event.target.value, //THIS WILL NEED CHANGING
            unsavedChanges: true
        });
    }

    async saveProfile() {
        const res = await axios.post('/users', {
            displayName: this.state.displayName,
            location: this.state.location,
            bio: this.state.bio,
            links: this.state.links
        });
        if (res.status === 200) {
            this.setState({
                redirectToProfile: true
            })
        }
    }

    renderRedirectToProfile() {
        if (this.state.redirectToProfile) {
            return <Redirect to={`/user/${this.state.username}`}/>;
        }
    }

    render() {
        return (
            <React.Fragment>
                <Container className="mt-5">
                    <h4>Edit Profile</h4>
                    <hr className="mt-4"/>
                    <table className="mt-3">
                        <tr>
                            <td>
                                <h5 className="mr-3">Display Name:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input type="text" value={this.state.displayName}
                                               onChange={this.setDisplayName}/>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2 mr-3">Location:</h5>
                            </td>
                            <table>
                                <tr>
                                    <td>
                                        <input className="mt-2" type="text" value={this.state.location}
                                               onChange={this.setLocation}/>
                                    </td>
                                </tr>
                            </table>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Bio:</h5>
                            </td>
                            <td>
                                <textarea className="mt-2" value={this.state.bio} onChange={this.setBio}/>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h5 className="mt-2">Links:</h5>
                            </td>
                            <td>

                            </td>
                        </tr>
                    </table>
                    <hr className="my-4"/>
                    <div className="float-right">
                        <div>
                            {this.renderRedirectToProfile()}
                            <Button className="btn-dark" size="lg" disabled={!this.state.unsavedChanges}
                                    onClick={this.saveProfile}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </Container>
            </React.Fragment>
        );
    }

}