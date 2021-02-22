const socketIO = require('socket.io');
const pm2 = require('pm2');
const mainroomEventBus = require('./mainroomEventBus');
const {User} = require('./model/schemas');
const sanitise = require('mongo-sanitize');
const LOGGER = require('../logger')('./server/websocketServer.js');

class WebSocketServer {

    constructor(httpServer) {
        this.io = socketIO(httpServer);
    }

    start(callback) {
        // Register event listeners
        if (process.env.NODE_ENV === 'production') {
            // Send all messages to parent process in production environment. This allows a clustered environment to share events
            process.on('message', process.send);

            // In production environment, listen for events from pm2 God process
            pm2.launchBus((err, bus) => {
                bus.on('liveStreamViewCount', packet => {
                    this.io.emit(`liveStreamViewCount_${packet.data.username}`, packet.data.viewCount);
                });

                bus.on('onSendChatMessage', packet => {
                    this.io.emit(`onReceiveChatMessage_${packet.data.streamUsername}`, {
                        viewerUser: packet.data.viewerUser,
                        msg: packet.data.msg
                    });
                });

                bus.on('onWentLive', packet => {
                    this.io.emit(`onWentLive_${packet.data}`);
                });

                bus.on('onStreamEnded', packet => {
                    this.io.emit(`onStreamEnded_${packet.data}`);
                });
            });
        } else {
            //In non-production environment, listen for events from MainroomEventBus

            mainroomEventBus.on('onWentLive', streamUsername => {
                this.io.emit(`onWentLive_${streamUsername}`);
            });

            mainroomEventBus.on('onStreamEnded', streamUsername => {
                this.io.emit(`onStreamEnded_${streamUsername}`);
            });
        }

        this.io.on('connection', (socket, next) => {
            // register listeners only if connection is from live stream page
            if (socket.request._query.liveStreamUsername) {
                const streamUsername = sanitise(socket.request._query.liveStreamUsername.toLowerCase());

                // increment view count on connection
                incrementViewCount(this.io, streamUsername, 1, next);

                // decrement view count on disconnection
                socket.on('disconnect', () => {
                    incrementViewCount(this.io, streamUsername, -1, next);
                });

                // emit livestream chat message to correct channel
                socket.on(`onSendChatMessage`, ({viewerUser, msg}) => {
                    if (process.env.NODE_ENV === 'production') {
                        // in production environment, send event to pm2 God process so it can notify all child processes
                        mainroomEventBus.sendToGodProcess('onSendChatMessage', {streamUsername, viewerUser, msg});
                    } else {
                        // in non-production environment, emit message in current process
                        this.io.emit(`onReceiveChatMessage_${streamUsername}`, {viewerUser, msg});
                    }
                });
            }
        });

        function incrementViewCount(io, username, increment, next) {
            const $inc = {'streamInfo.viewCount': increment}
            if (increment > 0) {
                $inc['streamInfo.cumulativeViewCount'] = increment;
            }
            User.findOneAndUpdate({username}, {$inc}, {new: true}, (err, user) => {
                if (err) {
                    LOGGER.error(`An error occurred when updating user {}'s live stream view count: {}`, username, err);
                    next(err);
                } else if (!user) {
                    LOGGER.error('User (username: {}) not found', username, err);
                    next(new Error(`User (username: ${username}) not found`));
                } else if (process.env.NODE_ENV === 'production') {
                    // in production environment, send event to pm2 God process so it can notify all child processes
                    mainroomEventBus.sendToGodProcess('liveStreamViewCount', {
                        username,
                        viewCount: user.streamInfo.viewCount
                    });
                } else {
                    // in non-production environment, emit view count in current process
                    io.emit(`liveStreamViewCount_${username}`, user.streamInfo.viewCount);
                }
            });
        }

        if (callback) {
            callback();
        }
    }

}

module.exports.startWebSocketServer = (httpServer, callback) => {
    const wsServer = new WebSocketServer(httpServer);
    wsServer.start(callback);
}