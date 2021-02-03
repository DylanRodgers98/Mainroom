const {CronTime} = require('cron');
const config = require('../../../mainroom.config');
const {sleep} = require('../../testUtils');
const moment = require('moment');

const STARTING_IN = 60;
const USERNAME = 'foo';
const DISPLAY_NAME = 'bar';
const EMAIL = 'foo@bar.com';

const mockStream = {
    user: {_id: 0},
    startTime: new Date(2020, 8, 17, 16),
    endTime: new Date(2020, 8, 17, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set'
};

const mockNonSubscribedStream = {
    user: {_id: 1},
    startTime: moment().add(STARTING_IN, 'minutes').add(30, 'seconds'), // offset by some time later than cron job trigger
    endTime: moment().add(STARTING_IN, 'minutes').add(1, 'hour'),
    title: 'Another Test Stream',
    genre: 'Techno',
    category: 'Production'
}

const mockUser = {
    username: USERNAME,
    displayName: DISPLAY_NAME,
    email: EMAIL,
    emailSettings: {
        subscriptionScheduledStreamStartingIn: STARTING_IN
    },
    nonSubscribedScheduledStreams: [mockNonSubscribedStream]
};

const expectedUserData = {
    email: EMAIL,
    displayName: DISPLAY_NAME,
    username: USERNAME
};

const expectedStreams = [mockStream, mockNonSubscribedStream];

jest.mock('../../../server/model/schemas', () => {
    return {
        User: {
            find: () => {
                return {
                    select: () => {
                        return {
                            populate: () => {
                                return {
                                    exec: () => [mockUser]
                                }
                            }
                        }
                    }
                }
            }
        },
        ScheduledStream: {
            find: () => {
                return {
                    select: () => {
                        return {
                            populate: () => {
                                return {
                                    exec: () => [mockStream]
                                }
                            }
                        }
                    }
                }
            }
        }
    };
});

const mockEmit = jest.fn();

jest.mock('../../../server/mainroomEventEmitter', () => {
    return {
        emit: mockEmit
    };
});

const originalEmailEnabled = config.email.enabled;
let job;

beforeAll(() => {
    config.email.enabled = true;
    job = require('../../../server/cron/upcomingScheduledStreamEmailer').job;
});

afterAll(() => {
    config.email.enabled = originalEmailEnabled;
});

describe('upcomingScheduledStreamEmailer', () => {
    it('should emit onScheduledStreamStartingSoon event from mainroomEventEmitter when cron job triggers', async() => {
        // given
        job.setTime(new CronTime('* * * * * *'));

        // when
        job.start();
        expect(job.running).toBe(true);
        await sleep(1000);

        // then
        job.stop();
        expect(mockEmit).toHaveBeenCalledWith('onScheduledStreamStartingSoon', expectedUserData, expectedStreams);
    });
});
