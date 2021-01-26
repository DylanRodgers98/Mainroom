import React from 'react';
import axios from 'axios';
import Container from 'reactstrap/es/Container';
import {Button, Col, Modal, ModalBody, ModalFooter, ModalHeader, Row} from 'reactstrap';
import _ from 'lodash';

export default class Settings extends React.Component {

    constructor(props) {
        super(props);

        this.setUsername = this.setUsername.bind(this);
        this.setEmail = this.setEmail.bind(this);
        this.setCurrentPassword = this.setCurrentPassword.bind(this);
        this.setNewPassword = this.setNewPassword.bind(this);
        this.setConfirmNewPassword = this.setConfirmNewPassword.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.resetPasswordToggle = this.resetPasswordToggle.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
        this.handleEmailSettingsChange = this.handleEmailSettingsChange.bind(this);
        this.deleteAccountToggle = this.deleteAccountToggle.bind(this);
        this.deleteAccount = this.deleteAccount.bind(this);

        this.state = {
            loggedInUserId: '',
            loaded: false,
            startingUsername: '',
            username: '',
            startingEmail: '',
            email: '',
            startingEmailSettings: undefined,
            emailSettings: undefined,
            usernameInvalidReason: '',
            emailInvalidReason: '',
            resetPasswordOpen: false,
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
            currentPasswordInvalidReason: '',
            newPasswordInvalidReason: '',
            confirmNewPasswordInvalidReason: '',
            deleteAccountOpen: false
        }
    }

    componentDidMount() {
        this.fillComponentIfLoggedIn();
    }

    async fillComponentIfLoggedIn() {
        const res = await axios.get('/logged-in-user');
        if (res.data.username) {
            this.setState({
                loggedInUserId: res.data._id
            }, () => {
                this.getUsernameAndEmail();
            });
        } else {
            window.location.href = `/login?redirectTo=${window.location.pathname}`;
        }
    }

    async getUsernameAndEmail() {
        const res = await axios.get(`/api/users/${this.state.loggedInUserId}/settings`);
        this.setState({
            startingUsername: res.data.username,
            username: res.data.username,
            startingEmail: res.data.email,
            email: res.data.email,
            startingEmailSettings: Object.assign({}, res.data.emailSettings),
            emailSettings: res.data.emailSettings,
            loaded: true
        });
    }

    setUsername(event) {
        this.setState({
            username: event.target.value
        });
    }

    setEmail(event) {
        this.setState({
            email: event.target.value
        });
    }

    enableSaveButton() {
        return this.isUsernameChanged() || this.isEmailChanged() || this.isEmailSettingsChanged();
    }

    isUsernameChanged() {
        return this.state.username !== this.state.startingUsername;
    }

    isEmailChanged() {
        return this.state.email !== this.state.startingEmail;
    }

    isEmailSettingsChanged() {
        return !_.isEqual(this.state.emailSettings, this.state.startingEmailSettings);
    }

    async saveSettings() {
        const data = {
            username: this.state.username,
            updateUsername: this.isUsernameChanged(),
            email: this.state.email,
            updateEmail: this.isEmailChanged()
        };
        if (this.isEmailSettingsChanged()) {
            data.emailSettings = this.state.emailSettings;
        }
        const res = await axios.patch(`/api/users/${this.state.loggedInUserId}/settings`, data);
        this.setState({
            usernameInvalidReason: res.data.usernameInvalidReason || '',
            emailInvalidReason: res.data.emailInvalidReason || ''
        });
        if (!(res.data.usernameInvalidReason || res.data.emailInvalidReason)) {
            this.setState({
                startingUsername: this.state.username,
                startingEmail: this.state.email,
                startingEmailSettings: this.state.emailSettings
            });
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

    resetPasswordToggle() {
        this.setState(prevState => ({
            resetPasswordOpen: !prevState.resetPasswordOpen,
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        }));
    }

    async resetPassword() {
        const res = await axios.post(`/api/users/${this.state.loggedInUserId}/password`, {
            currentPassword: this.state.currentPassword,
            newPassword: this.state.newPassword,
            confirmNewPassword: this.state.confirmNewPassword
        });
        this.setState({
            currentPasswordInvalidReason: res.data.currentPasswordInvalidReason || '',
            newPasswordInvalidReason: res.data.newPasswordInvalidReason || '',
            confirmNewPasswordInvalidReason: res.data.confirmNewPasswordInvalidReason || ''
        });
        if (!(this.state.currentPasswordInvalidReason
            || this.state.newPasswordInvalidReason
            || this.state.confirmNewPasswordInvalidReason)) {
            this.resetPasswordToggle();
        }
    }

    getNewPasswordInvalidReason() {
        return typeof this.state.newPasswordInvalidReason === 'string' ? this.state.newPasswordInvalidReason
            : this.state.newPasswordInvalidReason.map((line, index) => (
                <div key={index}>
                    {line}<br/>
                </div>
            ));
    }

    enableResetPasswordButton() {
        return this.state.currentPassword && this.state.newPassword && this.state.confirmNewPassword;
    }

    handleEmailSettingsChange(event) {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        const name = event.target.name;
        const newEmailSettings = this.state.emailSettings;
        newEmailSettings[name] = value;
        this.setState({
            emailSettings: newEmailSettings
        });
    }

    deleteAccountToggle() {
        this.setState(prevState => ({
            deleteAccountOpen: !prevState.deleteAccountOpen
        }));
    }

    async deleteAccount() {
        const res = await axios.delete(`/api/users/${this.state.loggedInUserId}`);
        if (res.status === 200) {
            window.location.href = '/logout';
        }
    }

    renderResetPassword() {
        return (
            <Modal isOpen={this.state.resetPasswordOpen} toggle={this.resetPasswordToggle} centered={true}>
                <ModalHeader toggle={this.resetPasswordToggle}>Reset Password</ModalHeader>
                <ModalBody>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <h6 className='mr-3'>Current Password:</h6>
                                </td>
                                <td>
                                    <input className='rounded-border' type='password' value={this.state.currentPassword}
                                           onChange={this.setCurrentPassword}/>
                                </td>
                                <td>
                                    <div className='ml-1'>
                                        {this.state.currentPasswordInvalidReason}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td valign='top'>
                                    <h6 className='mt-1 mr-3'>New Password:</h6>
                                </td>
                                <td valign='top'>
                                    <input className='mt-1 rounded-border' type='password' value={this.state.newPassword}
                                           onChange={this.setNewPassword}/>
                                </td>
                                <td>
                                    <div className='ml-1'>
                                        {this.getNewPasswordInvalidReason()}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h6 className='mt-1 mr-3'>Confirm New Password:</h6>
                                </td>
                                <td>
                                    <input className='mt-1 rounded-border' type='password'
                                           value={this.state.confirmNewPassword} onChange={this.setConfirmNewPassword}/>
                                </td>
                                <td>
                                    <div className='ml-1'>
                                        {this.state.confirmNewPasswordInvalidReason}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-dark' onClick={this.resetPassword}
                            disabled={!this.enableResetPasswordButton()}>
                        Reset Password
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    renderDeleteAccount() {
        return (
            <Modal isOpen={this.state.deleteAccountOpen} toggle={this.deleteAccountToggle} size='md' centered={true}>
                <ModalHeader toggle={this.deleteAccountToggle}>
                    Permanently Delete Account
                </ModalHeader>
                <ModalBody>
                    <p>Are you sure you want to permanently delete your account, and all data associated with it?</p>
                </ModalBody>
                <ModalFooter>
                    <Button className='btn-danger' onClick={this.deleteAccount}>
                        Delete Account
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <React.Fragment>
                <Container fluid='lg' className='mt-5'>
                    <h4>Account Settings</h4>
                    <hr className='my-4'/>
                    <Row>
                        <Col xs='12'>
                            <h5>Username</h5>
                        </Col>
                        <Col xs='12'>
                            <input className='rounded-border w-25-md w-100-xs' type='text' value={this.state.username}
                                   onChange={this.setUsername}/>
                            <div className='ml-1'>
                                {this.state.usernameInvalidReason}
                            </div>
                        </Col>
                        <Col className='mt-2' xs='12'>
                            <h5>Email Address</h5>
                        </Col>
                        <Col xs='12'>
                            <input className='rounded-border w-25-md w-100-xs' type='text' value={this.state.email}
                                   onChange={this.setEmail}/>
                            <div className='ml-1'>
                                {this.state.emailInvalidReason}
                            </div>
                        </Col>
                        <Col className='mt-2' xs='12'>
                            <h5>Reset Password</h5>
                        </Col>
                        <Col xs='12'>
                            <Button className='btn-dark' size='sm' onClick={this.resetPasswordToggle}>
                                Click to reset password
                            </Button>
                        </Col>
                    </Row>
                    <hr className='my-4'/>
                    <Row>
                        <Col xs='12'>
                            <h5>Email Settings</h5>
                        </Col>
                        <Col className='mt-2' xs='12'>
                            <form>
                                <input name='newSubscriber' type='checkbox'
                                       checked={this.state.emailSettings.newSubscriber}
                                       onChange={this.handleEmailSettingsChange}/>
                                <label className='ml-1' >
                                    Send an email when someone subscribes to me
                                </label>
                                <br />
                                <input name='subscriptionWentLive' type='checkbox'
                                       checked={this.state.emailSettings.subscriptionWentLive}
                                       onChange={this.handleEmailSettingsChange}/>
                                <label className='ml-1' >
                                    Send an email when someone I am subscribed to goes live
                                </label>
                                <br />
                                <input name='subscriptionCreatedScheduledStream' type='checkbox'
                                       checked={this.state.emailSettings.subscriptionCreatedScheduledStream}
                                       onChange={this.handleEmailSettingsChange}/>
                                <label className='ml-1' >
                                    Send an email when someone I am subscribed to schedules a livestream
                                </label>
                                <br />
                                <label>Send an email when someone I am subscribed to has a stream scheduled to start:
                                    <select name='subscriptionScheduledStreamStartingIn' className='ml-1'
                                            value={this.state.emailSettings.subscriptionScheduledStreamStartingIn}
                                            onChange={this.handleEmailSettingsChange}>
                                        <option value={-1}>Never</option>
                                        <option value={10}>10 minutes before</option>
                                        <option value={30}>30 minutes before</option>
                                        <option value={60}>1 hour before</option>
                                        <option value={60 * 2}>2 hours before</option>
                                        <option value={60 * 6}>6 hours before</option>
                                        <option value={60 * 24}>1 day before</option>
                                    </select>
                                </label>
                            </form>
                        </Col>
                    </Row>
                    <hr className='my-4'/>
                    <Row>
                        <Col xs='12'>
                            <h5>Delete Account</h5>
                        </Col>
                        <Col className='mt-2' xs='12'>
                            <Button className='btn-danger' size='sm' onClick={this.deleteAccountToggle}>
                                Click to permanently delete account
                            </Button>
                        </Col>
                    </Row>
                    <hr className='my-4'/>
                    <div className='float-right mb-4'>
                        <Button className='btn-dark' size='lg' disabled={!this.enableSaveButton()}
                                onClick={this.saveSettings}>
                            Save Settings
                        </Button>
                    </div>
                </Container>

                {this.renderResetPassword()}
                {this.renderDeleteAccount()}
            </React.Fragment>
        );
    }

}