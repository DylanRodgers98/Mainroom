import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import {ErrorBoundary} from 'react-error-boundary';
import {headTitle, bugReportURL} from '../mainroom.config';
import MainroomNavbar from './components/MainroomNavbar';
import Home from './components/Home';
import LiveStreamsByGenre from './components/LiveStreamsByGenre';
import LiveStreamsByCategory from './components/LiveStreamsByCategory';
import Search from './components/Search';
import UserProfile from './components/UserProfile';
import Subscribers from './components/Subscribers';
import Subscriptions from './components/Subscriptions';
import LiveStream from './components/LiveStream';
import RecordedStream from './components/RecordedStream';
import ManageRecordedStreams from './components/ManageRecordedStreams';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import GoLive from './components/GoLive';
import FourOhFour from './components/FourOhFour';
import './mainroom.scss';

document.title = headTitle;

function errorFallback({error, resetErrorBoundary}) {
    return (
        <div className='text-center mt-5'>
            <h2>Oops! An error occurred :(</h2>
            <h5>{error.name}: {error.message}</h5>
            Please <a href='javascript:;' onClick={resetErrorBoundary}>
                try again
            </a> or <a href={bugReportURL} target='_blank' rel='noopener noreferrer'>
                report a bug
            </a>.
        </div>
    );
}

if (document.getElementById('root')) {
    ReactDOM.render(
        <BrowserRouter>
            <React.Fragment>
                <MainroomNavbar/>
                <ErrorBoundary FallbackComponent={errorFallback}>
                    <Switch>
                        <Route exact path='/' render={props => (
                            <Home {...props} />
                        )}/>

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

                        <Route exact path='/manage-recorded-streams' render={props => (
                            <ManageRecordedStreams {...props} />
                        )}/>

                        <Route exact path='/schedule' render={props => (
                            <Schedule {...props} />
                        )}/>

                        <Route exact path='/settings' render={props => (
                            <Settings {...props} />
                        )}/>

                        <Route exact path='/go-live' render={props => (
                            <GoLive {...props} />
                        )}/>

                        {/* matches none -> 404 */}
                        <Route component={FourOhFour}/>
                    </Switch>
                </ErrorBoundary>
            </React.Fragment>
        </BrowserRouter>,
        document.getElementById('root')
    );
}