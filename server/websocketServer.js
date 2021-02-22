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

    async start(callback) {
        // Register event listeners
        if (process.env.NODE_ENV === 'production') {
            // Send all messages to parent process in production environment.
            // This allows a clustered environment to share events
            process.on('message', process.send);

            try {
                // In production environment, listen for events from pm2 God process
                const bus = await launchPm2MessageBus();
                bus.on('liveStreamViewCount', ({data}) => emitLiveStreamViewCount(this.io, data));
                bus.on('onChatMessage', ({data}) => emitOnChatMessage(this.io, data));
                bus.on('onWentLive', ({data}) => emitOnWentLive(this.io, data));
                bus.on('onStreamEnded', ({data}) => emitOnStreamEnded(this.io, data));
                bus.on('streamInfoUpdated', ({data}) => emitStreamInfoUpdated(this.io, data));
            } catch (err) {
                LOGGER.error('An error occurred when launching pm2 message bus: {}', err);
                throw err;
            }
        } else {
            //In non-production environment, listen for events from MainroomEventBus
            mainroomEventBus.on('liveStreamViewCount', ({streamUsername, viewCount}) => {
                emitLiveStreamViewCount(this.io, {streamUsername, viewCount})
            });

            mainroomEventBus.on('onChatMessage', ({streamUsername, viewerUser, msg}) => {
                emitOnChatMessage(this.io, {streamUsername, viewerUser, msg});
            });

            mainroomEventBus.on('onWentLive', streamUsername => {
                emitOnWentLive(this.io, streamUsername);
            });

            mainroomEventBus.on('onStreamEnded', streamUsername => {
                emitOnStreamEnded(this.io, streamUsername);
            });

            mainroomEventBus.on('streamInfoUpdated', streamInfo => {
                emitStreamInfoUpdated(this.io, streamInfo);
            });
        }

        this.io.on('connection', (socket, next) => {
            // register listeners only if connection is from live stream page
            if (socket.request._query.liveStreamUsername) {
                const streamUsername = sanitise(socket.request._query.liveStreamUsername.toLowerCase());

                // increment view count on connection
                incrementViewCount(streamUsername, 1, next);

                // decrement view count on disconnection
                socket.on('disconnect', () => incrementViewCount(streamUsername, -1, next));

                // emit livestream chat message to correct channel
                socket.on('onChatMessage', ({viewerUser, msg}) => {
                    mainroomEventBus.send('onChatMessage', {streamUsername, viewerUser, msg});
                });
            }
        });

        if (callback) {
            callback();
        }
    }

}

function launchPm2MessageBus() {
    return new Promise((resolve, reject) => {
        pm2.launchBus((err, bus) => {
            if (err) {
                reject(err);
            } else {
                resolve(bus);
            }
        });
    });
}

function emitLiveStreamViewCount(io, {streamUsername, viewCount}) {
    io.emit(`liveStreamViewCount_${streamUsername}`, viewCount);
}

function emitOnChatMessage(io, {streamUsername, viewerUser, msg}) {
    io.emit(`onChatMessage_${streamUsername}`, {viewerUser, msg});
}

function emitOnWentLive(io, streamUsername) {
    io.emit(`onWentLive_${streamUsername}`);
}

function emitOnStreamEnded(io, streamUsername) {
    io.emit(`onStreamEnded_${streamUsername}`);
}

function emitStreamInfoUpdated(io, streamInfo) {
    const username = streamInfo.username;
    delete streamInfo.username;
    io.emit(`streamInfoUpdated_${username}`, streamInfo);
}

function incrementViewCount(username, increment, next) {
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
        } else {
            mainroomEventBus.send('liveStreamViewCount', {
                streamUsername: username,
                viewCount: user.streamInfo.viewCount
            });
        }
    });
}

module.exports.startWebSocketServer = async (httpServer, callback) => {
    const wsServer = new WebSocketServer(httpServer);
    await wsServer.start(callback);
}
