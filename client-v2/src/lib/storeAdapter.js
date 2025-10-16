import { writable } from "svelte/store";

// Minimal in-memory adapter: exposes a Svelte writable store and a factory
export function createStoreAdapter(initial = { body: "" }) {
  const store = writable(initial);

  // Wrap set/update to accept legacy string values and normalize to { body }
  const originalSet = store.set;
  const originalUpdate = store.update;

  store.set = (v) => {
    // TEMP DEBUG: surface values being set to previewStore
    try {
      console.debug(
        "[previewStore.set] value type:",
        typeof v,
        v && v.length ? v.substring(0, 120) : v
      );
    } catch (e) {}
    if (typeof v === "string") return originalSet({ body: v });
    return originalSet(v);
  };

  store.update = (fn) =>
    originalUpdate((prev) => {
      const next = fn(prev);
      if (typeof next === "string") return { body: next };
      return next;
    });

  // Attach a simple id for diagnostics (optional)
  store.__chronos_id = "client-v2-preview-store";
  store.__is_canonical = true;

  return store;
}

// Create and export a singleton previewStore for convenience tests
export const previewStore = createStoreAdapter({ body: "" });

export default {
  createStoreAdapter,
  previewStore,
};
