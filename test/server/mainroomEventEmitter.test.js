const config = require('../../mainroom.config');

const user = 'hello';
const subscriber = 'world';
const stream = 'foo';
const streams = 'bar';

const mockNotifyUserOfNewSubscriber = jest.fn();
const mockNotifySubscribersUserWentLive = jest.fn();
const mockNotifySubscribersUserCreatedScheduledStream = jest.fn();
const mockNotifyUserOfSubscriptionsStreamsStartingSoon = jest.fn();

jest.mock('../../server/aws/sesEmailSender', () => {
    return {
        notifyUserOfNewSubscriber: mockNotifyUserOfNewSubscriber,
        notifySubscribersUserWentLive: mockNotifySubscribersUserWentLive,
        notifySubscribersUserCreatedScheduledStream: mockNotifySubscribersUserCreatedScheduledStream,
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

    it('should call sesEmailSender.notifySubscribersUserCreatedScheduledStream() on emission onCreateScheduledStream event', () => {
        mainroomEventEmitter.emit('onCreateScheduledStream', user, stream);
        expect(mockNotifySubscribersUserCreatedScheduledStream).toHaveBeenCalledWith(user, stream);
    });

    it('should call sesEmailSender.notifyUserOfSubscriptionsStreamsStartingSoon() on emission onScheduledStreamStartingSoon event', () => {
        mainroomEventEmitter.emit('onScheduledStreamStartingSoon', user, streams);
        expect(mockNotifyUserOfSubscriptionsStreamsStartingSoon).toHaveBeenCalledWith(user, streams);
    });
});