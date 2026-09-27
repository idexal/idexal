# Idexal release record

This is the public record of Idexal releases. Every entry states what changed,
what has been **verified on a real installed build**, and what is still open. We
do not describe a release as working based on automated checks alone.

## How versions and channels work

Version numbers follow `MAJOR.MINOR.PATCH`:

| Bump | When |
| --- | --- |
| `MAJOR` | Breaking change to sessions, settings, workspaces, or the extension surface |
| `MINOR` | New user-facing capability, backward compatible |
| `PATCH` | Fixes only |

The **channel** is stated next to the version and describes maturity, not the
number:

| Channel | Promotion criteria — all must hold |
| --- | --- |
| **Alpha** | Feature works on the developer machine; installer builds; known gaps documented |
| **Beta** | Installer verified by a real install-and-launch run on each supported platform; upgrade from the previous version tested |
| **Stable** | Signed and notarised where the platform requires it; end-to-end update check confirmed on a published feed; no open regression in a core flow |
| **LTS** | A Stable line designated for extended support with a published end-of-support date |

A release is published here **only when its installers are attached**. If a
version has no downloads, it is not available yet — we would rather show an
empty list than a promise.

---

## Up next — Idexal 4.0.0 · Alpha

The first public release. Version 4.0.0 rather than a continuation of the 3.x
line because the product identity changed: closed-source commercial
distribution, a single multilingual interface (Arabic, English, French), and
installers published here instead of source being the deliverable.

What it will contain:

- **Desktop, browser and terminal surfaces over one agent runtime**, with a
  phone attaching to an existing desktop session rather than starting a second
  agent.
- **Arabic interface with full right-to-left layout**, alongside English and
  French. Direction is derived from the language, and directional icons mirror
  with it.
- **Guided Windows setup wizard**, with macOS and Linux packages to follow.
- **In-app update checks** that notify without downloading; the decision to
  update, and when, stays with you.

Open before this release can be published:

- [ ] Code signing and notarisation for each platform
- [ ] Install-and-launch verification on Windows, macOS and Linux
- [ ] Update feed published and verified end to end from an installed build

---

## Before 4.0.0

Development history for 3.x was kept in the private source repository and is not
published here. It is referenced only where it explains a behaviour in 4.0.0.
