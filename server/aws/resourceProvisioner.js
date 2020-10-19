const sesTemplateCreator = require('./sesTemplateCreator');

// TODO: REPLACE THIS WITH CLOUDFORMATION TEMPLATE

module.exports.provisionResources = async () => {
    await sesTemplateCreator.createEmailTemplates();
}