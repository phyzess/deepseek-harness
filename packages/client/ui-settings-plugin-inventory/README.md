# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

English | [中文](README.zh.md)

Read-only **Plugin list** tab for Web Settings. The browser plugin registers one localized `settings.plugins.tab` contribution with id `all`; the Plugins section owns the navigation entry and tab chrome. It performs no Remote read during plugin activation. Selecting the tab for the first time mounts it and lazily calls `ctx.remote.pluginInventory.list()` through [`api-remotes`](../../api/remotes/README.md).

The tab renders a searchable catalog grouped by mount plane — host rows, agent-preset rows, and runtime-created rows, each section headed by its localized name and count. Every card carries the FULL module name as its title, the Loader-tree entry id directly beneath it, a small effective-enablement tag, and, for enabled entries, a colored root-fiber status dot; the card's disclosure expansion still reveals the effective configuration and Cordis status. A module mounted more than once carries a `×N` multiplicity badge on every card, so the shipped web composition's same-name duplicates — a plugin mounted once as a deliberately disabled host row and once inside the standing agent preset — stay distinguishable. The entry id is the React key, the always-visible identity value, and an additional search target; the plane grouping is display-only classification of the id's shape, never identity semantics. Loading, empty, no-match, and generic failure states stay local to the mounted component, and a failed read can be retried without exposing transport details. The registration uses `ctx.slots.inject()`, so it follows late tab declaration, redeclaration, locale changes, and teardown without importing the section owner.

## Model Experience

None, as this package only visualizes a Host-owned deployment snapshot in browser Settings and registers nothing model-facing.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **One snapshot per Settings mount or retry** — the tab does not subscribe to Loader changes or automatically refetch after reconnect; switching tabs preserves the current snapshot, while reopening Settings obtains a new one.
- **Read-only Loader view** — local search does not add provenance, current-browser activation diagnosis, or plugin mutation controls.
- **Plane grouping is id-shape based** — host/preset/runtime grouping derives from the entry id's `include:`/`agent-presets` segments rather than a Host-provided plane field; a composition that mints differently-shaped ids would need the classifier updated.
