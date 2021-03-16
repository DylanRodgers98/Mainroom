const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns');
const {sns: {errorTopicArn}} = require('../../mainroom.config');

const SNS_CLIENT = new SNSClient({});

module.exports.publish = async errorToPublish => {
    const params = new PublishCommand({
        TopicArn: errorTopicArn,
        Subject: `${errorToPublish.name} occurred in Mainroom ${process.env.NODE_ENV} environment`,
        Message: errorToPublish.toString()
    });
    const response = await SNS_CLIENT.send(params);
    if (!response.MessageId) {
        throw new Error('No MessageId returned from SNSClient, indicating message was not saved and will not be sent');
    }
};
