const config = require('../../mainroom.config');
const sesEmailSender = require('../../server/aws/sesEmailSender');

const originalEmailEnabled = config.email.enabled;

beforeAll(() => {
    config.email.enabled = true;
});

afterAll(() => {
    config.email.enabled = originalEmailEnabled;
});

describe('EmailEventEmitter', () => {
    // TODO: split into separate tests, figure out why passing individually but not as a suite
    it('should call sesEmailSender functions on receiving events', () => {
        // spies
        const onNewSubscriberSpy = jest.spyOn(sesEmailSender, 'notifyUserOfNewSubscriber');
        const onWentLiveSpy = jest.spyOn(sesEmailSender, 'notifySubscribersUserWentLive');
        const onCreateScheduledStreamSpy = jest.spyOn(sesEmailSender, 'notifySubscribersUserCreatedScheduledStream');
        const onScheduledStreamStartingSoonSpy = jest.spyOn(sesEmailSender, 'notifyUserOfSubscriptionsStreamsStartingSoon');

        //given
        const user = { subscribers: [] };
        const subscriber = 'foo';
        const stream = 'bar';
        const streams = [stream];

        // when
        const emailEventEmitter = require('../../server/emailEventEmitter');
        emailEventEmitter.emit('onNewSubscriber', user, subscriber);
        emailEventEmitter.emit('onWentLive', user);
        emailEventEmitter.emit('onCreateScheduledStream', user, stream);
        emailEventEmitter.emit('onScheduledStreamStartingSoon', user, streams);

        // then
        expect(onNewSubscriberSpy).toHaveBeenCalledWith(user, subscriber);
        expect(onWentLiveSpy).toHaveBeenCalledWith(user);
        expect(onCreateScheduledStreamSpy).toHaveBeenCalledWith(user, stream);
        expect(onScheduledStreamStartingSoonSpy).toHaveBeenCalledWith(user, streams);
    });
});