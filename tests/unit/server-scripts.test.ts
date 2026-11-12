import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("binds default Next servers to loopback, with LAN access only by explicit opt-in", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  expect(scripts.dev).toBe("next dev -H 127.0.0.1");
  expect(scripts.start).toBe("next start -H 127.0.0.1");
  expect(scripts["dev:lan"]).toBe("next dev -H 0.0.0.0");
  expect(scripts["start:lan"]).toBe("next start -H 0.0.0.0");
});
