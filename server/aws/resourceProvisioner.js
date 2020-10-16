const sesTemplateCreator = require('./sesTemplateCreator');

module.exports.provisionResources = async () => {
    await sesTemplateCreator.createEmailTemplates();
}