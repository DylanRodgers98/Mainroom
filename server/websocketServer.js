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

    async start() {
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
            mainroomEventBus.on('liveStreamViewCount', viewCountData => {
                emitLiveStreamViewCount(this.io, viewCountData);
            });

            mainroomEventBus.on('onChatMessage', chatMessageData => {
                emitOnChatMessage(this.io, chatMessageData);
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
            if (socket.handshake.query.liveStreamUsername) {
                const streamUsername = sanitise(socket.handshake.query.liveStreamUsername.toLowerCase());

                // increment view count on connection
                socket.on(`onConnection_${streamUsername}`, () => {
                    incrementViewCount(streamUsername, 1, next);
                });

                // decrement view count on disconnection
                socket.on('disconnect', () => {
                    incrementViewCount(streamUsername, -1, next)
                });

                // emit livestream chat message to correct channel
                socket.on('onChatMessage', ({viewerUser, msg}) => {
                    mainroomEventBus.send('onChatMessage', {streamUsername, viewerUser, msg});
                });
            }
        });
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

async function incrementViewCount(username, increment, next) {
    const $inc = {'streamInfo.viewCount': increment}
    if (increment > 0) {
        $inc['streamInfo.cumulativeViewCount'] = increment;
    }
    try {
        const user = await User.findOneAndUpdate({username}, {$inc}, {new: true});
        if (!user) {
            const msg = `Could not find user (username: ${username}) to update view count`;
            LOGGER.error(msg);
            return next(new Error(msg));
        }
        mainroomEventBus.send('liveStreamViewCount', {
            streamUsername: username,
            viewCount: user.streamInfo.viewCount
        });
    } catch (err) {
        LOGGER.error(`An error occurred when updating live stream view count for user (username: {}): {}`, username, err);
        next(err);
    }
}

module.exports.startWebSocketServer = async httpServer => {
    const wsServer = new WebSocketServer(httpServer);
    await wsServer.start();
}
