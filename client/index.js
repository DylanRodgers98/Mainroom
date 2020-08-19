import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import config from '../mainroom.config';
import Navbar from "./components/Navbar";
import LiveStreams from "./components/LiveStreams";
import LiveStreamsByGenre from "./components/LiveStreamsByGenre";
import LiveStreamsByCategory from "./components/LiveStreamsByCategory";
import Search from "./components/Search";
import UserProfile from "./components/UserProfile";
import Subscribers from "./components/Subscribers";
import UserStream from "./components/UserStream";
import Schedule from "./components/Schedule";
import GoLive from "./components/GoLive";
import FourOhFour from "./components/FourOhFour";
import './css/index.scss';

document.title = config.headTitle;

if (document.getElementById('root')) {
    ReactDOM.render(
        <BrowserRouter>
            <React.Fragment>
                <Navbar/>
                <Switch>
                    {/*TODO: condense the three LiveStreams (and potentially Search) components below into one component and pass in property for ALL/GENRE/CATEGORY*/}
                    <Route exact path="/" render={props => (
                        <LiveStreams {...props} />
                    )}/>

                    <Route exact path="/genre/:genre" render={props => (
                        <LiveStreamsByGenre {...props} />
                    )}/>

                    <Route exact path="/category/:category" render={props => (
                        <LiveStreamsByCategory {...props} />
                    )}/>

                    <Route exact path="/search/:query" render={props => (
                        <Search {...props} />
                    )}/>

                    <Route exact path="/user/:username" render={props => (
                        <UserProfile {...props} />
                    )}/>

                    <Route exact path="/user/:username/subscribers" render={props => (
                        <Subscribers {...props} />
                    )}/>

                    <Route exact path="/user/:username/live" render={props => (
                        <UserStream {...props} />
                    )}/>

                    <Route exact path="/schedule" render={props => (
                        <Schedule {...props} />
                    )}/>

                    {/*TODO: ADD SUBSCRIPTIONS ROUTE*/}
                    {/*<Route exact path="/subscriptions" render={props => (*/}
                    {/*    <Subscriptions {...props} />*/}
                    {/*)}/>*/}

                    {/*TODO: ADD SETTINGS ROUTE*/}
                    {/*<Route exact path="/settings" render={props => (*/}
                    {/*    <Settings {...props} />*/}
                    {/*)}/>*/}

                    <Route exact path="/go-live" render={props => (
                        <GoLive {...props} />
                    )}/>

                    {/* matches none -> 404 */}
                    <Route component={FourOhFour}/>
                </Switch>
            </React.Fragment>
        </BrowserRouter>,
        document.getElementById('root')
    );
}