module.exports = {
    siteTitle: 'Mainroom',
    headTitle: `Mainroom - Livestreaming for DJs, bands and artists`,
    server: {
        secret: 'kjVkuti2xAyF3JGCzSZTk0YWM5JhI9mgQW4rytXc',
        port: {
            http: 8080
        }
    },
    database: {
        uri: 'mongodb://127.0.0.1/mainroom'
    },
    rtmpServer: {
        rtmp: {
            port: 1935,
            chunk_size: 60000,
            gop_cache: true,
            ping: 60,
            ping_timeout: 30
        },
        http: {
            port: 8888,
            mediaroot: './server/media',
            allow_origin: '*'
        },
        trans: {
            ffmpeg: 'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
            tasks: [
                {
                    app: 'live',
                    hls: true,
                    hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                    dash: true,
                    dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
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
        thumbnailGenerator: '*/5 * * * * *'
    },
    storage: {
        thumbnails: 'server/thumbnails',
        sessions: 'server/sessions'
    }
};