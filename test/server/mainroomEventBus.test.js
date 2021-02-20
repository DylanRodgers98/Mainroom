const EVENT = 'testEvent';
const ARGS = {
    foo: 'bar'
};

const mockSendDataToProcessId = jest.fn((id, packet, cb) => {});

jest.mock('pm2', () => {
    return {
        sendDataToProcessId: mockSendDataToProcessId
    };
});

beforeEach(() => {
    jest.clearAllMocks();
})

describe('mainroomEventBus', () => {
    describe('send', () => {
        it('should send event to pm2 God process when NODE_ENV is set to production', () => {
            const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
            try {
                // given
                process.env.NODE_ENV = 'production';
                const mainroomEventBus = require('../../server/mainroomEventBus');
                const spy = spyOn(mainroomEventBus, 'emit');
                // when
                mainroomEventBus.send(EVENT, ARGS);
                // then
                const packet = mockSendDataToProcessId.mock.calls[0][1];
                const event = packet.type;
                const args = packet.data;
                expect(event).toEqual(EVENT);
                expect(args).toEqual(ARGS);
                expect(spy).not.toHaveBeenCalled();
            } finally {
                process.env.NODE_ENV = ORIGINAL_NODE_ENV;
            }
        });

        it('should emit event using EventEmitter when NODE_ENV is not set to production', async () => {
            const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
            try {
                // given
                process.env.NODE_ENV = 'development';
                const mainroomEventBus = require('../../server/mainroomEventBus');
                const spy = spyOn(mainroomEventBus, 'emit');
                // when
                mainroomEventBus.send(EVENT, ARGS);
                // then
                expect(spy).toHaveBeenCalledWith(EVENT, ARGS);
                expect(mockSendDataToProcessId).not.toHaveBeenCalled();
            } finally {
                process.env.NODE_ENV = ORIGINAL_NODE_ENV;
            }
        });
    });

    describe('sendToGodProcess', () => {
        it('should send event to pm2 God process', () => {
            // given
            const mainroomEventBus = require('../../server/mainroomEventBus');
            const spy = spyOn(mainroomEventBus, 'emit');
            // when
            mainroomEventBus.sendToGodProcess(EVENT, ARGS);
            // then
            const packet = mockSendDataToProcessId.mock.calls[0][1];
            const event = packet.type;
            const args = packet.data;
            expect(event).toEqual(EVENT);
            expect(args).toEqual(ARGS);
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
