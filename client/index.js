// needed for polyfilling ES2015 features
import 'regenerator-runtime/runtime';

import React, {Suspense, lazy} from 'react';
import {render} from 'react-dom';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import {LoadingSpinner} from './utils/displayUtils';
import MainroomNavbar from'./components/MainroomNavbar';
import LiveStreamsByGenre from './components/LiveStreamsByGenre';
import LiveStreamsByCategory from './components/LiveStreamsByCategory';
import Search from './components/Search';
import UserProfile from './components/UserProfile';
import Subscribers from './components/Subscribers';
import Subscriptions from './components/Subscriptions';
import LiveStream from './components/LiveStream';
import RecordedStream from './components/RecordedStream';
import './mainroom.scss';

// lazy load components that do not require props to be passed to them
const Home = lazy(() => import('./components/Home'));
const ManageRecordedStreams = lazy(() => import('./components/ManageRecordedStreams'));
const Schedule = lazy(() => import('./components/Schedule'));
const Settings = lazy(() => import('./components/Settings'));
const GoLive = lazy(() => import('./components/GoLive'));
const FourOhFour = lazy(() => import('./components/FourOhFour'));

if (document.getElementById('root')) {
    render(
        <BrowserRouter>
            <ErrorBoundary>
                <MainroomNavbar/>
                <Suspense fallback={<LoadingSpinner />}>
                    <Switch>
                        <Route exact path='/' component={Home}/>

                        <Route exact path='/genre/:genre' render={props => (
                            <LiveStreamsByGenre {...props} />
                        )}/>

                        <Route exact path='/category/:category' render={props => (
                            <LiveStreamsByCategory {...props} />
                        )}/>

                        <Route exact path='/search/:query' render={props => (
                            <Search {...props} />
                        )}/>

                        <Route exact path='/user/:username' render={props => (
                            <UserProfile {...props} />
                        )}/>

                        <Route exact path='/user/:username/subscribers' render={props => (
                            <Subscribers {...props} />
                        )}/>

                        <Route exact path='/user/:username/subscriptions' render={props => (
                            <Subscriptions {...props} />
                        )}/>

                        <Route exact path='/user/:username/live' render={props => (
                            <LiveStream {...props} />
                        )}/>

                        <Route exact path='/stream/:streamId' render={props => (
                            <RecordedStream {...props} />
                        )}/>

                        <Route exact path='/manage-recorded-streams' component={ManageRecordedStreams}/>
                        <Route exact path='/schedule' component={Schedule}/>
                        <Route exact path='/settings' component={Settings}/>
                        <Route exact path='/go-live' component={GoLive}/>

                        {/* matches none -> 404 */}
                        <Route component={FourOhFour}/>
                    </Switch>
                </Suspense>
            </ErrorBoundary>
        </BrowserRouter>,
        document.getElementById('root')
    );
}