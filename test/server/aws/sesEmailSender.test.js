const {overrideEnvironmentVariables} = require('../../testUtils');

const USER_WITH_DISPLAY_NAME_1 = {
    email: 'hasDisplayName1@email.com',
    displayName: 'Test Display Name 1',
    username: 'testUsername1',
    getProfilePicURL: () => 'testUsername1/profilePic.jpg'
};

const USER_WITH_DISPLAY_NAME_2 = {
    email: 'hasDisplayName2@email.com',
    displayName: 'Test Display Name 2',
    username: 'testUsername2',
    getProfilePicURL: () => 'testUsername2/profilePic.jpg'
};

const USER_WITHOUT_DISPLAY_NAME_1 = {
    email: 'hasNoDisplayName1@email.com',
    username: 'testUsername3',
    getProfilePicURL: () => 'testUsername3/profilePic.jpg'
};

const USER_WITHOUT_DISPLAY_NAME_2 = {
    email: 'hasNoDisplayName2@email.com',
    username: 'testUsername4',
    getProfilePicURL: () => 'testUsername4/profilePic.jpg'
};

const PASSWORD_RESET_TOKEN = 'blahblahblah';
const ERROR = new Error();

const MOCK_SES_CLIENT_SEND = jest.fn();
const MOCK_SEND_TEMPLATED_EMAIL_COMMAND = jest.fn();
const MOCK_SEND_BULK_TEMPLATED_EMAIL_COMMAND = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
    SESClient: jest.fn(() => ({
        send: MOCK_SES_CLIENT_SEND
    })),
    SendTemplatedEmailCommand: MOCK_SEND_TEMPLATED_EMAIL_COMMAND,
    SendBulkTemplatedEmailCommand: MOCK_SEND_BULK_TEMPLATED_EMAIL_COMMAND
}));

const MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME = 'testNewSubscribers';
const MOCK_RESET_PASSWORD_TEMPLATE_NAME = 'testResetPassword';
const MOCK_WELCOME_NEW_USER_TEMPLATE_NAME = 'testWelcomeNewUser';
const MOCK_SITE_NAME = 'Mainroom Test';

jest.mock('../../../mainroom.config', () => ({
    email: {
        ses: {
            templateNames: {
                newSubscribers: MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME,
                resetPassword: MOCK_RESET_PASSWORD_TEMPLATE_NAME,
                welcomeNewUser: MOCK_WELCOME_NEW_USER_TEMPLATE_NAME
            }
        }
    },
    siteName: MOCK_SITE_NAME
}));

const MOCK_SNS_ERROR_PUBLISHER_PUBLISH = jest.fn();

jest.mock('../../../server/aws/snsErrorPublisher', () => ({
    publish: MOCK_SNS_ERROR_PUBLISHER_PUBLISH
}));

const NO_REPLY_EMAIL = 'test@email.com';
const EXPECTED_SOURCE = `${MOCK_SITE_NAME} <${NO_REPLY_EMAIL}>`;

overrideEnvironmentVariables({NO_REPLY_EMAIL}).beforeAll();

beforeEach(() => jest.clearAllMocks());

describe('sesEmailSender', () => {
    describe('notifyUserOfNewSubscribers', () => {
        it("should send email using user's display name and subscriber's display name", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const subscribers = [USER_WITH_DISPLAY_NAME_2]

            // when
            await sesEmailSender.notifyUserOfNewSubscribers(USER_WITH_DISPLAY_NAME_1, subscribers);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITH_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITH_DISPLAY_NAME_1.displayName,
                        username: USER_WITH_DISPLAY_NAME_1.username
                    },
                    newSubscribers: [{
                        displayName: USER_WITH_DISPLAY_NAME_2.displayName,
                        username: USER_WITH_DISPLAY_NAME_2.username,
                        profilePicURL: USER_WITH_DISPLAY_NAME_2.getProfilePicURL()
                    }]
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it("should send email using user's username and subscriber's display name", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const subscribers = [USER_WITH_DISPLAY_NAME_1]

            // when
            await sesEmailSender.notifyUserOfNewSubscribers(USER_WITHOUT_DISPLAY_NAME_1, subscribers);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITHOUT_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITHOUT_DISPLAY_NAME_1.username,
                        username: USER_WITHOUT_DISPLAY_NAME_1.username
                    },
                    newSubscribers: [{
                        displayName: USER_WITH_DISPLAY_NAME_1.displayName,
                        username: USER_WITH_DISPLAY_NAME_1.username,
                        profilePicURL: USER_WITH_DISPLAY_NAME_1.getProfilePicURL()
                    }]
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it("should send email using user's display name and subscriber's username", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const subscribers = [USER_WITHOUT_DISPLAY_NAME_1]

            // when
            await sesEmailSender.notifyUserOfNewSubscribers(USER_WITH_DISPLAY_NAME_1, subscribers);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITH_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITH_DISPLAY_NAME_1.displayName,
                        username: USER_WITH_DISPLAY_NAME_1.username
                    },
                    newSubscribers: [{
                        displayName: USER_WITHOUT_DISPLAY_NAME_1.username,
                        username: USER_WITHOUT_DISPLAY_NAME_1.username,
                        profilePicURL: USER_WITHOUT_DISPLAY_NAME_1.getProfilePicURL()
                    }]
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it("should send email using user's username and subscriber's username", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const subscribers = [USER_WITHOUT_DISPLAY_NAME_2]

            // when
            await sesEmailSender.notifyUserOfNewSubscribers(USER_WITHOUT_DISPLAY_NAME_1, subscribers);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITHOUT_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_NEW_SUBSCRIBERS_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITHOUT_DISPLAY_NAME_1.username,
                        username: USER_WITHOUT_DISPLAY_NAME_1.username
                    },
                    newSubscribers: [{
                        displayName: USER_WITHOUT_DISPLAY_NAME_2.username,
                        username: USER_WITHOUT_DISPLAY_NAME_2.username,
                        profilePicURL: USER_WITHOUT_DISPLAY_NAME_2.getProfilePicURL()
                    }]
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it('should publish error to SNS when one is thrown', async () => {
            // given
            MOCK_SES_CLIENT_SEND.mockRejectedValueOnce(ERROR);
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const subscribers = [USER_WITHOUT_DISPLAY_NAME_2]

            // when
            await sesEmailSender.notifyUserOfNewSubscribers(USER_WITHOUT_DISPLAY_NAME_1, subscribers);

            // then
            expect(MOCK_SNS_ERROR_PUBLISHER_PUBLISH).toHaveBeenCalledWith(ERROR);
        });
    });

    describe('notifySubscribersUserWentLive', () => {

    });

    describe('notifyUserSubscriptionsCreatedScheduledStreams', () => {

    });

    describe('notifyUserOfSubscriptionsStreamsStartingSoon', () => {

    });

    describe('sendResetPasswordEmail', () => {
        it("should send email using user's display name", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');

            // when
            await sesEmailSender.sendResetPasswordEmail(USER_WITH_DISPLAY_NAME_1, PASSWORD_RESET_TOKEN);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITH_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_RESET_PASSWORD_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITH_DISPLAY_NAME_1.displayName
                    },
                    token: PASSWORD_RESET_TOKEN
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it("should send email using user's username", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');

            // when
            await sesEmailSender.sendResetPasswordEmail(USER_WITHOUT_DISPLAY_NAME_1, PASSWORD_RESET_TOKEN);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [USER_WITHOUT_DISPLAY_NAME_1.email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_RESET_PASSWORD_TEMPLATE_NAME,
                TemplateData: JSON.stringify({
                    user: {
                        displayName: USER_WITHOUT_DISPLAY_NAME_1.username
                    },
                    token: PASSWORD_RESET_TOKEN
                })
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it('should publish error to SNS when one is thrown', async () => {
            // given
            MOCK_SES_CLIENT_SEND.mockRejectedValueOnce(ERROR);
            const sesEmailSender = require('../../../server/aws/sesEmailSender');

            // when
            await sesEmailSender.sendResetPasswordEmail(USER_WITHOUT_DISPLAY_NAME_1, PASSWORD_RESET_TOKEN);

            // then
            expect(MOCK_SNS_ERROR_PUBLISHER_PUBLISH).toHaveBeenCalledWith(ERROR);
        });
    });

    describe('sendWelcomeEmail', () => {
        it("should send email", async () => {
            // given
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const email = USER_WITH_DISPLAY_NAME_1.email;
            const username = USER_WITH_DISPLAY_NAME_1.username;

            // when
            await sesEmailSender.sendWelcomeEmail(email, username);

            // then
            expect(MOCK_SEND_TEMPLATED_EMAIL_COMMAND.mock.calls[0][0]).toStrictEqual({
                Destination: {
                    ToAddresses: [email]
                },
                Source: EXPECTED_SOURCE,
                Template: MOCK_WELCOME_NEW_USER_TEMPLATE_NAME,
                TemplateData: JSON.stringify({username})
            });
            expect(MOCK_SES_CLIENT_SEND).toHaveBeenCalledTimes(1);
        });

        it('should publish error to SNS when one is thrown', async () => {
            // given
            MOCK_SES_CLIENT_SEND.mockRejectedValueOnce(ERROR);
            const sesEmailSender = require('../../../server/aws/sesEmailSender');
            const email = USER_WITH_DISPLAY_NAME_1.email;
            const username = USER_WITH_DISPLAY_NAME_1.username;

            // when
            await sesEmailSender.sendWelcomeEmail(email, username);

            // then
            expect(MOCK_SNS_ERROR_PUBLISHER_PUBLISH).toHaveBeenCalledWith(ERROR);
        });
    });
});