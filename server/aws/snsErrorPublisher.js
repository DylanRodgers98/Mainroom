const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns');
const {sns: {errorTopicArn}} = require('../../mainroom.config');

const SNS_CLIENT = new SNSClient({});

module.exports.publish = async errorToPublish => {
    if (process.env.NODE_ENV !== 'production') {
        // throw if non-production environment
        throw errorToPublish;
    }
    const publishCommand = new PublishCommand({
        TopicArn: errorTopicArn,
        Subject: `${errorToPublish.name} occurred in Mainroom ${process.env.NODE_ENV} environment`,
        Message: errorToPublish.toString()
    });
    const response = await SNS_CLIENT.send(publishCommand);
    if (!response.MessageId) {
        throw new Error(`No MessageId returned from SNSClient, so info about error will not be published. Original error: ${errorToPublish}`);
    }
};
