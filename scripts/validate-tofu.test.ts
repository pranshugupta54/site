import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "validate-tofu.mjs");

function run(framesPath?: string) {
  const args = framesPath ? [script, framesPath] : [script];
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

describe("validate-tofu", () => {
  it("accepts the shipped frames", () => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
  });

  it("rejects a hat that is not 3 characters", () => {
    const dir = mkdtempSync(join(tmpdir(), "tofu-hat-"));
    const framesPath = join(dir, "frames.json");
    try {
      const data = JSON.parse(readFileSync(join(root, "src", "data", "tofu-frames.json"), "utf8"));
      data.hats.halloween = "xx";
      writeFileSync(framesPath, JSON.stringify(data));
      const result = run(framesPath);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /hat halloween: must be exactly 3 chars/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
