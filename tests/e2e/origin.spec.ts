import { expect, test } from "@playwright/test";

test("same-origin JSON works through a simulated TLS-terminating proxy; another scheme does not", async ({
  request,
  baseURL,
}) => {
  // Spoofing Host is safe only against the locally controlled test server.
  const host = new URL(baseURL!).hostname;
  test.skip(host !== "localhost" && host !== "127.0.0.1", "requires a local server");
  const headers = {
    host: "preview.example.test",
    "x-forwarded-host": "preview.example.test",
    "x-forwarded-proto": "https",
  };
  const data = { text: "برای سفر بیمه می‌خواهم" };
  const sameOrigin = await request.post("/api/intent", {
    headers: { ...headers, origin: "https://preview.example.test" },
    data,
  });
  expect(sameOrigin.status()).toBe(200);
  const wrongScheme = await request.post("/api/intent", {
    headers: { ...headers, origin: "http://preview.example.test" },
    data,
  });
  expect(wrongScheme.status()).toBe(403);
  const anotherOrigin = await request.post("/api/intent", {
    headers: { ...headers, origin: "https://attacker.example" },
    data,
  });
  expect(anotherOrigin.status()).toBe(403);
});
