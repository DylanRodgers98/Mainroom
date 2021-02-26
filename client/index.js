// needed for polyfilling ES2015 features
import 'regenerator-runtime/runtime';

import React, {Fragment, Suspense, lazy} from 'react';
import {render} from 'react-dom';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import {LoadingSpinner} from './utils/displayUtils';
import MainroomNavbar from'./components/MainroomNavbar';
import './mainroom.scss';

const Home = lazy(() => import('./components/Home'));
const LiveStreamsByGenre = lazy(() => import('./components/LiveStreamsByGenre'));
const LiveStreamsByCategory = lazy(() => import('./components/LiveStreamsByCategory'));
const Search = lazy(() => import('./components/Search'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Subscribers = lazy(() => import('./components/Subscribers'));
const Subscriptions = lazy(() => import('./components/Subscriptions'));
const LiveStream = lazy(() => import('./components/LiveStream'));
const RecordedStream = lazy(() => import('./components/RecordedStream'));
const ManageRecordedStreams = lazy(() => import('./components/ManageRecordedStreams'));
const Schedule = lazy(() => import('./components/Schedule'));
const Settings = lazy(() => import('./components/Settings'));
const GoLive = lazy(() => import('./components/GoLive'));
const FourOhFour = lazy(() => import('./components/FourOhFour'));

if (document.getElementById('root')) {
    render(
        <BrowserRouter>
            <Fragment>
                <MainroomNavbar/>
                <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                        <Switch>
                            <Route exact path='/' render={() => <Home />}/>
                            <Route exact path='/genre/:genre' render={props => <LiveStreamsByGenre {...props} />}/>
                            <Route exact path='/category/:category' render={props => <LiveStreamsByCategory {...props} />}/>
                            <Route exact path='/search/:query' render={props => <Search {...props} />}/>
                            <Route exact path='/user/:username' render={props => <UserProfile {...props} />}/>
                            <Route exact path='/user/:username/subscribers' render={props => <Subscribers {...props} />}/>
                            <Route exact path='/user/:username/subscriptions' render={props => <Subscriptions {...props} />}/>
                            <Route exact path='/user/:username/live' render={props => <LiveStream {...props} />}/>
                            <Route exact path='/stream/:streamId' render={props => <RecordedStream {...props} />}/>
                            <Route exact path='/manage-recorded-streams' render={() => <ManageRecordedStreams />}/>
                            <Route exact path='/schedule' render={() => <Schedule />}/>
                            <Route exact path='/settings' render={() => <Settings />}/>
                            <Route exact path='/go-live' render={() => <GoLive />}/>
                            {/* matches none -> 404 */}
                            <Route render={() => <FourOhFour />}/>
                        </Switch>
                    </Suspense>
                </ErrorBoundary>
            </Fragment>
        </BrowserRouter>,
        document.getElementById('root')
    );
}
