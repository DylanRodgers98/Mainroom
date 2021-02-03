const {CronTime} = require('cron');
const config = require('../../../mainroom.config');
const {sleep} = require('../../testUtils');

const mockUser = {
    username: 'foo',
    displayName: 'bar',
    email: 'foo@bar.com',
    emailSettings: {
        subscriptionScheduledStreamStartingIn: 60
    }
};

const mockStreams = [{
    user: {_id: 0},
    startTime: new Date(2020, 8, 17, 16),
    endTime: new Date(2020, 8, 17, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set',
    tags: ['test', 'stream']
}];

jest.mock('../../../server/model/schemas', () => {
    return {
        User: {
            find: () => {
                return {
                    select: () => {
                        return {
                            exec: () => [mockUser]
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
                                    exec: () => mockStreams
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
        const userData = {
            email: mockUser.email,
            displayName: mockUser.displayName,
            username: mockUser.username
        };
        expect(mockEmit).toHaveBeenCalledWith('onScheduledStreamStartingSoon', userData, mockStreams);
    });
});
