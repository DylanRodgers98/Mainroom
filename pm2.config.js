module.exports = {
    apps: [
        {
            script: './server/app.js',
            instances : '-1',
            exec_mode : 'cluster',
            name: 'mainroom',
            error_file: '/dev/null',
            out_file: '/dev/null',
            log_file: '/dev/null',
            env: {
                PM2_APP_NAME: 'mainroom'
            }
        },
        {
            script: './server/app.js',
            instances : '1',
            exec_mode : 'cluster',
            name: 'rtmpServer',
            error_file: '/dev/null',
            out_file: '/dev/null',
            log_file: '/dev/null',
            env: {
                PM2_APP_NAME: 'rtmpServer'
            }
        }
    ]
}
