import React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import {act} from "react-dom/test-utils"
import Schedule from "../../../client/components/Schedule";
import moment from "moment";

const mockStartTime = moment().add(12, 'hour');
const mockEndTime = moment().add(13, 'hour');

const mockOwnUsername = 'ownUser';

const username1 = 'user1';
const username2 = 'user2';
const username3 = 'user3';

const mockUser1 = { username: username1 };
const mockUser2 = { username: username2 };
const mockUser3 = { username: username3 };

jest.mock('axios', () => {
    return {
        get: jest.fn(async (url, config) => {
            if (url === '/user') {
                return {
                    data: {
                        username: config !== undefined ? config.params.username : mockOwnUsername,
                        scheduledStreams: [{
                            startTime: mockStartTime,
                            endTime: mockEndTime
                        }]
                    }
                }
            }
            if (url === '/user/subscriptions') {
                return {
                    data: {
                        subscriptions: [mockUser1, mockUser2, mockUser3]
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
        await act(async () => {
            render(<Schedule/>, container);
        });
        const groups = container.getElementsByClassName('rct-sidebar-row');
        const groupNames = Array.from(groups).map(group => {
            return group.textContent;
        });
        const items = container.getElementsByClassName('rct-item');
        const itemValues = Array.from(items).map(item => {
            return item.textContent;
        });
        expect(groupNames).toEqual(['My Scheduled Streams', username1, username2, username3]);
        expect(itemValues).toEqual([mockOwnUsername, username1, username2, username3]);
    });
});