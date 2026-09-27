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

## 4.0.0 · Alpha — 2026-09-27

The first public release of Idexal. It is published here as an installer, not as
source: Idexal is now a closed-source commercial product with a single
multilingual interface (Arabic, English and French). Version 4.0.0 rather than a
continuation of the earlier internal line because that change of identity is the
step, not a feature.

### What you get

- **Windows desktop app** with a guided setup wizard: you choose the installation
  folder, and the wizard speaks English, French and Arabic.
- **Terminal CLI over the same agent runtime** as a standalone Windows binary, so the
  agent is scriptable without the desktop window. It carries its own version line
  (`idexal --version` reports the terminal's release, not this one), which is why the
  file name and the version it prints differ; download notes match this release.
- **One agent runtime behind desktop, browser and phone.** A phone attaches to a
  session that is already running on your desktop instead of starting a second
  agent.
- **Arabic interface with right-to-left layout**, alongside English and French.
  Direction follows the language, and directional icons mirror with it.
- **Update checks that notify without downloading.** Whether to update, and when,
  stays with you.

### What we verified on this build

- The packaged application starts from the built output: window titled `Idexal`,
  interface loaded, and no error-level entries in its own log.
- The wizard completed a per-user install of this version on a Windows x64 machine:
  it registered in the current user's app list with version `4.0.0`, wrote its own
  uninstaller and Start Menu entry, and the installed application runs from that
  location with its own session data.
- Installer and program both carry file and product version `4.0.0`, under the
  production identity rather than a preview one, so a release install will not
  overwrite or shadow a test build.
- The terminal binary starts: `--version` and `--help` both run, and it writes its data
  directory where told rather than into an existing installation.
- Each download attached to this release is the same file we built, checked by SHA-256
  after publication, and served to visitors who are not signed in.

### Checksums

| File | SHA-256 |
| --- | --- |
| `Idexal-4.0.0-win-x64.exe` | `e4cf64d7df5593ffd53da1d0402c1d1a6c733a0e34375dc8fe4b795fd5592644` |
| `Idexal-CLI-4.0.0-win-x64.exe` | `ab1907f03071acb4a993ad74a86d0f5cb33a769bc3784c77caed72feb7ba6f42` |

### Open in this Alpha

- **Not signed or notarised.** Windows will show a SmartScreen warning, and there
  are no macOS or Linux packages yet. These are Beta and Stable requirements, not
  Alpha ones.
- **One machine, and not a clean one.** The install above happened where Idexal was
  already in use. A clean Windows machine, an upgrade from a previous version, and a
  complete uninstall that leaves nothing of the program behind are still to be
  verified; until those pass, this stays Alpha.
- **The terminal binary has only been started, not driven.** `--version` and `--help`
  run and it creates its own data directory; a full agent session from a cold machine
  with a provider key is not covered by this release's checks.
- **Model provider list may come up empty on first launch.** During our run the
  built-in provider configuration could not refresh, so add your own provider key
  in Settings if no models appear.
- **The update feed is not verified end to end** from an installed build.
- **Arabic and French wizard text has not been reviewed on screen** by a reader
  of those languages, although the strings ship in all three.

---

## Before 4.0.0

Development history for the 3.x line was kept in the private source repository
and is not published here. It is referenced only where it explains a behaviour in
4.0.0.
