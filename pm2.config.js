module.exports = {
    apps: [{
        script: './server/app.js',
        instances : 'max',
        exec_mode : 'cluster',
        log_file: '~/.pm2/logs/mainroom.log',
        merge_logs: true
    }]
}
