const config = require('../../mainroom.config');

const user = {
    _id: 0,
    username: 'user',
    displayName: 'foo',
    email: 'foo@bar.com'
};

const subscriber1 = {
    _id: 1,
    username: 'subscriber1',
    displayName: 'bar',
    email: 'bar@foo.com'
};

const subscriber2 = {
    _id: 2,
    username: 'subscriber2',
    displayName: 'hello',
    email: 'hello@world.com'
};

const subscribers = [subscriber1, subscriber2];

const stream1 = {
    user: {_id: 2},
    startTime: new Date(2021, 2, 4, 16),
    endTime: new Date(2021, 2, 4, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set'
};

const stream2 = {
    user: {_id: 3},
    startTime: new Date(2021, 2, 4, 18),
    endTime: new Date(2021, 2, 4, 19),
    title: 'Another Test Stream',
    genre: 'Techno',
    category: 'Production'
};

const streams = [stream1, stream2];

const mockNotifyUserOfNewSubscribers = jest.fn();
const mockNotifySubscribersUserWentLive = jest.fn();
const mockNotifyUserSubscriptionsCreatedScheduledStreams = jest.fn();
const mockNotifyUserOfSubscriptionsStreamsStartingSoon = jest.fn();

jest.mock('../../server/aws/sesEmailSender', () => {
    return {
        notifyUserOfNewSubscribers: mockNotifyUserOfNewSubscribers,
        notifySubscribersUserWentLive: mockNotifySubscribersUserWentLive,
        notifyUserSubscriptionsCreatedScheduledStreams: mockNotifyUserSubscriptionsCreatedScheduledStreams,
        notifyUserOfSubscriptionsStreamsStartingSoon: mockNotifyUserOfSubscriptionsStreamsStartingSoon
    };
});

const originalEmailEnabled = config.email.enabled;
let mainroomEventEmitter;

beforeAll(() => {
    config.email.enabled = true;
    mainroomEventEmitter = require('../../server/mainroomEventEmitter');
});

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    config.email.enabled = originalEmailEnabled;
});

describe('MainroomEventEmitter', () => {
    it('should call sesEmailSender.notifyUserOfNewSubscribers() on emission onNewSubscriber event', () => {
        mainroomEventEmitter.emit('onNewSubscribers', user, subscribers);
        expect(mockNotifyUserOfNewSubscribers).toHaveBeenCalledWith(user, subscribers);
    });

    it('should call sesEmailSender.notifySubscribersUserWentLive() on emission onWentLive event', () => {
        mainroomEventEmitter.emit('onWentLive', user);
        expect(mockNotifySubscribersUserWentLive).toHaveBeenCalledWith(user);
    });

    it('should call sesEmailSender.notifyUserSubscriptionsCreatedScheduledStreams() on emission onSubscribersCreatedScheduledStreams event', () => {
        mainroomEventEmitter.emit('onSubscribersCreatedScheduledStreams', user, streams);
        expect(mockNotifyUserSubscriptionsCreatedScheduledStreams).toHaveBeenCalledWith(user, streams);
    });

    it('should call sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon() on emission onScheduledStreamStartingSoon event', () => {
        mainroomEventEmitter.emit('onScheduledStreamStartingSoon', user, streams);
        expect(mockNotifyUserOfSubscriptionsStreamsStartingSoon).toHaveBeenCalledWith(user, streams);
    });
});