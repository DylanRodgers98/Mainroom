const MILLION = 1000000;
const THOUSAND = 1000;
const HUNDRED = 100;

module.exports.shortenNumber = num => {
    if (num >= MILLION) {
        return addTwoDecimalPlacesIfNecessary(num / MILLION) + 'M';
    }
    if (num >= THOUSAND) {
        return addTwoDecimalPlacesIfNecessary(num / THOUSAND) + 'K';
    }
    return num;
}

function addTwoDecimalPlacesIfNecessary(num) {
    return Math.round((num + Number.EPSILON) * HUNDRED) / HUNDRED;
}