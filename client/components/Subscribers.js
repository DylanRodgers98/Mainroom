import React from "react";
import axios from 'axios';
import {Container} from "reactstrap";
import {Link} from "react-router-dom";

export default class Subscribers extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            subscribers: []
        }
    }

    componentDidMount() {
        axios.get('/user/subscribers', {
            params: {
                username: this.props.match.params.username
            }
        }).then(res => {
            this.setState({
                subscribers: res.data.subscribers
            });
        });
    }

    render() {
        const subscribers = this.state.subscribers.map(subscriber => {
            return (
                <h3>
                    <Link to={`/user/${subscriber.username}`}>
                        {subscriber.username}
                    </Link>
                </h3>
            );
        });

        return (
            <Container>
                {subscribers}
            </Container>
        );
    }

}