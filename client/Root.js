import React from "react";
import {Route, Switch} from 'react-router-dom';
import Navbar from './Navbar';
import LiveStreams from './LiveStreams';
import LiveStreamsByGenre from "./LiveStreamsByGenre";
import LiveStreamsByCategory from "./LiveStreamsByCategory";
import Search from './Search';
import UserStream from './UserStream';
import StreamSettings from './StreamSettings';
import FourOhFour from "./FourOhFour";

export default class Root extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Navbar/>
                <Switch>
                    <Route exact path="/" render={props => (
                        <LiveStreams  {...props} />
                    )}/>

                    <Route exact path="/genre/:genre" render={props => (
                        <LiveStreamsByGenre  {...props} />
                    )}/>

                    <Route exact path="/category/:category" render={props => (
                        <LiveStreamsByCategory  {...props} />
                    )}/>

                    <Route exact path="/search/:query" render={props => (
                        <Search  {...props} />
                    )}/>

                    {/*TODO: ADD USER PROFILE ROUTE*/}
                    {/*<Route exact path="/user/:username" render={props => (*/}
                    {/*    <UserProfile {...props} />*/}
                    {/*)}/>*/}

                    <Route exact path="/user/:username/live" render={props => (
                        <UserStream {...props} />
                    )}/>

                    {/*TODO: ADD SCHEDULE PAGE ROUTE*/}
                    {/*<Route exact path="/schedule" render={props => (*/}
                    {/*    <Schedule {...props} />*/}
                    {/*)}/>*/}

                    <Route exact path="/settings" render={props => (
                        <StreamSettings {...props} />
                    )}/>

                    {/* matches none -> 404 */}
                    <Route component={FourOhFour}/>
                </Switch>
            </div>
        )
    }
}