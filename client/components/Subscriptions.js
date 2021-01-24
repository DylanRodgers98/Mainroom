import React from 'react';
import axios from 'axios';
import {Button, Col, Container, Row} from 'reactstrap';
import {Link} from 'react-router-dom';
import config from '../../mainroom.config';

const STARTING_PAGE = 1;

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscriptions: [],
            nextPage: STARTING_PAGE,
            showLoadMoreButton: false,
            isProfileOfLoggedInUser: false,
            loaded: false
        }
    }

    componentDidMount() {
        this.isProfileOfLoggedInUser();
        this.getSubscriptions();
    }

    async isProfileOfLoggedInUser() {
        const res = await axios.get('/logged-in-user');
        this.setState({
            isProfileOfLoggedInUser: res.data.username === this.props.match.params.username,
        });
    }

    async getSubscriptions() {
        try {
            const res = await axios.get(`/api/users/${this.props.match.params.username}/subscriptions`, {
                params: {
                    page: this.state.nextPage,
                    limit: config.pagination.large
                }
            });
            const subscriptions = res.data.subscriptions.map((subscription, index) => (
                <div key={index}>
                    <Col>
                        <h5>
                            <Link to={`/user/${subscription.username}`}>
                                <img src={subscription.profilePicURL} width='75' height='75'
                                     alt={`${subscription.username} profile picture`} className='mr-3 rounded-circle'/>
                                {subscription.username}
                            </Link>
                        </h5>
                    </Col>
                </div>
            ));
            this.setState({
                subscriptions: [...this.state.subscriptions, ...subscriptions],
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
        const subscriptions = this.state.subscriptions.length
            ? <Row xs='1' sm='2' md='2' lg='3' xl='3'>{this.state.subscriptions}</Row>
            : <p className='my-4 text-center'>{this.state.isProfileOfLoggedInUser ? 'You are '
                : this.props.match.params.username + ' is'} not subscribed to anybody :(</p>;

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={async () => await this.getSubscriptions()}>
                    Load More
                </Button>
            </div>
        );

        return !this.state.loaded ? <h1 className='text-center mt-5'>Loading...</h1> : (
            <Container fluid='lg' className='my-5'>
                <Row>
                    <Col>
                        <h4>{this.props.match.params.username}'s Subscriptions</h4>
                    </Col>
                </Row>
                <hr className='mt-4'/>
                {subscriptions}
                {loadMoreButton}
            </Container>
        );
    }

}