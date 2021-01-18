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
                    app: 'live',
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
        scheduledStreamInfoUpdater: '* * * * *',
        upcomingScheduledStreamEmailer: '* * * * *'
    },
    storage: {
        thumbnails: {
            ttl: 30 * 1000 // 30 seconds
        },
        scheduledStream: {
            ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        passwordResetToken: {
            ttl: 10 * 60 * 1000 // 10 minutes
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
                newSubscriber: 'newSubscriber',
                subscriptionWentLive: 'subscriptionWentLive',
                subscriptionCreatedScheduledStream: 'subscriptionCreatedScheduledStream',
                subscriptionScheduledStreamStartingIn: 'subscriptionScheduledStreamStartingIn',
                resetPassword: 'resetPassword'
            }
        }
    },
    rateLimiter: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100
    },
    filters: {
        genres: [
            "Drum & Bass",
            "Techno",
            "Bassline"
        ],
        categories: [
            "DJ Set",
            "Live Set",
            "Production",
            "Tutorial",
            "Q&A"
        ]
    }
};