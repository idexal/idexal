# Idexal release record

This is the public record of Idexal releases. Every entry states what changed,
what has been **verified on a real installed build**, and what is still open. We
do not describe a release as working based on automated checks alone.

## How versions and channels work

Version numbers follow `MAJOR.MINOR.PATCH`:

| Bump    | When                                                                        |
| ------- | --------------------------------------------------------------------------- |
| `MAJOR` | Breaking change to sessions, settings, workspaces, or the extension surface |
| `MINOR` | New user-facing capability, backward compatible                             |
| `PATCH` | Fixes only                                                                  |

The **channel** is stated next to the version and describes maturity, not the
number:

| Channel    | Promotion criteria — all must hold                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alpha**  | Feature works on the developer machine; installer builds; known gaps documented                                                               |
| **Beta**   | Installer verified by a real install-and-launch run on each supported platform; upgrade from the previous version tested                      |
| **Stable** | Signed and notarised where the platform requires it; end-to-end update check confirmed on a published feed; no open regression in a core flow |
| **LTS**    | A Stable line designated for extended support with a published end-of-support date                                                            |

A release is published here **only when its installers are attached**. If a
version has no downloads, it is not available yet — we would rather show an
empty list than a promise.

---

## 4.0.4 · Alpha — 2026-09-30

A fixes-only release on top of 4.0.3. Nothing in it changes your sessions, workspaces, credentials or
settings, and no existing model request changes behaviour.

### What changed

- **A permission prompt can no longer get stuck for good.** When the part of the app that shows you a
  permission request failed on its way out, the request was cancelled for you but its identifier stayed
  registered as still waiting. Every later request under that same identifier was then refused with
  "already pending", so one failed handoff could freeze one permission permanently until you restarted the
  app. The cancelled request now releases its identifier, and a retried request is answered normally.
- **Unchanged for you, but now provable.** The permission layer that decides whether a tool may run — the
  order in which a mode, a project rule, an explicit disallow and a session approval are consulted — had
  never been covered by a test. It now has 38 cases, and they record two asymmetries the code already had
  rather than silently reordering them (see _Open in this Alpha_).

### What we verified on this build

- The installer and the program inside it both carry file version `4.0.4` under the production identity
  (`ProductName = Idexal`), not a preview one.
- The ownership manifest is present with 87 entries and no unowned file, both in the unpacked payload and
  inside the installer archive (89 files, 39 folders).
- The packaged locale set is exactly Arabic, English and French.
- The terminal binary was run against a fresh, empty data directory and reported `version: 4.0.4`,
  `node: v24.14.0`, `sea: yes`. That Node version is the one this repository pins: the binary was built on
  it rather than on the host's newer runtime, so no off-pin licence record was created.
- The release was built from committed source in a separate checkout with no local changes, at the commit
  that carried the fix.
- **Not verified, and not claimed:** no installation was run, and no model turn was made from either
  published binary. The permission fix itself is proven by a test that re-asks the same request id after a
  failed handoff, not by driving a live prompt.

### Checksums

| Asset | SHA-256 |
| ----- | ------- |
| `Idexal-4.0.4-win-x64.exe` | `64b16c9b97137b7d1494f4d121cdc179df4fe7c836a9d6104146715529a13fff` |
| `Idexal-CLI-4.0.4-win-x64.exe` | `026f176d969082bac27a992d9d28d6ca920de7f981672ee2c8dd4ed7c6149543` |

### Open in this Alpha

- **Two permission orderings are recorded, not fixed, and each needs a product decision.** A session in
  _yolo_ mode is allowed before an explicit disallow list is consulted, so the list does not stop the shell
  in that mode. And a tool's risk can never be raised by its own name, because the write list is checked
  before the destructive list and the shell sits in both. Both are pre-existing; changing either changes
  what a running session accepts, so they are decisions rather than edits.
- **Everything still open in 4.0.3 remains open**: nothing can be bought inside the app while the platform
  is not served from idexal.com; Computer Use is not part of the Windows package; the update check asks a
  service we do not operate; Arabic and French cover about 14% of interface text; this release's installer
  has not been run; and it is not signed or notarised.

## 4.0.3 · Alpha — 2026-09-30

A release that makes two things usable which already existed but could not be reached, and makes one kind of
log line tell the truth about why something failed. Nothing in it changes your sessions, workspaces,
credentials or settings, and no existing model request changes behaviour.

### What changed

- **`/goal budget` in the terminal.** Idexal has carried a per-session token ceiling for a long time, and the
  code that enforces it was already in place — but nothing could set it, so the guard could never fire. You
  can now set one with `/goal budget <tokens>`, lift it with `/goal budget none`, and `/goal` on its own
  reports the tokens used and what remains. Changing a budget never edits your objective and never resets a
  counter.
- **The subscription button is now the platform's decision, not the application's.** The sign-in screen used
  to show a disabled button because the app knew no purchase address. It now reads the checkout offer from
  the platform's configuration: if an offer arrives with a valid https address, the button opens exactly that
  address; if there is no offer, or the offer cannot be read, the button stays as it was. No address is
  compiled into the application, so a release cannot ship a button that leads nowhere. **This does not mean
  you can subscribe from this build yet** — see _Open in this Alpha_ below.
- **Computer Use start-up diagnostics name the real cause.** When the optional Computer Use helper was not
  installed, the app reported a malformed manifest; a location it considered unsafe was reported as
  corruption as well. These are now separate reasons — the runtime is absent, it is not a directory, or its
  location is suspect — because what you should do differs in each case, and until now the log pointed at the
  wrong fix.
- **Two platform endpoints answer to an Idexal name.** The balance endpoint and the model gateway are now also
  reachable under a `coding-plan/` path, with the same handler, the same guards and the same refusal of a
  credential that does not belong to them. The older vendor-named paths stay live because builds already in
  use point at them; no shipped client has moved to the new names yet.

### What we verified on this build

- The installer and the program inside it both carry file version `4.0.3` under the production identity
  (`ProductName = Idexal`), not a preview one.
- The ownership manifest is present with 87 entries and no unowned file, both in the unpacked payload and
  inside the installer archive (89 files, 39 folders), so an upgrade can tell which files it owns from the
  ones it does not.
- The packaged locale set is exactly Arabic, English and French.
- The terminal binary runs as a single file, reports `4.0.3` — the same number as the desktop and the
  release title, which is new: the terminal used to carry its own `0.16.9` — and it runs on the Node
  version this repository pins (`v24.14.0`). The staged binary is 198,982,144 bytes and the installer
  150,616,312 bytes.
- The release was built from committed source in a separate checkout at a commit with no local changes, and
  `pnpm typecheck` passed there with exit code 0.
- A repository gate checked the range this release covers: 24 shipped-path files changed, every one of them
  recorded, and the version move opened its own section in both this file and the internal changelog.
- **Not verified, and not claimed:** no installation was run, and no model turn was made from either
  published binary.

### Checksums

| Asset                          | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `Idexal-4.0.3-win-x64.exe`     | `a7ea243a77520eab28941f4b57f013fd0bc9e60b8c094b445a6c354157bff7d2` |
| `Idexal-CLI-4.0.3-win-x64.exe` | `497f7972557631c9a8b2fe3370b8d4a208bcaf0390588060fdf178fdd72917ec` |

### Open in this Alpha

- **Still nothing to buy inside the app.** Both ends of the mechanism now exist — the platform can make the
  offer and the desktop acts on it — but the platform is not yet served from idexal.com, so on this build a
  customer sees the button disabled and payment remains outside the application. What is missing is hosting,
  not code.
- **This installer has not been run.** 4.0.3 is verified from its build output, not from an installation.
  Upgrade over a previous version, installation on a clean machine and complete uninstallation remain untested.
- **`/goal budget` was exercised against the real storage layer and the command handler**, not through a live
  model turn, because our test environment has no provider credential to spend.
- **Arabic and French cover about 14% of interface text**; the rest is shown in English.
- **Computer Use is not part of the Windows package.** Its helper is not shipped, so the app still reports an
  absent runtime for it on launch — this release makes that report accurate, it does not make the feature
  available.
- **The in-app update check still asks a service we do not operate.** By default this build resolves its
  update manifest against `https://zcode.z.ai` — the origin the upstream project ships — because no Idexal
  update feed has been published yet. That service answers with its own version list, so nothing is offered
  to us there only because our numbering sorts higher. The address written into the installer's own update
  configuration is a placeholder the packaging tool requires, and the application replaces it when it starts;
  it is not what the app asks. Publishing an Idexal-operated feed is an open item, and until then upgrades
  mean downloading the new installer from this page.
- **No model turn was run from the published binary**, because our test environment has no provider
  credential to spend.
- **Not signed or notarised**, so Windows will show a SmartScreen warning.

## 4.0.2 · Alpha — 2026-09-30

Changes you can see in the terminal and in your subscription state, plus fixes that were invisible
until they were checked. Nothing in this release changes your sessions, workspaces, credentials or
settings, and no behaviour of an existing model request changes.

### What changed

- **The terminal can now tell you what you are on.** `idexal plan` prints your active plan and the
  remaining quota, as text or with `--json`. Before this, subscription state was readable only in the
  desktop app.
- **A signed-out terminal run now says to sign in.** Running a prompt without a provider used to report
  a generic model-creation failure. It now names the cause and the remedy: configure a provider or sign
  in with `/login`.
- **Subscription state is tied to the account that earned it.** The cached plan and quota are now keyed on
  your account rather than on a screen refresh, and signing out clears the cache. Previously, a second
  account on the same machine could be shown the first account's plan for as long as ten minutes after
  sign-in.
- **Browser session recordings capture page console output.** The recorder asked for it in a form the
  runtime never calls, so every recorded console line was stored with no level and no message.
- **Prepared but not yet used:** the rule that decides whether a failing model may move to the next one
  in a chain now exists and is tested, but nothing calls it yet — Idexal still does not switch models on
  its own.
- **Internal correctness, not behaviour.** A type gate now covers the desktop process, the preload
  bridge, the renderer and the scheduler, which no build step had ever checked; it surfaced six
  defects, of which the recorder above is the only one users could observe. The rest were real but
  silent: a DNS guard whose return type did not match what it asked for, a print-to-PDF export slicing
  a shared buffer instead of allocating one, two code branches for a remote-connection type the
  protocol has never contained, a helper version check that looked adjustable when it was fixed to the
  build, and eight parameters that were unchecked. Their behaviour is unchanged.

### What we verified on this build

- The installer and the program inside it both carry file and product version `4.0.2` under the
  production identity (`ProductName = Idexal`), not a preview one.
- The ownership manifest is present with 87 entries and no unowned file, both in the unpacked payload
  and inside the installer archive (89 files, 39 folders), so an upgrade can tell which files it owns
  from the ones it does not.
- The packaged locale set is exactly Arabic, English and French.
- The terminal binary runs as a single file on Node `v24.14.0` and reports `0.16.9`, which is the
  version this release's terminal line declares. The terminal's own version did not move with the
  release: the two binaries for 4.0.1 and 4.0.2 both report `0.16.9`.
- On a fresh, empty data directory the terminal reports `0.16.9`, `node: v24.14.0`,
  `platform: win32/x64`, `sea: yes`, and a signed-out non-interactive run prints the sign-in
  message above. No model request was made.
- The release was built from committed source in a separate checkout, so it contains exactly what is in
  version control. Building it from a clean tree was itself a fix: two shared-contract imports the
  terminal uses were unreachable to the desktop bundler, which is now caught by a test rather than by a
  failed release.

### Checksums

| Asset                          | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `Idexal-4.0.2-win-x64.exe`     | `32bcef80392df6c561799153606ee53857ff3415843820b2fcf6a7747bbf973e` |
| `Idexal-CLI-4.0.2-win-x64.exe` | `b26caee3e08ab3bf392d3d2e35b3d96bb384fd2efe63257cc70b1650844e0c46` |

### Open in this Alpha

- **This installer has not been run.** 4.0.2 is verified from its build output, not from an
  installation. Upgrade over a previous version, installation on a clean machine and complete
  uninstallation remain untested.
- **Arabic and French cover about 14% of interface text**; the rest is shown in English.
- **Computer Use is not part of the Windows package.** Its helper is not shipped, so the app reports a
  missing runtime for it on launch.
- **The in-app update check still asks a service we do not operate**, which answers with its own
  version list; nothing is offered to us only because our numbering sorts higher.
- **Nothing can be bought inside the app today.** Subscriptions are shown as coming soon, and payment
  happens outside the app.
- **No model turn was run from the published binary**, because our test environment has no provider
  credential to spend.
- **Not signed or notarised**, so Windows will show a SmartScreen warning.

## 4.0.1 · Alpha — 2026-09-27

A fixes-only release on top of 4.0.0. Nothing in it changes your sessions, workspaces,
credentials or settings.

### What changed

- **What happens after an interrupted answer is now decided by the failure's own structured
  fields, not by the wording of its message.** Before this, a provider rephrasing an error
  could turn a clean stop into a retry, or a retry into a stop. A failure Idexal cannot
  classify is now reported as unclassified instead of being guessed at.
- **Prompt suggestions and scheduled-task templates no longer fall back to a language outside
  Arabic, English and French.** An item with no text in a shipped language could display a
  fourth language; it now shows nothing rather than the wrong thing, and a suggestion with
  neither a label nor an action is hidden instead of rendered empty.
- **A subagent's result is described by one contract.** The list of fields a subagent returns
  is now derived from the code that produces them, so a result cannot be advertised one way
  and delivered another.
- **Syncing model-provider settings between machines no longer fails when a reserve model list
  is stored.** The stored list made the export refuse its own payload. Export now leaves those
  per-machine settings at home, and import no longer clears the receiving machine's own list.
- **Prepared but not yet used:** storage for per-purpose reserve model lists. Behaviour is
  unchanged — Idexal still does not switch models on its own.

### What we verified on this build

- The installer and the program inside it both carry file and product version `4.0.1` under
  the production identity (`ProductName = Idexal`), not a preview one.
- The ownership manifest is present with 87 entries and no unowned file, both in the unpacked
  payload and inside the installer archive (89 files, 39 folders), so an upgrade can tell
  which files it owns from the ones it does not.
- The packaged locale set is exactly Arabic, English and French.
- The terminal binary runs as a single file on Node `v24.14.0` and reports `0.16.9`, which is
  the version this release's terminal line declares.
- The built application starts from its own package and was walked through the signed-out
  screen, the workspace, a new task, Automations and the Plugin Marketplace with **no uncaught
  exceptions and no console errors**, no horizontal overflow, no overlapping or off-screen
  controls, and no broken images. Renderer memory grew from 22.3 MB to 31.9 MB as those
  screens loaded and did not keep climbing while idle.
- Both files below were staged by the release tooling; the publisher checks these checksums
  against what GitHub actually serves.

### Checksums

| File                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `Idexal-4.0.1-win-x64.exe`     | `b9c2061e5d1d1013960dfef0164ba73a77a3433ab5324ccb881e4cb140999c0a` |
| `Idexal-CLI-4.0.1-win-x64.exe` | `5e27eddd433409c8a5a524ecf93cf585f7d2850bfd8d270663e61eb383d8afd1` |

### Open in this Alpha

- **This installer has not been run.** 4.0.1 is verified from its build output, not from an
  install: a clean-machine install, an upgrade over a previous version and a complete
  uninstall are still unverified. The install-and-launch test recorded under 4.0.0 covers the
  wizard itself, not this specific file.
- **Arabic and French cover about 14% of interface text**; the rest is shown in English. This
  was already true in 4.0.0, and we state it because the product is sold in those languages.
- **Computer Use is not part of the Windows package.** Its helper is not shipped, so the app
  records one start-up message about it on every launch.
- **The in-app update check still asks a service we do not operate**, which answers with its
  own release line. Download the installer for the version you want from this page instead.
- **Nothing can be bought inside the app today.** Subscriptions are shown as coming soon, and
  in-app payment for the international account type is refused by the code.
- **No model turn was run from the published binary**, because our test environment has no
  provider key. Runtime introspection, skill discovery and plugin install were driven from a
  cold data directory.
- **Not signed or notarised**, so Windows will show a SmartScreen warning.

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
  stays with you. In this release the check does not read the Releases page — see
  _Open in this Alpha_.

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
- The terminal binary was driven, from the published download itself and against an
  empty data directory: it reports its runtime (`node v24.14.0`, packaged as a single
  executable), lists 11 skills, installs the official plugin marketplace into that
  directory and lists the two plugins it fetched, and lists custom commands. Each
  exited cleanly. A prompt without a provider key fails rather than hanging, though
  the message it prints is not yet the helpful one we want.
- Each download attached to this release is the same file we built, checked by SHA-256
  after publication, and served to visitors who are not signed in.

### Checksums

| File                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `Idexal-4.0.0-win-x64.exe`     | `e4cf64d7df5593ffd53da1d0402c1d1a6c733a0e34375dc8fe4b795fd5592644` |
| `Idexal-CLI-4.0.0-win-x64.exe` | `ab1907f03071acb4a993ad74a86d0f5cb33a769bc3784c77caed72feb7ba6f42` |

### Open in this Alpha

- **Not signed or notarised.** Windows will show a SmartScreen warning, and there
  are no macOS or Linux packages yet. These are Beta and Stable requirements, not
  Alpha ones.
- **One machine, and not a clean one.** The install above happened where Idexal was
  already in use. A clean Windows machine, an upgrade from a previous version, and a
  complete uninstall that leaves nothing of the program behind are still to be
  verified; until those pass, this stays Alpha.
- **No model turn from the published binary.** Runtime introspection, skill discovery
  and a marketplace plugin install were driven from a cold data directory, but a full
  agent session needs a provider key, and our test environment has none. An
  unauthenticated prompt currently answers `Model creation failed` plus a trace id;
  that message is on our list to fix.
- **Model provider list may come up empty on first launch.** During our run the
  built-in provider configuration could not refresh, so add your own provider key
  in Settings if no models appear.
- **The in-app update check does not use this page.** In 4.0.0 it asks a service we
  do not operate, and that service answers with its own release line: in our run it
  reported `3.14.3`, so nothing was offered only because 4.0.0 is newer. Until the
  update feed is Idexal-operated, upgrade by downloading the installer for the
  version you want from this page and running it — your sessions, workspaces and
  settings are kept.
- **Arabic and French wizard text has not been reviewed on screen** by a reader
  of those languages, although the strings ship in all three.

---

## Before 4.0.0

Development history for the 3.x line was kept in the private source repository
and is not published here. It is referenced only where it explains a behaviour in
4.0.0.
