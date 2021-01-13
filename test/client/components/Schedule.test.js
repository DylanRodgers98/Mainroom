import React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import {act} from "react-dom/test-utils"
import Schedule from "../../../client/components/Schedule";
import moment from "moment";

const MOCK_OWN_USERNAME = 'ownUser';
const MOCK_USERNAME_1 = 'user1';
const MOCK_USERNAME_2 = 'user2';
const MOCK_USERNAME_3 = 'user3';

jest.mock('axios', () => {
    return {
        get: jest.fn(async url => {
            if (url === '/logged-in-user') {
                return {
                    data: {
                        username: MOCK_OWN_USERNAME
                    }
                };
            }
            if (url === `/api/users/${MOCK_OWN_USERNAME}/schedule`) {
                return {
                    data: {
                        username: MOCK_OWN_USERNAME,
                        scheduledStreams: [mockBuildScheduledStream(MOCK_OWN_USERNAME)],
                        subscriptions: [
                            {
                                username: MOCK_USERNAME_1,
                                scheduledStreams: [mockBuildScheduledStream(MOCK_USERNAME_1)]
                            },
                            {
                                username: MOCK_USERNAME_2,
                                scheduledStreams: [mockBuildScheduledStream(MOCK_USERNAME_2)]
                            }
                        ],
                        nonSubscribedScheduledStreams: [mockBuildScheduledStream(MOCK_USERNAME_3)]
                    }
                };
            }
        })
    };
});

let container = null;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jest.clearAllMocks();
});

afterEach(() => {
    unmountComponentAtNode(container);
    container.remove();
    container = null;
});

describe('Schedule', () => {
    it('should build schedule when component gets mounted', async () => {
        await act(async () => render(<Schedule/>, container));
        const groups = container.getElementsByClassName('rct-sidebar-row');
        const groupNames = Array.from(groups).map(group => group.textContent);
        const items = container.getElementsByClassName('rct-item');
        const itemValues = Array.from(items).map(item => item.textContent);
        expect(groupNames).toEqual(['My Streams', MOCK_USERNAME_1, MOCK_USERNAME_2, MOCK_USERNAME_3]);
        expect(itemValues).toEqual([MOCK_OWN_USERNAME, MOCK_USERNAME_1, MOCK_USERNAME_2, MOCK_USERNAME_3]);
    });
});

function mockBuildScheduledStream(username) {
    return {
        user: { username },
        startTime: moment().add(12, 'hour'),
        endTime: moment().add(13, 'hour')
    };
}