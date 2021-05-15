import React from 'react';
import {pagination, siteName} from '../../mainroom.config';
import axios from 'axios';
import {displayErrorMessage, getAlert, LoadingSpinner} from '../utils/displayUtils';
import {Button, Col, Container, Row, Spinner} from 'reactstrap';
import {Link} from 'react-router-dom';
import {formatDateRange} from '../utils/dateUtils';

const STARTING_PAGE = 1;

export default class Events extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            events: [],
            nextPage: STARTING_PAGE,
            showLoadMoreButton: false,
            showLoadMoreSpinner: false,
            alertText: '',
            alertColor: ''
        }
    }

    componentDidMount() {
        document.title = `Events - ${siteName}`;
        this.getEvents();
    }

    getEvents() {
        this.setState({showLoadMoreSpinner: true}, async () => {
            try {
                const res = await axios.get('/api/events', {
                    params: {
                        page: this.state.nextPage,
                        limit: pagination.large
                    }
                });
                this.setState({
                    events: [...this.state.events, ...(res.data.events || [])],
                    nextPage: res.data.nextPage,
                    showLoadMoreButton: !!res.data.nextPage,
                    loaded: true,
                    showLoadMoreSpinner: false
                });
            } catch (err) {
                this.setState({showLoadMoreSpinner: false});
                displayErrorMessage(this, `An error occurred when loading more events. Please try again later. (${err})`);
            }
        });
    }

    render() {
        const events = this.state.events.map((event, index) => (
            <Col className='stream margin-bottom-thick' key={index}>
                {event.isHappeningNow ? <span className='live-label'>LIVE</span> : undefined}
                <Link to={`/events/${event._id}`}>
                    <img className='w-100' src={event.thumbnailURL} alt={`${event.eventName} Event Thumbnail`}/>
                </Link>
                <table>
                    <tbody>
                    <tr>
                        <td className='w-100'>
                            <h5 className='text-break'>
                                <Link to={`/user/${event.createdBy.username}`}>
                                    {event.createdBy.username || event.createdBy.username}
                                </Link>
                                <span className='black-link'>
                                    <Link to={`/events/${event._id}`}>
                                        {` - ${event.eventName}`}
                                    </Link>
                                </span>
                            </h5>
                            <h6>
                                {formatDateRange({
                                    start: event.startTime,
                                    end: event.endTime
                                })}
                            </h6>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </Col>
        ));

        const eventBoxes = events.length ? (
            <Row xs='1' sm='1' md='2' lg='3' xl='3'>
                {events}
            </Row>
        ) : (
            <p className='my-4 text-center'>
                There are currently no upcoming events :(
            </p>
        );

        const loadMoreButton = !this.state.showLoadMoreButton ? undefined : (
            <div className='text-center my-4'>
                <Button className='btn-dark' onClick={this.getEvents}>
                    {this.state.showLoadMoreSpinner ? <Spinner size='sm' /> : undefined}
                    {this.state.showLoadMoreSpinner ? undefined : 'Load More'}
                </Button>
            </div>
        );

        return (
            <Container fluid='lg' className='mt-5'>
                {getAlert(this)}

                <Row>
                    <Col>
                        <h4>Events</h4>
                    </Col>
                </Row>
                <hr className='my-4'/>
                {!this.state.loaded ? (<LoadingSpinner />) : (
                    <React.Fragment>
                        {eventBoxes}
                        {loadMoreButton}
                    </React.Fragment>
                )}
            </Container>
        );
    }

}