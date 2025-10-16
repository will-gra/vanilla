import { describe, it } from "vitest";

// This is a lightweight integration smoke test for the /api/generate endpoint.
// It is intentionally disabled by default; set RUN_INTEGRATION=1 to run it.

const RUN = !!process.env.RUN_INTEGRATION;

describe("integration: /api/generate smoke", () => {
  it.skip("skips by default; set RUN_INTEGRATION=1 to enable", async () => {});

  if (RUN) {
    it("posts a sample prompt and expects a valid preview envelope", async () => {
      const res = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "smoke test",
          serviceHint: "testService",
        }),
      });

      if (!res.ok) throw new Error("Network response not ok: " + res.status);
      const json = await res.json();

      // Expect one of the known preview locations to be present
      const html =
        json.preview ||
        (json.data && json.data.preview) ||
        (json.data && json.data.content && json.data.content.body) ||
        json.html ||
        null;

      if (!html)
        throw new Error(
          "No preview HTML found in response: " + JSON.stringify(json)
        );
    });
  }
});
