import assert from "node:assert/strict";
import test from "node:test";
import { displaySongLabel, displaySongTitle } from "../../src/features/song/model/songTitle.ts";

test("shows only the final segment of imported song titles", () => {
    assert.equal(displaySongTitle("Eurocup 2025/Lower/[09] Beyond the Seven"), "[09] Beyond the Seven");
    assert.equal(displaySongTitle("Pack\\Folder\\Song\\"), "Song");
});

test("keeps plain titles and prefixes the artist in labels", () => {
    assert.equal(displaySongTitle("Vertex²"), "Vertex²");
    assert.equal(displaySongLabel({ title: "Pack/Vertex²", artist: "Silvia" }), "Silvia - Vertex²");
});
