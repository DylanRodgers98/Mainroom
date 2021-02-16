const SECOND = 1000;
const THIRTY_SECONDS = 30 * SECOND;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CRON_EVERY_MINUTE = '* * * * *';
const CRON_EVERY_HOUR = '0 * * * *';

const logger = require('./logger');

module.exports = {
    siteTitle: 'Mainroom',
    headTitle: `Mainroom - Livestreaming for DJs, bands and artists`,
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
    cron: {
        scheduledStreamInfoUpdater: CRON_EVERY_MINUTE,
        upcomingScheduledStreamEmailer: CRON_EVERY_MINUTE,
        createdScheduledStreamsEmailer: CRON_EVERY_HOUR,
        newSubscribersEmailer: CRON_EVERY_HOUR
    },
    storage: {
        thumbnails: {
            ttl: THIRTY_SECONDS
        },
        scheduledStream: {
            ttl: 7 * DAY
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
    alertTimeout: 3 * SECOND,
    bugReportURL: 'https://gitreports.com/issue/DylanRodgers98/Mainroom'
};