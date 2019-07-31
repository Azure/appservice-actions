import { getFileNameFromPath } from '../Utilities/utility';

test('File name', () => {
    expect(getFileNameFromPath("abc/def/hello.zip", ".zip")).toBe("hello");
});