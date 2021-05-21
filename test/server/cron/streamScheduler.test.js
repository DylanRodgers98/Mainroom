const {CronTime} = require('cron');
const {sleep} = require('../../testUtils');

const mockUserStream = {
    user: {_id: 0},
    startTime: new Date(2020, 8, 17, 16),
    endTime: new Date(2020, 8, 17, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set',
    tags: ['test', 'stream']
};

const mockEventStream = {
    user: {_id: 1},
    eventStage: {_id: 2},
    startTime: new Date(2020, 8, 17, 18),
    endTime: new Date(2020, 8, 17, 19),
    title: 'Test Event Stream',
    genre: 'Techno',
    category: 'Live Set',
    tags: ['event', 'stream']
};

const mockUserFindByIdAndUpdate = jest.fn();

const mockEventFindByIdAndUpdate = jest.fn();

jest.mock('../../../server/model/schemas', () => {
    return {
        ScheduledStream: {
            find: (query, callback) => callback(null, [mockUserStream, mockEventStream])
        },
        User: {
            findByIdAndUpdate: mockUserFindByIdAndUpdate
        },
        EventStage: {
            findByIdAndUpdate: mockEventFindByIdAndUpdate
        }
    };
});

const {job} = require('../../../server/cron/streamScheduler');

describe('streamScheduler', () => {
    it('should send update query to MongoDB when cron job triggers', async () => {
        // given
        job.setTime(new CronTime('* * * * * *'));

        // when
        job.start();
        expect(job.running).toBe(true);
        await sleep(1000);

        // then
        job.stop();

        expect(mockUserFindByIdAndUpdate.mock.calls[0][0]).toEqual(mockUserStream.user._id);
        expect(mockUserFindByIdAndUpdate.mock.calls[0][1]).toEqual({
            'streamInfo.title': mockUserStream.title,
            'streamInfo.genre': mockUserStream.genre,
            'streamInfo.category': mockUserStream.category,
            'streamInfo.tags': mockUserStream.tags
        });

        expect(mockEventFindByIdAndUpdate.mock.calls[0][0]).toEqual(mockEventStream.eventStage._id);
        expect(mockEventFindByIdAndUpdate.mock.calls[0][1]).toEqual({
            'streamInfo.title': mockEventStream.title,
            'streamInfo.genre': mockEventStream.genre,
            'streamInfo.category': mockEventStream.category,
            'streamInfo.tags': mockEventStream.tags
        });
    });
});
