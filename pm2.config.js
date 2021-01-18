module.exports = {
    apps: [{
        script: './server/app.js',
        instances : '-1',
        exec_mode : 'cluster',
        log_file: '~/.pm2/logs/mainroom.log',
        merge_logs: true
    }]
}
