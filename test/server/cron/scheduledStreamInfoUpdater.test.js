const job = require('../../../server/cron/scheduledStreamInfoUpdater').job;
const {CronTime} = require('cron');

const mockStream = {
    user: {_id: 0},
    startTime: new Date(2020, 8, 17, 16),
    endTime: new Date(2020, 8, 17, 17),
    title: 'Test Stream',
    genre: 'Drum & Bass',
    category: 'DJ Set',
    tags: ['test', 'stream']
}

jest.mock('../../../server/database/schemas', () => {
    return {
        ScheduledStream: {
            find: jest.fn(async () => [mockStream])
        },
        User: {
            findByIdAndUpdate: jest.fn((id, update, callback) => {
                expect(id).toEqual(mockStream.user._id);
                expect(update).toEqual({
                    'streamInfo.title': mockStream.title,
                    'streamInfo.genre': mockStream.genre,
                    'streamInfo.category': mockStream.category,
                    'streamInfo.tags': mockStream.tags
                });
                callback();
            })
        }
    }
});

describe('scheduledStreamInfoUpdater', () => {
    it('should ', async () => {
        job.setTime(new CronTime('* * * * * *'));
        job.start();
        expect(job.running).toBe(true);
        await sleep(1000);
        job.stop();
    });
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}