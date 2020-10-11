import React from "react";
import axios from 'axios';
import {Col, Container, Row} from "reactstrap";
import {Link} from "react-router-dom";
import config from "../../mainroom.config";
import {Button} from "react-bootstrap";

const STARTING_PAGE = 1;

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscribers: [],
            nextPage: STARTING_PAGE,
            showLoadMoreButton: false,
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
        try {
            const res = await axios.get(`/api/users/${this.props.match.params.username}/subscribers`, {
                params: {
                    page: this.state.nextPage,
                    limit: config.pagination.limit
                }
            });
            const subscribers = res.data.subscribers.map(subscriber => {
                return (
                    <Col>
                        <h5>
                            <Link to={`/user/${subscriber.username}`}>
                                <img src={subscriber.profilePicURL} width='75' height='75' className='mr-3'
                                     alt={`${subscriber.username} profile picture`}/>
                                {subscriber.username}
                            </Link>
                        </h5>
                    </Col>
                );
            });
            this.setState({
                subscribers: [...this.state.subscribers, ...subscribers],
                nextPage: res.data.nextPage,
                showLoadMoreButton: !!res.data.nextPage,
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
        const subscribers = this.state.subscribers.length
            ? <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscribers}</Row>
            : <p className='my-4 text-center'>{this.state.isProfileOfLoggedInUser ? 'You have '
                : this.props.match.params.username + ' has'} no subscribers :(</p>;

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={async () => await this.getSubscribers()}>
                    Load More
                </Button>
            </div>
        );

        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscribers</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                {subscribers}
                {loadMoreButton}
            </Container>
        );
    }

}