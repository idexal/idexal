# Security policy

## Reporting a vulnerability

Email <contact@idexal.com> with the subject line starting `Idexal security`.
Please include:

- the Idexal version and channel (for example `4.0.0 Alpha`) and your platform;
- the affected surface — desktop, browser client, terminal, or the remote
  connection between them;
- steps to reproduce, or a proof of concept;
- the impact you believe is reachable.

We acknowledge reports within **3 business days** and aim for a fix or a
mitigation plan within **30 days** for confirmed issues. We will tell you which
release carries the fix.

## Scope

Idexal executes tools, terminals and file operations **on your own machine, in
your own workspace**. That is a deliberate design choice, not a vulnerability:
an agent that can act on your behalf can also be steered into acting badly.
Reports that amount to "the agent can run what I ask it to run" are out of
scope unless you can show the product bypasses its own permission controls.

In scope, for example:

- a path that lets a project, a repository file, a web page or a chat message
  escalate beyond the permission level the user granted;
- a way to read another workspace's data, or another window's session;
- credential or token exposure in logs, on disk, or over the remote link;
- a remote-connection authentication or pairing bypass;
- arbitrary code execution from a crafted release feed, installer or update.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest Stable | Yes |
| Previous Stable | Security fixes only, for 6 months |
| Beta / Alpha | Best effort |

## Data handling notes

- Desktop sessions run against a local host process; the phone connects to an
  existing desktop session rather than starting a new one.
- Update checks are made against the configured release feed. Nothing is
  downloaded or installed without your acceptance.
- Application data is stored under your Idexal data directory. See
  [SUPPORT.md](SUPPORT.md) for how to collect a diagnostic bundle, and remove
  anything you consider sensitive before sending it.

Please do not open a public issue for a suspected vulnerability.
