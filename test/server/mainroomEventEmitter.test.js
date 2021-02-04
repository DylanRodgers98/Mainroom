const config = require('../../mainroom.config');

const user = {
    _id: 0,
    username: 'user',
    displayName: 'foo',
    email: 'foo@bar.com'
}

const subscriber = {
    _id: 1,
    username: 'subscriber',
    displayName: 'bar',
    email: 'bar@foo.com'
}

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

const mockNotifyUserOfNewSubscriber = jest.fn();
const mockNotifySubscribersUserWentLive = jest.fn();
const mockNotifyUserSubscriptionsCreatedScheduledStreams = jest.fn();
const mockNotifyUserOfSubscriptionsStreamsStartingSoon = jest.fn();

jest.mock('../../server/aws/sesEmailSender', () => {
    return {
        notifyUserOfNewSubscriber: mockNotifyUserOfNewSubscriber,
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
    it('should call sesEmailSender.notifyUserOfNewSubscriber() on emission onNewSubscriber event', () => {
        mainroomEventEmitter.emit('onNewSubscriber', user, subscriber);
        expect(mockNotifyUserOfNewSubscriber).toHaveBeenCalledWith(user, subscriber);
    });

    it('should call sesEmailSender.notifySubscribersUserWentLive() on emission onWentLive event', () => {
        mainroomEventEmitter.emit('onWentLive', user);
        expect(mockNotifySubscribersUserWentLive).toHaveBeenCalledWith(user);
    });

    it('should call sesEmailSender.notifySubscribersUserCreatedScheduledStream() on emission onSubscribersCreatedScheduledStreams event', () => {
        mainroomEventEmitter.emit('onSubscribersCreatedScheduledStreams', user, streams);
        expect(mockNotifyUserSubscriptionsCreatedScheduledStreams).toHaveBeenCalledWith(user, streams);
    });

    it('should call sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon() on emission onScheduledStreamStartingSoon event', () => {
        mainroomEventEmitter.emit('onScheduledStreamStartingSoon', user, streams);
        expect(mockNotifyUserOfSubscriptionsStreamsStartingSoon).toHaveBeenCalledWith(user, streams);
    });
});