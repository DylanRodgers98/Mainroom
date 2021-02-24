const SITE_NAME = 'Mainroom';
const HEAD_TITLE = `${SITE_NAME} - Livestreaming for DJs, bands and artists`;

const SECOND = 1000;
const THIRTY_SECONDS = 30 * SECOND;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CRON_EVERY_MINUTE = '* * * * *';
const CRON_EVERY_HOUR = '0 * * * *';

const logger = require('./logger');

module.exports = {
    siteName: SITE_NAME,
    headTitle: HEAD_TITLE,
    rtmpServer: {
        host: process.env.RTMP_SERVER_HOST,
        logType: logger.resolveLogLevel(),
        rtmp: {
            port: process.env.RTMP_SERVER_RTMP_PORT,
            chunk_size: 60000,
            gop_cache: true,
            ping: 60,
            ping_timeout: 30
        },
        http: {
            port: process.env.RTMP_SERVER_HTTP_PORT,
            mediaroot: './server/media',
            allow_origin: '*'
        },
        trans: {
            ffmpeg: process.env.FFMPEG_PATH,
            tasks: [
                {
                    app: process.env.RTMP_SERVER_APP_NAME,
                    hls: true,
                    hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                    mp4: process.env.NODE_ENV === 'production',
                    mp4Flags: '[movflags=frag_keyframe+empty_moov]'
                }
            ]
        }
    },
    validation: {
        password: {
            minLength: 8,
            maxLength: 64,
            minLowercase: 1,
            minUppercase: 1,
            minNumeric: 1,
            minSpecialChars: 1,
            allowedSpecialChars: '-[]/{}()*+?.\\^$|~`!#%^&=;,\'":<>'
        }
    },
    cronTime: {
        scheduledStreamInfoUpdater: CRON_EVERY_MINUTE,
        upcomingScheduledStreamEmailer: CRON_EVERY_MINUTE,
        createdScheduledStreamsEmailer: CRON_EVERY_HOUR,
        newSubscribersEmailer: CRON_EVERY_HOUR,
        expiredScheduledStreamsRemover: CRON_EVERY_HOUR
    },
    storage: {
        thumbnails: {
            ttl: THIRTY_SECONDS
        },
        scheduledStream: {
            ttl: 14 * DAY
        },
        passwordResetToken: {
            ttl: 10 * MINUTE
        },
        s3: {
            staticContent: {
                bucketName: 'mainroom-static-content',
                keyPrefixes: {
                    profilePics: 'profile-pics',
                    streamThumbnails: 'stream-thumbnails'
                }
            },
            streams: {
                bucketName: 'mainroom-streams',
                keyPrefixes : {
                    recorded: 'recorded'
                }
            }
        }
    },
    pagination: {
        small: 6,
        large: 12
    },
    defaultProfilePicURL: 'https://mainroom-static-content.s3.amazonaws.com/default_profile_pic.png',
    defaultThumbnailURL: 'https://mainroom-static-content.s3.amazonaws.com/default_stream_thumbnail.png',
    email: {
        enabled: false,
        ses: {
            templateNames: {
                newSubscribers: 'newSubscribers',
                subscriptionWentLive: 'subscriptionWentLive',
                subscriptionsCreatedScheduledStreams: 'subscriptionsCreatedScheduledStreams',
                subscriptionScheduledStreamStartingIn: 'subscriptionScheduledStreamStartingIn',
                resetPassword: 'resetPassword'
            }
        }
    },
    rateLimiter: {
        windowMs: MINUTE,
        maxRequests: 100
    },
    filters: {
        genres: [
            "Drum & Bass",
            "Techno",
            "Bassline"
        ].sort(),
        categories: [
            "DJ Set",
            "Live Set",
            "Production",
            "Tutorial",
            "Q&A"
        ].sort()
    },
    loadLivestreamTimeout: 15 * SECOND,
    successMessageTimeout: 3 * SECOND,
    errorMessageTimeout: 8 * SECOND,
    bugReportURL: 'https://gitreports.com/issue/DylanRodgers98/Mainroom',
    chatColours: {
        aqua: "#00ffff",
        blue: "#0000ff",
        brown: "#a52a2a",
        cyan: "#00ffff",
        darkblue: "#00008b",
        darkcyan: "#008b8b",
        darkgreen: "#006400",
        darkkhaki: "#bdb76b",
        darkmagenta: "#8b008b",
        darkolivegreen: "#556b2f",
        darkorange: "#ff8c00",
        darkorchid: "#9932cc",
        darkred: "#8b0000",
        darksalmon: "#e9967a",
        darkviolet: "#9400d3",
        fuchsia: "#ff00ff",
        gold: "#ffd700",
        green: "#008000",
        indigo: "#4b0082",
        khaki: "#f0e68c",
        lightblue: "#add8e6",
        lightgreen: "#90ee90",
        lightpink: "#ffb6c1",
        lime: "#00ff00",
        magenta: "#ff00ff",
        maroon: "#800000",
        navy: "#000080",
        olive: "#808000",
        orange: "#ffa500",
        pink: "#ffc0cb",
        purple: "#800080",
        violet: "#800080",
        red: "#ff0000",
        yellow: "#ffff00"
    }
};