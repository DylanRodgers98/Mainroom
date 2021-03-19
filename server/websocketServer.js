const socketIO = require('socket.io');
const pm2 = require('pm2');
const mainroomEventBus = require('./mainroomEventBus');
const {User} = require('./model/schemas');
const sanitise = require('mongo-sanitize');
const snsErrorPublisher = require('./aws/snsErrorPublisher');
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
                bus.on('chatMessage', ({data}) => emitOnChatMessage(this.io, data));
                bus.on('streamStarted', ({data}) => emitOnWentLive(this.io, data));
                bus.on('streamEnded', ({data}) => emitOnStreamEnded(this.io, data));
                bus.on('streamInfoUpdated', ({data}) => emitStreamInfoUpdated(this.io, data));
            } catch (err) {
                LOGGER.error('An error occurred when launching pm2 message bus: {}', `${err.toString()}\n${err.stack}`);
                await snsErrorPublisher.publish(err);
            }
        } else {
            //In non-production environment, listen for events from MainroomEventBus
            mainroomEventBus.on('liveStreamViewCount', viewCountData => {
                emitLiveStreamViewCount(this.io, viewCountData);
            });

            mainroomEventBus.on('chatMessage', chatMessageData => {
                emitOnChatMessage(this.io, chatMessageData);
            });

            mainroomEventBus.on('streamStarted', streamUsername => {
                emitOnWentLive(this.io, streamUsername);
            });

            mainroomEventBus.on('streamEnded', streamUsername => {
                emitOnStreamEnded(this.io, streamUsername);
            });

            mainroomEventBus.on('streamInfoUpdated', streamInfo => {
                emitStreamInfoUpdated(this.io, streamInfo);
            });
        }

        this.io.on('connection', socket => {
            // register listeners only if connection is from live stream page
            if (socket.handshake.query.liveStreamUsername) {
                const streamUsername = sanitise(socket.handshake.query.liveStreamUsername.toLowerCase());

                let didIncrementViewCount = false;

                // increment view count on connection
                socket.on(`connection_${streamUsername}`, () => {
                    incrementViewCount(streamUsername);
                    didIncrementViewCount = true;
                });

                // decrement view count on disconnection
                socket.on('disconnect', () => {
                    if (didIncrementViewCount) {
                        decrementViewCount(streamUsername);
                    }
                });

                // emit livestream chat message to correct channel
                socket.on('chatMessage', ({viewerUser, msg}) => {
                    mainroomEventBus.send('chatMessage', {streamUsername, viewerUser, msg});
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
    io.emit(`chatMessage_${streamUsername}`, {viewerUser, msg});
}

function emitOnWentLive(io, streamUsername) {
    io.emit(`streamStarted_${streamUsername}`);
}

function emitOnStreamEnded(io, streamUsername) {
    io.emit(`streamEnded_${streamUsername}`);
}

function emitStreamInfoUpdated(io, streamInfo) {
    const username = streamInfo.username;
    delete streamInfo.username;
    io.emit(`streamInfoUpdated_${username}`, streamInfo);
}

async function incrementViewCount(username) {
    await incViewCount(username, 1);
}

async function decrementViewCount(username) {
    await incViewCount(username, -1);
}

async function incViewCount(username, increment) {
    const $inc = {'streamInfo.viewCount': increment}
    if (increment > 0) {
        $inc['streamInfo.cumulativeViewCount'] = increment;
    }
    const options = {
        new: true,
        runValidators: true // run 'min: 0' validators on viewCount and cumulativeViewCount
    };
    try {
        const user = await User.findOneAndUpdate({username}, {$inc}, options);
        if (!user) {
            throw new Error(`Could not find user (username: ${username}) to update view count`);
        }
        mainroomEventBus.send('liveStreamViewCount', {
            streamUsername: username,
            viewCount: user.streamInfo.viewCount
        });
    } catch (err) {
        LOGGER.error(`An error occurred when updating live stream view count for user (username: {}): {}`,
            username, `${err.toString()}\n${err.stack}`);
        await snsErrorPublisher.publish(err);
    }
}

module.exports.startWebSocketServer = async httpServer => {
    const wsServer = new WebSocketServer(httpServer);
    await wsServer.start();
}
