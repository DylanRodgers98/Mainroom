import React from "react";
import axios from 'axios';
import Container from "reactstrap/es/Container";
import {Button} from "reactstrap";
import {Redirect} from "react-router-dom";

export default class Settings extends React.Component {

    constructor(props) {
        super(props);

        this.setUsername = this.setUsername.bind(this);
        this.setEmail = this.setEmail.bind(this);
        this.setCurrentPassword = this.setCurrentPassword.bind(this);
        this.setNewPassword = this.setNewPassword.bind(this);
        this.setConfirmNewPassword = this.setConfirmNewPassword.bind(this);
        this.saveSettings = this.saveSettings.bind(this);

        this.state = {
            username: '',
            email: '',
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
            unsavedChanges: false,
            redirectToHome: false
        }
    }

    componentDidMount() {
        this.getUsernameAndEmail();
    }

    async getUsernameAndEmail() {
        const res = await axios.get('/api/settings');
        this.setState({
            username: res.data.username,
            email: res.data.email
        });
    }

    setUsername(event) {
        this.setState({
            username: event.target.value,
            unsavedChanges: true
        });
    }

    setEmail(event) {
        this.setState({
            email: event.target.value,
            unsavedChanges: true
        });
    }

    async saveSettings() {
        const res = await axios.post('/api/settings', {
            username: this.state.username,
            email: this.state.email
        });
        if (res.status === 200) {
            this.setState({
                redirectToHome: true
            });
        }
    }

    renderRedirectToHome() {
        if (this.state.redirectToHome) {
            return <Redirect to={`/`}/>;
        }
    }

    setCurrentPassword(event) {
        this.setState({
            currentPassword: event.target.value
        });
    }

    setNewPassword(event) {
        this.setState({
            newPassword: event.target.value
        });
    }

    setConfirmNewPassword(event) {
        this.setState({
            confirmNewPassword: event.target.value
        });
    }

    updatePassword() {

    }

    render() {
        return (
            <Container className="mt-5">
                <h4>Account Settings</h4>
                <hr className="mt-4"/>
                <table className="mt-3">
                    <tr>
                        <td>
                            <h5 className="mr-3">Username:</h5>
                        </td>
                        <td>
                            <input type="text" value={this.state.username} onChange={this.setUsername}/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h5 className="mt-2 mr-3">Email Address:</h5>
                        </td>
                        <td>
                            <input type="text" value={this.state.email} onChange={this.setEmail}/>
                        </td>
                    </tr>
                </table>
                // TODO: move this to Modal
                <h5 className="mt-4">Reset Password:</h5>
                <hr/>
                <table>
                    <tr>
                        <td>
                            <h6 className='mr-3'>Current Password:</h6>
                        </td>
                        <td>
                            <input type="password" value={this.state.currentPassword}
                                   onChange={this.setCurrentPassword}/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h6 className='mt-1 mr-3'>New Password:</h6>
                        </td>
                        <td>
                            <input className='mt-1' type="password" value={this.state.newPassword}
                                   onChange={this.setNewPassword}/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h6 className='mt-1 mr-3'>Confirm New Password:</h6>
                        </td>
                        <td>
                            <input className='mt-1' type="password" value={this.state.confirmNewPassword}
                                   onChange={this.setConfirmNewPassword}/>
                        </td>
                    </tr>
                </table>
                <hr className="my-4"/>
                <div className="float-right">
                    {this.renderRedirectToHome()}
                    <Button className="btn-dark" size="lg" disabled={!this.state.unsavedChanges}
                            onClick={this.saveSettings}>
                        Save Settings
                    </Button>
                </div>
            </Container>
        );
    }

}