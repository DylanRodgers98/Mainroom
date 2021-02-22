import moment from 'moment';

const YEAR_IN_SECONDS = 31536000;
const MONTH_IN_SECONDS = 2592000;
const DAY_IN_SECONDS = 86400;
const HOUR_IN_SECONDS = 3600;
const MINUTE_IN_SECONDS = 60;

const TIME_FORMAT = 'HH:mm';
export const LONG_DATE_FORMAT = `ddd, DD MMM, yyyy · ${TIME_FORMAT}`;

export const convertUTCToLocal = date => moment.utc(date).local();
export const convertLocalToUTC = date => moment(date).utc();

export const timeSince = date => {
    const diffInSeconds = Math.floor((moment().valueOf() / 1000) - (convertUTCToLocal(date).valueOf()) / 1000);

    let interval = diffInSeconds / YEAR_IN_SECONDS;
    if (interval >= 1) {
        return pluraliseTimeAgo(Math.floor(interval), 'year');
    }

    interval = diffInSeconds / MONTH_IN_SECONDS;
    if (interval >= 1) {
        return pluraliseTimeAgo(Math.floor(interval), 'month');
    }

    interval = diffInSeconds / DAY_IN_SECONDS;
    if (interval >= 1) {
        return pluraliseTimeAgo(Math.floor(interval), 'day');
    }

    interval = diffInSeconds / HOUR_IN_SECONDS;
    if (interval >= 1) {
        return pluraliseTimeAgo(Math.floor(interval), 'hour');
    }

    interval = diffInSeconds / MINUTE_IN_SECONDS;
    if (interval >= 1) {
        return pluraliseTimeAgo(Math.floor(interval), 'minute');
    }

    return pluraliseTimeAgo(Math.floor(diffInSeconds), 'second');
};

const pluraliseTimeAgo = (value, singularMeasurement) => {
    return `${value} ${singularMeasurement}${value === 1 ? '' : 's'} ago`;
}

export const formatDate = timestamp => convertUTCToLocal(timestamp).format(LONG_DATE_FORMAT);

const formatTime = timestamp => convertUTCToLocal(timestamp).format(TIME_FORMAT);

const isSameDay = (firstTimestamp, secondTimestamp) => {
    return moment(firstTimestamp).isSame(moment(secondTimestamp), 'day');
};

export const formatDateRange = ({start, end}) => {
    const startFormatted = formatDate(start);
    const endFormatted = isSameDay(start, end) ? `-${formatTime(end)}` : ` - ${formatDate(end)}`;
    return `${startFormatted}${endFormatted}`;
}
