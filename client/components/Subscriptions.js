import React from "react";
import axios from 'axios';
import {Col, Container, Row} from "reactstrap";
import {Link} from "react-router-dom";

import defaultProfilePic from '../img/defaultProfilePic.png';

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscriptions: [],
            isProfileOfLoggedInUser: false,
            loaded: false
        }
    }

    componentDidMount() {
        this.isProfileOfLoggedInUser();
        this.getSubscriptions();
    }

    async isProfileOfLoggedInUser() {
        const res = await axios.get('/api/users/logged-in');
        this.setState({
            isProfileOfLoggedInUser: res.data.username === this.props.match.params.username,
        });
    }

    async getSubscriptions() {
        try {
            const res = await axios.get(`/api/users/${this.props.match.params.username}/subscriptions`);
            this.setState({
                subscriptions: res.data.subscriptions.map(subscription => {
                    return (
                        <Col>
                            <h5>
                                <Link to={`/user/${subscription.username}`}>
                                    {/*TODO: get profile pic through API call*/}
                                    <img src={defaultProfilePic} width='75' height='75' className='mr-3'
                                         alt={`${subscription.username} profile picture`}/>
                                    {subscription.username}
                                </Link>
                            </h5>
                        </Col>
                    );
                }),
                loaded: true
            });
        } catch (err) {
            if (err.response.status === 404) {
                window.location.href = '/404';
            } else {
                throw err;
            }
        }
    }

    render() {
        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscriptions</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                {this.state.subscriptions.length
                    ? <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscriptions}</Row>
                    : <p className='my-4 text-center'>{this.state.isProfileOfLoggedInUser ? 'You are '
                        : this.props.match.params.username + ' is'} not subscribed to anybody :(</p>}
            </Container>
        );
    }

}