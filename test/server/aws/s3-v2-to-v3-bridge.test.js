const S3V2ToV3Bridge = require('../../../server/aws/s3-v2-to-v3-bridge');

const mockParams = { Bucket: 'test-bucket', Key: 'helloWorld.txt' };
const mockCallback = () => {};
const mockResult = 'I PASSED!';
const mockError = new Error('I failed :(');

let mockShouldUploadError;

jest.mock('@aws-sdk/lib-storage', () => {
    return {
        Upload: jest.fn(() => {
            return {
                done: () => {
                    if (mockShouldUploadError){
                        throw mockError;
                    }
                    return mockResult;
                }
            };
        })
    };
});

const mockS3DeleteObject = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3: jest.fn(() => {
            return {
                deleteObject: mockS3DeleteObject
            };
        })
    };
});

describe('s3-v2-to-v3-bridge', () => {
    describe('upload', () => {
        it('should use the Upload class from @aws-sdk/lib-storage to carry out an upload', async () => {
            // given
            mockShouldUploadError = false;
            const bridge = new S3V2ToV3Bridge();
            // when
            const upload = bridge.upload(mockParams);
            // then
            await upload.send((err, result) => {
                expect(err).toBeNull();
                expect(result).toEqual(mockResult);
            });
        });

        it('should pass an error to the callback when @aws-sdk/lib-storage fails to carry out an upload', async () => {
            // given
            mockShouldUploadError = true;
            const bridge = new S3V2ToV3Bridge();
            // when
            const upload = bridge.upload(mockParams);
            // then
            await upload.send((err, result) => {
                expect(err).toEqual(mockError);
                expect(result).toEqual(null);
            });
        });
    });

    describe('deleteObject', () => {
        it('should use the deleteObject method from the S3 class from @aws-sdk/client-s3 to delete an object', () => {
            // given
            const bridge = new S3V2ToV3Bridge();
            // when
            bridge.deleteObject(mockParams, mockCallback);
            // then
            expect(mockS3DeleteObject).toHaveBeenCalledWith(mockParams, mockCallback);
        });
    });
});
