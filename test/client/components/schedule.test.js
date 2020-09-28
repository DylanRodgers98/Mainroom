import React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import {act} from "react-dom/test-utils"
import Schedule from "../../../client/components/Schedule";
import moment from "moment";

const mockOwnUsername = 'ownUser';
const mockUsername1 = 'user1';
const mockUsername2 = 'user2';
const mockUsername3 = 'user3';
const mockScheduledStreams = [{
    startTime: moment().add(12, 'hour'),
    endTime: moment().add(13, 'hour')
}];

jest.mock('axios', () => {
    return {
        get: jest.fn(async (url, config) => {
            if (url === '/api/users/logged-in') {
                return {
                    data: {
                        username: mockOwnUsername
                    }
                };
            }
            if (url === `/api/users/${mockOwnUsername}/schedule`) {
                return {
                    data: {
                        username: mockOwnUsername,
                        scheduledStreams: mockScheduledStreams,
                        subscriptions: [
                            {
                                username: mockUsername1,
                                scheduledStreams: mockScheduledStreams
                            },
                            {
                                username: mockUsername2,
                                scheduledStreams: mockScheduledStreams
                            },
                            {
                                username: mockUsername3,
                                scheduledStreams: mockScheduledStreams
                            }
                        ]
                    }
                }
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

describe('Schedule component', () => {
    it('should build schedule when component gets mounted', async () => {
        await act(async () => render(<Schedule/>, container));
        const groups = container.getElementsByClassName('rct-sidebar-row');
        const groupNames = Array.from(groups).map(group => group.textContent);
        const items = container.getElementsByClassName('rct-item');
        const itemValues = Array.from(items).map(item => item.textContent);
        expect(groupNames).toEqual(['My Scheduled Streams', mockUsername1, mockUsername2, mockUsername3]);
        expect(itemValues).toEqual([mockOwnUsername, mockUsername1, mockUsername2, mockUsername3]);
    });
});