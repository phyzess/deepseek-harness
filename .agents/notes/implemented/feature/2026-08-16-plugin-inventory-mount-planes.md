# Agent Note: plugin-inventory — mount-plane grouping for the Settings plugin list

Status: implemented

English | [中文](2026-08-16-plugin-inventory-mount-planes.zh.md)

## Problem

The shipped web composition mounts every agent-plane plugin twice — once as a deliberately disabled host row (the web-app bundle keeps the base rows, disabled, because disabling rather than deleting is deliberate) and once inside the standing standard agent preset. The Settings Plugin-list tab rendered both populations as indistinguishable cards: the title is a heavily stripped module name (`moduleShortName` removes the scope and `dsh-`/`cordis-` prefixes), and the only distinguishing value, the Loader entry id, was hidden behind a per-card expansion. On a stock web profile the list therefore reads as a wall of same-name duplicates (tool-subagent appears six times, hmr three times, every agent tool twice) with no way to tell which row is the live preset mount and which is the disabled host row.

## Decision

Keep the tab a read-only projection of the same `pluginInventory.list` Remote and change only its presentation:

- every card carries the FULL module name as its title, with the Loader entry id always visible beneath it (the disclosure expansion is preserved);
- entries group by mount plane derived from the id shape: `include:agent-presets:*` → Agent preset, `include:` (and the bare `include` row) → Host, anything else → Runtime-created;
- a module mounted several times carries a `×N` multiplicity badge on every card.

The plane classifier is display-only grouping; the id stays opaque as identity (it remains the React key and a search target). The registration contract (`settings.plugins.tab`, id `all`, order 10) and the injected `list` face are unchanged, so the section owner, the browser-plugin composition test, and the settings e2e hooks keep working; the Plugins-section e2e golden was refreshed with the new card surface.

## Relationship to prior decisions

Builds on the read-only inventory surface (the tab's original design: lazy `list()` read, local-only states, `ctx.slots.inject` registration) and on the [host-plane ownership after presets](../architecture/2026-08-10-host-plane-ownership-after-presets.md) note, which is the design that produces the two mount populations this view now separates. Neither is superseded.

## Alternatives considered

- **Host-provided plane field.** Adding a plane/owner field to `PluginInventoryEntry` is more truthful than id-shape classification, but changes the Remote wire contract and its generated client schema for a purely presentational need; deferred until a consumer needs authoritative planes.
- **Hiding one population (disabled host rows or preset rows).** Rejected: the inventory is the only surface where both planes are visible, and hiding rows would hide real runtime state.
- **A separate out-of-tree replacement plugin.** A prototype replacement was built and wired through the profile patch layer; rejected for the official package because this surface belongs to the shipped UI and the in-repo change is the maintained path.

## Consequences

- The stock web profile's plugin list now reads as host/preset/runtime sections with visible entry ids; same-name cards are expected and labeled rather than confusing.
- The planes derive from entry id shape; a future composition that mints different id shapes needs the classifier updated (noted in the package README).
- The e2e golden `plugins.expected.md` and the component/browser-plugin specs were updated with the new surface; the slot registration contract is unchanged.
