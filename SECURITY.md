# Security policy

Idexal runs tools, terminals and file operations **on your own machine, in your own
workspace**. That is a deliberate design choice, not a vulnerability — but it means a
real security flaw in Idexal can matter more than the same flaw in a product that only
answers questions. We would rather hear about it from you than learn from an incident.

## Reporting a vulnerability

**Please do not open a public issue for a suspected vulnerability.**

Use either channel:

- **GitHub private security advisory** — the *Security* tab of this repository →
  *Report a vulnerability*. This keeps the report private to the maintainers while it is
  still exploitable, and gives you a thread with a state you can follow.
- **Email** — <contact@idexal.com> with a subject line starting `Idexal security`.

Include, as far as you can:

- the Idexal version and channel (for example `4.0.5 Alpha`) and your platform;
- the affected surface — desktop app, browser client, terminal binary, or the remote
  connection between a phone and a desktop session;
- steps to reproduce, or a proof of concept;
- the impact you believe is reachable, and whose data or machine it reaches.

Reachable-but-ugly beats theoretical-and-elegant. A working reproduction of a two-line
procedure is more useful than a long analysis of an attack we cannot demonstrate.

## What you can expect from us

- We will tell you which release carries the fix, and we will say so in that release's
  notes when the fix changes a default that users relied on.
- We will credit the reporter here unless you ask us not to name you.
- A reachable exploit is handled ahead of feature work.

We are deliberately **not publishing acknowledgement or fix deadlines on this page**. A
number written on a public policy becomes a commitment, and we would rather make a
commitment we can keep than one that quietly lapses. If a specific response time matters
to you — for example because you are coordinating disclosure — say so in the report and we
will agree a timeline with you for that case.

## Scope

**In scope**, for example:

- a path that lets a project, a repository file, a web page or a chat message escalate
  beyond the permission level the user granted;
- a way to bypass the approval layer for an action that should require it;
- a way to read another workspace's data, or another window's session;
- credential or token exposure in logs, on disk, or over the remote link;
- a remote-connection authentication or pairing bypass;
- arbitrary code execution from a crafted release feed, installer or update;
- an update or install path that accepts a build which is not ours — including a checksum
  mismatch that still installs.

**Out of scope**, generally:

- prompt-injection that only changes the model's answer for the person who sent it;
- the fact that the agent can run what its user asks it to run, unless you can show the
  product bypassing its own permission controls;
- your model provider's availability, content policy or billing — their endpoints are
  theirs;
- a malicious script inside your own repository that the agent executed with your
  permissions; that is a supply-chain problem in the project, not a hole in the app;
- a third-party MCP server or plugin you chose to install. Review what it can reach. We
  handle look-alike identities as described in the product documentation, but installing
  untrusted software is a decision you make.

## Supported versions

Security attention goes to the **latest published release** first. Whether an older
release also receives a fix is decided per case by severity and by how many installs can
actually reach the flaw — we are not promising a fixed support window here, because we do
not operate the infrastructure that would make that promise reliably. If you are running
an older version in a restricted environment, tell us in the report; it changes what we can
reasonably ask of you.

## Data handling notes

- Desktop sessions run against a local host process; a phone connects to an existing
  desktop session rather than starting a new one.
- Update checks are made against the configured release feed. Nothing is downloaded or
  installed without your acceptance.
- Application data lives under your Idexal data directory. See
  [SUPPORT.md](SUPPORT.md) for where that directory is and which log covers the failing
  window. There is no one-command diagnostic bundle: send the narrowest log that shows the
  problem, redacted.
- Provider API keys are write-only in the interface. They are not shown back, and they are
  not attached to anything another person can see.

## Safe harbour

We consider research and responsible disclosure conducted under this policy to be
authorised. We will not initiate or support legal action against you for good-faith
research on the installed product, and we will not treat a report under this policy as a
violation. Please give us the chance to fix something before describing it publicly, and
tell us if you plan a coordinated disclosure date so we can work to it.

Publicly disclosing an unfixed issue does not create an obligation on us, but it does
usually cost other users their safe period, so we ask for coordination first.
