const {CronTime} = require('cron');
const {sleep} = require('../../testUtils');

const mockStream = {
    user: {_id: 0},
    startTime: new Date(2020, 8, 17, 16),
    endTime: new Date(2020, 8, 17, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set',
    tags: ['test', 'stream']
}

const mockFindByIdAndUpdate = jest.fn((update, options, callback) => callback());

jest.mock('../../../server/model/schemas', () => {
    return {
        ScheduledStream: {
            find: (query, callback) => callback(null, [mockStream])
        },
        User: {
            findByIdAndUpdate: mockFindByIdAndUpdate
        }
    }
});

const {job} = require('../../../server/cron/scheduledStreamInfoUpdater');

describe('scheduledStreamInfoUpdater', () => {
    it('should send update query to MongoDB when cron job triggers', async () => {
        // given
        job.setTime(new CronTime('* * * * * *'));

        // when
        job.start();
        expect(job.running).toBe(true);
        await sleep(1000);

        // then
        job.stop();
        expect(mockFindByIdAndUpdate.mock.calls[0][0]).toEqual(mockStream.user._id);
        expect(mockFindByIdAndUpdate.mock.calls[0][1]).toEqual({
            'streamInfo.title': mockStream.title,
            'streamInfo.genre': mockStream.genre,
            'streamInfo.category': mockStream.category,
            'streamInfo.tags': mockStream.tags
        });
    });
});
