const {CronTime} = require('cron');
const {sleep} = require('../../testUtils');

const MOCK_STREAM_ID = 1;
const MOCK_STREAM = {_id: MOCK_STREAM_ID};

const mockFindByIdAndDelete = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('../../../server/model/schemas', () => {
    return {
        ScheduledStream: {
            find: () => {
                return {
                    select: () => {
                        return {
                            exec: () => [MOCK_STREAM]
                        };
                    }
                };
            },
            findByIdAndDelete: mockFindByIdAndDelete
        },
        User: {
            updateMany: mockUpdateMany
        }
    };
});

const {job} = require('../../../server/cron/expiredScheduledStreamsRemover');

describe('expiredScheduledStreamsRemover', () => {
    it('should send delete queries to MongoDB when cron job triggers', async () => {
        // given
        job.setTime(new CronTime('* * * * * *'));

        // when
        job.start();
        expect(job.running).toBe(true);
        await sleep(1000);

        // then
        job.stop();
        expect(mockUpdateMany.mock.calls[0][0]).toEqual({nonSubscribedScheduledStreams: MOCK_STREAM_ID});
        expect(mockUpdateMany.mock.calls[0][1]).toEqual({$pull: {nonSubscribedScheduledStreams: MOCK_STREAM_ID}});
        expect(mockFindByIdAndDelete).toHaveBeenCalledWith(MOCK_STREAM_ID);
    });
});