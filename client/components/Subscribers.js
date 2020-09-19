import React from "react";
import axios from 'axios';
import {Col, Container, DropdownToggle, Row} from "reactstrap";
import {Link} from "react-router-dom";

import defaultProfilePic from '../img/defaultProfilePic.png';

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscribers: []
        }
    }

    componentDidMount() {
        axios.get('/users/subscribers', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
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
                })
            });
        });
    }

    render() {
        return (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscribers</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscribers}</Row>
            </Container>
        );
    }

}