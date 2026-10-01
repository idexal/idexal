# Idexal

<div align="center">
  <img src="assets/light_logo_idexal.png" alt="Idexal" width="340" />
</div>

<p align="center">
  <b>The AI coding workspace that keeps working when you stop watching.</b>
</p>

<p align="center">
  <a href="https://idexal.com">idexal.com</a> ·
  <a href="#download">Download</a> ·
  <a href="CHANGELOG.md">Release notes</a> ·
  <a href="SUPPORT.md">Support</a> ·
  <a href="mailto:contact@idexal.com">contact@idexal.com</a>
</p>

<p align="center">
  English · <a href="README.ar.md">العربية</a> · <a href="README.fr.md">Français</a>
</p>

---

Idexal is a commercial AI coding workspace. A single agent runtime is reachable
from a desktop application, a browser client and a terminal interface, so work
you start in one surface continues in another — including from your phone while
your desktop keeps the session alive.

This repository is the **official download and release channel**. It contains
installers, release notes and upgrade documentation. Idexal is closed-source
commercial software: the source code is proprietary and is not published here or
elsewhere.

## Why teams choose Idexal

| | |
|---|---|
| **Three surfaces, one session** | Desktop, browser and terminal share the same agent runtime and the same conversation state. Nothing is locked to the window you started in. |
| **Runs unattended, resumes on your phone** | Long tasks keep running on your machine. A phone connects to the existing session — it does not start a second agent — so you can watch, answer and steer from anywhere. |
| **Your machine stays the boundary** | Files, terminals and tools execute locally. Idexal does not need to copy your repository to a vendor cloud to be useful. |
| **Extensible by design** | Skills, plugins, MCP connectors and subagents are first-class, installable capabilities rather than forks of the product. |
| **Built for multilingual teams** | The interface is available in Arabic, English and French, and the layout follows the language's direction. Arabic and French currently cover part of the product; the rest is shown in English until it is translated, and coverage rises release by release. |

## Download

Today the Windows desktop installer and the Windows terminal binary are published
on the [Releases page](https://github.com/idexal/idexal/releases). Each release
lists its downloads, supported platforms, checksums and the changes it contains.

| Platform | File | Architecture | Status |
| --- | --- | --- | --- |
| Windows desktop | `Idexal-<version>-win-x64.exe` (guided setup wizard) | x64 | published |
| Windows terminal | `Idexal-CLI-<version>-win-x64.exe` | x64 | published |
| macOS | `Idexal-<version>-mac-arm64.dmg` and `-mac-x64.dmg` (plus the matching `.zip`) | Apple Silicon, Intel | planned — nothing published yet |
| Linux | `Idexal-<version>-linux-x64.AppImage`, `.deb`, `.rpm`, `.pkg.tar.zst` (arm64 too) | x64, arm64 | planned — nothing published yet |

Every release carries a SHA-256 checksum next to its downloads. Verify it before
installing.

### Release channels

| Channel | Meaning | You should use it if |
| --- | --- | --- |
| **Alpha** | Early access. Features work but the surface still changes, and known rough edges are documented. | You want the newest capability and accept breakage. |
| **Beta** | Feature-complete for the release. Installer, upgrade and rollback paths are tested on all supported platforms. | You want new features shortly before general availability. |
| **Stable** | Supported release. Security fixes and regressions are addressed on this line. | Everyday production use. |
| **LTS** | A Stable line kept current for an extended support window. | Teams that need a pinned version with a long commitment. |

The channel is stated in the release title next to the version, for example
`Idexal 4.0.0 · Alpha`. Version numbers follow `MAJOR.MINOR.PATCH`; a channel
never changes the meaning of a version number.

### Upgrading

Idexal can check for a newer version and tell you when one exists. **Nothing is
downloaded or installed until you accept** — automatic download and install is a
setting you turn on, not a default.

In 4.0.0 and 4.0.1 that check does not read this page. It asks a service we do not operate,
and that service reports its own release line rather than ours. Until the update
feed is Idexal-operated, the supported way to upgrade is to download the installer
for the version you want from this page and run it. That installer is built to leave
your sessions, workspaces, credentials and settings in place; how far we have verified
that is stated below.

| Behaviour | Default |
| --- | --- |
| Check for a newer release | On |
| Download without asking | **Off** — you accept first |
| Install | Only after the download completes and you choose to apply it |
| Sessions, workspaces, credentials and settings | Kept by design: an update deletes only the files the previous version installed, and an uninstall is configured to leave application data alone. Neither the upgrade nor the uninstall has been verified end to end yet. |

On Windows, applying an update is always an explicit action. On macOS and Linux,
once you have accepted an update it is applied when you quit the app. To move
back, install the previous release from this page.

We have not yet walked this path end to end from an installed build — the release
notes list it as open, and macOS and Linux have no published installer to try it on.

## Documentation

| Document | Contents |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Release record: what changed, what is verified, what is still open |
| [SECURITY.md](SECURITY.md) | How to report a vulnerability and how we handle it |
| [SUPPORT.md](SUPPORT.md) | Where to get help, and what to include in a report |
| [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) | Third-party components, licences and copyright notices |
| [LICENSE](LICENSE) | The Idexal commercial licence terms |

## Contact

Business, deployment and partnership enquiries: <contact@idexal.com>.
Product problems and feature requests: [GitHub Issues](https://github.com/idexal/idexal/issues).
