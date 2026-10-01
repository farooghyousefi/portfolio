import test from "node:test";
import assert from "node:assert/strict";
import contact from "../api/contact.mjs";

const endpoint = "https://portfolio.example/api/contact";
const fields = { name: "Ada Example", email: "ada@example.net", message: "Hello, I would like to talk about your work.", lang: "de" };

function request(values = fields, options = {}) {
  return new Request(endpoint, {
    method: options.method || "POST",
    headers: { origin: options.origin ?? "https://portfolio.example", accept: "application/json", ...options.headers },
    ...((options.method || "POST") === "POST" ? { body: new URLSearchParams(values) } : {}),
  });
}

test("rejects cross-origin and invalid submissions", async () => {
  assert.equal((await contact.fetch(request(fields, { origin: "https://elsewhere.example" }))).status, 403);
  assert.equal((await contact.fetch(request({ ...fields, email: "not-an-email" }))).status, 400);
  assert.equal((await contact.fetch(request({ ...fields, message: "short" }))).status, 400);
  assert.equal((await contact.fetch(request(fields, { method: "GET" }))).status, 405);
});

test("does not claim delivery when mail configuration is missing", async () => {
  const prior = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await contact.fetch(request());
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { ok: false, code: "unavailable" });
  } finally {
    if (prior !== undefined) process.env.RESEND_API_KEY = prior;
  }
});

test("sends only to the configured recipient with the visitor as reply-to", async () => {
  const oldFetch = globalThis.fetch;
  const keys = ["RESEND_API_KEY", "CONTACT_TO_EMAIL", "CONTACT_FROM_EMAIL"];
  const previous = keys.map((key) => process.env[key]);
  [process.env.RESEND_API_KEY, process.env.CONTACT_TO_EMAIL, process.env.CONTACT_FROM_EMAIL] = ["test-key", "inbox@example.net", "form@example.net"];
  let payload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    payload = JSON.parse(options.body);
    return Response.json({ id: "test-message" });
  };
  try {
    const result = await contact.fetch(request());
    assert.equal(result.status, 200);
    assert.deepEqual(payload.to, ["inbox@example.net"]);
    assert.equal(payload.reply_to, fields.email);
    assert.match(payload.text, /Ada Example/);
    assert.equal(payload.from, "Portfolio <form@example.net>");
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
