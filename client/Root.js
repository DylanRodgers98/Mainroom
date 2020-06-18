import React from "react";
import {Router, Route} from 'react-router-dom';
import Navbar from './Navbar';
import LiveStreams from './LiveStreams';
import Settings from './Settings';
import UserStream from './UserStream';

const browserHistory = require("history").createBrowserHistory();

export default class Root extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Router history={browserHistory}>
                <div>
                    <Navbar/>
                    <Route exact path="/" render={props => (
                        <LiveStreams  {...props} />
                    )}/>

                    <Route exact path="/genre/:genre" render={(props) => (
                        <LiveStreams  {...props} />
                    )}/>

                    <Route exact path="/user/:username" render={(props) => (
                        <UserStream {...props}/>
                    )}/>

                    <Route exact path="/settings" render={props => (
                        <Settings {...props} />
                    )}/>
                </div>
            </Router>
        )
    }
}