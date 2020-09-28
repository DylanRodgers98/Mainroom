import React from "react";
import axios from 'axios';
import {Col, Container, Row} from "reactstrap";
import {Link} from "react-router-dom";

import defaultProfilePic from '../img/defaultProfilePic.png';

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscribers: [],
            isProfileOfLoggedInUser: false,
            loaded: false
        }
    }

    componentDidMount() {
        this.isProfileOfLoggedInUser();
        this.getSubscribers();
    }

    async isProfileOfLoggedInUser() {
        const res = await axios.get('/api/users/logged-in');
        this.setState({
            isProfileOfLoggedInUser: res.data.username === this.props.match.params.username,
        });
    }

    async getSubscribers() {
        const res = await axios.get(`/api/users/${this.props.match.params.username}/subscribers`);
        this.setState({
            subscribers: res.data.subscribers.map(subscriber => {
                return (
                    <Col>
                        <h5>
                            <Link to={`/user/${subscriber.username}`}>
                                {/*TODO: get profile pic through API call*/}
                                <img src={defaultProfilePic} width='75' height='75' className='mr-3'
                                     alt={`${subscriber.username} profile picture`}/>
                                {subscriber.username}
                            </Link>
                        </h5>
                    </Col>
                );
            }),
            loaded: true
        });
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscribers</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                {this.state.subscribers.length
                    ? <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscribers}</Row>
                    : <p className='my-4 text-center'>{this.state.isProfileOfLoggedInUser ? 'You have '
                        : this.props.match.params.username + ' has'} no subscribers :(</p>}
            </Container>
        );
    }

}