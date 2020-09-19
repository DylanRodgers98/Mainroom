import React from "react";
import axios from 'axios';
import Container from "reactstrap/es/Container";
import {Button} from "reactstrap";
import {Redirect} from "react-router-dom";

export default class EditProfile extends React.Component {

    constructor(props) {
        super(props);

        this.setDisplayName = this.setDisplayName.bind(this);
        this.setLocation = this.setLocation.bind(this);
        this.setBio = this.setBio.bind(this);
        this.addLink = this.addLink.bind(this);
        this.setLinkTitle = this.setLinkTitle.bind(this);
        this.setLinkUrl = this.setLinkUrl.bind(this);
        this.saveProfile = this.saveProfile.bind(this);

        this.state = {
            unsavedChanges: false,
            redirectToProfile: false,
            username: '',
            displayName: '',
            location: '',
            bio: '',
            links: [],
            indexesOfInvalidLinks: []
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

    setLinkTitle(event, index) {
        const links = this.state.links;
        links[index].title = event.target.value;
        this.setState({
            links: links,
            unsavedChanges: true
        });
    }

    setLinkUrl(event, index) {
        const links = this.state.links;
        links[index].url = event.target.value;
        this.setState({
            links: links,
            unsavedChanges: true
        });
    }

    async saveProfile() {
        if (await this.areLinksValid()) {
            this.fixLinkProtocols();
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
    }

    async areLinksValid() {
        let isValid = true;
        const indexesOfInvalidLinks = this.state.links.map((link, i) => {
            if (!(link.title && link.url)) {
                isValid = false;
                return i;
            }
        });
        this.setState({
            indexesOfInvalidLinks: indexesOfInvalidLinks
        });
        return isValid;
    }

    fixLinkProtocols() {
        const links = this.state.links.map(link => {
            if (!link.url.includes('://')) {
                link.url = 'https://' + link.url;
            }
            return link;
        });
        this.setState({
            links: links
        });
    }

    renderRedirectToProfile() {
        if (this.state.redirectToProfile) {
            return <Redirect to={`/user/${this.state.username}`}/>;
        }
    }

    addLink() {
        this.setState({
            links: [...this.state.links, {
                title: '',
                url: ''
            }]
        });
    }

    removeLink(index) {
        const links = this.state.links;
        links.splice(index, 1);
        this.setState({
            links: links,
            unsavedChanges: true
        });
    }

    renderLinks() {
        let headers;
        if (this.state.links.length) {
            headers = (
                <tr>
                    <td>Title:</td>
                    <td>URL:</td>
                </tr>
            );
        }

        const links = this.state.links.map((link, i) => (
            <tr>
                <td>
                    <input className="mt-1" type="text" value={link.title} onChange={e => this.setLinkTitle(e, i)}/>
                </td>
                <td>
                    <input className="mt-1" type="text" value={link.url} onChange={e => this.setLinkUrl(e, i)} size={40}/>
                </td>
                <td>
                    <Button className="btn-dark mt-1 ml-1" size="sm" onClick={() => this.removeLink(i)}>
                        Remove Link
                    </Button>
                </td>
                <td>
                    <div className='ml-1'>
                        {this.state.indexesOfInvalidLinks.includes(i) ? 'Link must have a title and a URL' : ''}
                    </div>
                </td>
            </tr>
        ));

        return (
            <React.Fragment>
                {headers}
                {links}
            </React.Fragment>
        );
    }

    render() {
        return (
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
                                    <input type="text" value={this.state.displayName} onChange={this.setDisplayName}/>
                                </td>
                            </tr>
                        </table>
                    </tr>
                    <tr>
                        <td>
                            <h5 className="mt-1 mr-3">Location:</h5>
                        </td>
                        <table>
                            <tr>
                                <td>
                                    <input className="mt-1" type="text" value={this.state.location}
                                           onChange={this.setLocation}/>
                                </td>
                            </tr>
                        </table>
                    </tr>
                    <tr>
                        <td valign='top'>
                            <h5 className="mt-1">Bio:</h5>
                        </td>
                        <td>
                            <textarea className="mt-1" value={this.state.bio} onChange={this.setBio}/>
                        </td>
                    </tr>
                </table>
                <h5 className="mt-1">Links:</h5>
                <hr/>
                <table>
                    {this.renderLinks()}
                    <tr>
                        <td>
                            <Button className="btn-dark mt-2" size="sm" onClick={this.addLink}>
                                Add Link
                            </Button>
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
        );
    }

}