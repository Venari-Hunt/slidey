import {
    bgQuery,
    type PictureFile,
    pictureValue,
    rankPictures,
} from "../src/obsidian/pictureSuggest";

const file = (path: string, mtime = 0): PictureFile => ({
    path,
    name: path.slice(path.lastIndexOf("/") + 1),
    mtime,
});

describe("bgQuery", () => {
    test("after bg= inside a marker", () => {
        expect(bgQuery("%% bg=", 6)).toEqual({ start: 6, query: "" });
        expect(bgQuery("%% preset=quote bg=bea", 23)).toEqual({
            start: 20,
            query: "bea",
        });
        expect(bgQuery("%% slide bg=x", 13)).toEqual({ start: 12, query: "x" });
    });

    test("not outside a marker, after it closes, or in a link", () => {
        expect(bgQuery("bg=photo", 8)).toBeNull();
        expect(bgQuery("%% bg=a.jpg %% bg=", 18)).toBeNull();
        expect(bgQuery("%% bg=[[", 8)).toBeNull();
        expect(bgQuery("%% xbg=a", 8)).toBeNull();
    });
});

describe("rankPictures", () => {
    const files = [
        file("Photos/beach.jpg", 1),
        file("Talks/deck/cover.png", 2),
        file("Photos/sunset.webp", 3),
        file("Talks/deck/notes.md", 4),
    ];

    test("pictures only, same folder first, then newest", () => {
        expect(
            rankPictures(files, "", "Talks/deck/My talk.md").map((f) => f.name),
        ).toEqual(["cover.png", "sunset.webp", "beach.jpg"]);
    });

    test("every typed word must be in the path", () => {
        expect(
            rankPictures(files, "photos sun", "x.md").map((f) => f.name),
        ).toEqual(["sunset.webp"]);
        expect(rankPictures(files, "BEACH", "x.md")).toHaveLength(1);
    });
});

describe("pictureValue", () => {
    test("the file name when no other path contains it", () => {
        expect(
            pictureValue(file("Photos/beach.jpg"), ["Photos/beach.jpg"]),
        ).toBe("beach.jpg");
    });

    test("the full path when the name is shared", () => {
        expect(
            pictureValue(file("A/cover.png"), ["A/cover.png", "B/cover.png"]),
        ).toBe("A/cover.png");
    });

    test("names with spaces go in [[ ]]", () => {
        expect(
            pictureValue(file("Photos/my trip.jpg"), ["Photos/my trip.jpg"]),
        ).toBe("[[my trip.jpg]]");
    });
});
