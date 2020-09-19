import React from "react";
import axios from 'axios';
import {Col, Container, Row} from "reactstrap";
import {Link} from "react-router-dom";

import defaultProfilePic from '../img/defaultProfilePic.png';

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscriptions: []
        }
    }

    componentDidMount() {
        axios.get('/users/subscriptions', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
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
                })
            });
        });
    }

    render() {
        return (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscriptions</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscriptions}</Row>
            </Container>
        );
    }

}