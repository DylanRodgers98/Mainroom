import {overrideEnvironmentVariables} from '../../testUtils';

const ERROR = new Error();

const mockPublishCommand = jest.fn();
const mockSnsSend = jest.fn(() => ({
    MessageId: 'foo'
}));

jest.mock('@aws-sdk/client-sns', () => ({
    PublishCommand: mockPublishCommand,
    SNSClient: jest.fn(() => ({
        send: mockSnsSend
    }))
}));

const snsErrorPublisher = require('../../../server/aws/snsErrorPublisher');

describe('snsErrorPublisher', () => {
    describe('publish', () => {
        it('should throw error if NODE_ENV is not set to production', async () => {
            await overrideEnvironmentVariables({NODE_ENV: 'development'}).andDo(() => {
                const callToPublisher = async () => await snsErrorPublisher.publish(ERROR);
                expect(callToPublisher).rejects.toThrowError(ERROR);
                expect(mockSnsSend).not.toHaveBeenCalled();
            });
        });

        it('should publish error to SNS topic', async () => {
            await overrideEnvironmentVariables({NODE_ENV: 'production'}).andDo(async () => {
                await snsErrorPublisher.publish(ERROR);
                const publishCommandArgs = mockPublishCommand.mock.calls[0][0];
                expect(publishCommandArgs.Message).toEqual(ERROR.stack);
                expect(mockSnsSend).toHaveBeenCalledTimes(1);
            });
        });
    });
});