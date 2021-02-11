const config = require('../../mainroom.config');
const { SES } = require('@aws-sdk/client-ses');
const LOGGER = require('../../logger')('./server/aws/sesTemplateCreator.js');

const SES_CLIENT = new SES({});

// TODO: REPLACE THIS WITH CLOUDFORMATION TEMPLATE

module.exports.createEmailTemplates = async () => {
    if (config.email.enabled) {
        LOGGER.info('Creating email templates');
        await createNewSubscriberTemplateTemplate();
        await createSubscriptionWentLiveTemplate();
        await createSubscriptionCreatedScheduledStreamTemplate();
        await createSubscriptionScheduledStreamStartingInTemplate();
    }
}

async function createNewSubscriberTemplateTemplate() {
    await createEmailTemplate({
        TemplateName: config.email.ses.templateNames.newSubscribers,
        TemplateContent: {
            Subject: '{{subscriber.displayName}} subscribed to you on Mainroom',
            Text: `Hey {{user.displayName}},\r\n{{subscriber.displayName}} just subscribed to you on Mainroom!\r\nCheck out their profile: https://${process.env.SERVER_HOST}/user/{{subscriber.username}}`,
            Html: '' //TODO: ADD HTML EMAIL CONTENT
        }
    });
}

async function createSubscriptionWentLiveTemplate() {
    await createEmailTemplate({
        TemplateName: config.email.ses.templateNames.subscriptionWentLive,
        TemplateContent: {
            Subject: '{{user.displayName}} just went live on Mainroom',
            Text: `Hey {{subscriber.displayName}},\r\n{{user.displayName}} just went live on Mainroom!\\r\\nWatch the stream now: https://${process.env.SERVER_HOST}/user/{{user.username}}/live`,
            Html: '' //TODO: ADD HTML EMAIL CONTENT
        }
    });
}

async function createSubscriptionCreatedScheduledStreamTemplate() {
    await createEmailTemplate({
        TemplateName: config.email.ses.templateNames.subscriptionsCreatedScheduledStreams,
        TemplateContent: {
            Subject: '{{user.displayName}} just scheduled a livestream on Mainroom',
            Text: `Hey {{subscriber.displayName}},\r\n{{user.displayName}} just scheduled {{#if stream.title}}{{stream.title}}{{else}}a stream{{/if}} on Mainroom from {{stream.startTime}} until {{stream.endTime}}`,
            Html: '' //TODO: ADD HTML EMAIL CONTENT
        }
    });
}

async function createSubscriptionScheduledStreamStartingInTemplate() {
    await createEmailTemplate({
        TemplateName: config.email.ses.templateNames.subscriptionScheduledStreamStartingIn,
        TemplateContent: {
            Subject: 'Users you are subscribed to have scheduled streams starting soon on Mainroom',
            Text: `Hey {{user.displayName}},\r\nThe following streams are starting soon on Mainroom:\r\n{{#each s}} • {{s.user.displayName}}{{#if s.stream.title}} - {{s.stream.title}}{{else}}'s stream{{/if}} is scheduled to start from {{s.stream.startTime}} until {{s.stream.endTime}}\r\n`,
            Html: '' //TODO: ADD HTML EMAIL CONTENT
        }
    });
}

async function createEmailTemplate(template) {
    try {
        LOGGER.info(`Creating '{}' email template`, template.TemplateName);
        await SES_CLIENT.createTemplate(template);
        LOGGER.info(`'{}' email template created`, template.TemplateName);
    } catch (err) {
        if (err.code === 'AlreadyExists') {
            LOGGER.info(`'{}' email template already exists`, template.TemplateName);
        } else {
            LOGGER.error(`An error occurred when creating '{}' email template: {}`, template.TemplateName, err);
            throw err;
        }
    }
}