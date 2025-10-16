import { writable } from "svelte/store";
import { previewStore } from "./storeAdapter";
import { extractPreviewHtml, normalizePreviewValue } from "./preview-utils";

// Minimal prompt store: manages prompt state and performs network call to
// server when submitting prompts. It updates the shared previewStore with
// HTML returned by the server so the PreviewWindow remains display-only.
const store = writable({ prompt: "", loading: false, error: null });

async function submitPrompt(payload) {
  const prompt = typeof payload === "string" ? payload : payload.prompt;

  store.update((s) => ({
    ...s,
    prompt: prompt,
    loading: true,
    error: null,
  }));

  try {
    // Prepare body payload. If running in a development environment, default
    // to the deterministic `testService` so local dev and manual testing
    // exercise the predictable test service rather than external AI.
    const bodyPayload =
      typeof payload === "string"
        ? { prompt: payload }
        : { ...(payload || {}) };

    try {
      // Vite exposes import.meta.env.DEV; guard in case it's undefined in other runners
      const isDev =
        typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.DEV;
      const isLocalHost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      if (!bodyPayload.serviceHint && (isDev || isLocalHost)) {
        bodyPayload.serviceHint = "testService";
      }
    } catch (e) {}

    // Perform network call to the canonical V1 endpoint
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    // TEMP DEBUG: surface response status
    try {
      console.debug("[promptStore] fetch status:", res.status, "ok:", res.ok);
    } catch (e) {}
    if (!res.ok) {
      throw new Error(
        `Network response was not ok: ${res.status} ${res.statusText}`
      );
    }

    const json = await res.json();

    // TEMP DEBUG: log server result structure to help diagnose preview extraction
    try {
      console.debug("[promptStore] server result:", json);
    } catch (e) {}

    // Extract HTML defensively using helper
    const html = extractPreviewHtml(json);

    if (!html) {
      const err = new Error("Invalid server response: no html found");
      store.update((s) => ({ ...s, loading: false, error: err.message }));
      throw err;
    }

    // Update the shared preview store with HTML for display using canonical shape
    // TEMP DEBUG: log what will be set into previewStore
    try {
      console.debug(
        "[promptStore] extracted html length:",
        html && html.length
      );
    } catch (e) {}
    previewStore.set(normalizePreviewValue(html));

    // Persisted artifacts (if provided) can be returned to callers
    const persisted =
      json && json.data && json.data.persisted ? json.data.persisted : null;

    store.update((s) => ({ ...s, loading: false, error: null }));

    return { success: true, persisted, html };
  } catch (e) {
    store.update((s) => ({
      ...s,
      loading: false,
      error: e && e.message ? e.message : String(e),
    }));
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

export const promptStore = {
  subscribe: store.subscribe,
  submitPrompt,
  _raw: store,
};
