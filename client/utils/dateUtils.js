import moment from 'moment';

const YEAR_IN_SECONDS = 31536000;
const MONTH_IN_SECONDS = 2592000;
const DAY_IN_SECONDS = 86400;
const HOUR_IN_SECONDS = 3600;
const MINUTE_IN_SECONDS = 60;

export const timeSince = date => {
    const diffInSeconds = Math.floor((new Date().getTime() / 1000) - (new Date(date).getTime()) / 1000);

    let interval = diffInSeconds / YEAR_IN_SECONDS;
    if (interval >= 1) {
        return Math.floor(interval) + ' years ago';
    }

    interval = diffInSeconds / MONTH_IN_SECONDS;
    if (interval >= 1) {
        return Math.floor(interval) + ' months ago';
    }

    interval = diffInSeconds / DAY_IN_SECONDS;
    if (interval >= 1) {
        return Math.floor(interval) + ' days ago';
    }

    interval = diffInSeconds / HOUR_IN_SECONDS;
    if (interval >= 1) {
        return Math.floor(interval) + ' hours ago';
    }

    interval = diffInSeconds / MINUTE_IN_SECONDS;
    if (interval >= 1) {
        return Math.floor(interval) + ' minutes ago';
    }

    return Math.floor(diffInSeconds) + ' seconds ago';
};

export const formatDate = timestamp => moment(timestamp).format('ddd, DD MMM, yyyy · HH:mm');

export const formatTime = timestamp => moment(timestamp).format('HH:mm');