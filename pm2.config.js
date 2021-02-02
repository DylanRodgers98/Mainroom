module.exports = {
    apps: [
        {
            script: './server/app.js',
            instances : '1',
            exec_mode : 'cluster',
            name: 'primary',
            error_file: '/dev/null',
            out_file: '/dev/null',
            log_file: '/dev/null',
            env: {
                PM2_APP_NAME: 'primary'
            }
        },
        {
            script: './server/app.js',
            instances : '-1',
            exec_mode : 'cluster',
            name: 'replica',
            error_file: '/dev/null',
            out_file: '/dev/null',
            log_file: '/dev/null',
            env: {
                PM2_APP_NAME: 'replica'
            }
        }
    ]
}
