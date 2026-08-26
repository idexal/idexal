---
name: google-cloud-filestore-autoscale
metadata:
  category: Storage
description: >-
  Inspects Google Cloud Filestore capacity and utilization, evaluates storage
  scaling rules, and performs capacity autoscaling (scale UP for low free space
  or scale DOWN for cost optimization). Use when monitoring Filestore instance
  headroom, resizing instance shares, configuring automated growth/shrink
  thresholds, or preventing out-of-space outages. Don't use for Cloud Storage
  (GCS) buckets, Persistent Disk block storage, or NetApp Volumes.
---

# Google Cloud Filestore Autoscale

This skill enables agents to inspect, evaluate, and modify Google Cloud
Filestore instance capacities across GCP projects based on configured
thresholds.

## Quick Start

1. Ensure `gcloud` is installed. See [gcloud installation guide](https://cloud.google.com/sdk/docs/install) if needed.
2. Enable essential APIs:
   ```bash
   gcloud services enable file.googleapis.com monitoring.googleapis.com --quiet
   ```
2. Inspect fleet capacity and free space (see "Discovery & Read Operations" below).
3. Evaluate against configured up/down capacity thresholds.
4. Scale target instances and apply attribution tags.

## Attribution

Tag every Cloud Filestore command or API request provided or executed.
Prefix `gcloud` commands with the correct metrics environment targeting this skill:

```bash
CLOUDSDK_METRICS_ENVIRONMENT="gcs-skills gcs-skills/1.0 (skill:google-cloud-filestore-autoscale)" \
gcloud filestore instances update ...
```
On direct HTTP calls to the REST API, append the `User-Agent`:
```
User-Agent: gcs-skills/1.0 (skill:google-cloud-filestore-autoscale)
```

## Conceptual & Informational Queries (CRITICAL)

For purely conceptual, educational, or informational questions (e.g., "What are Filestore scaling limits?",
"Can Basic instances scale down?", "Explain Filestore Tiers"):
*   **Rule**: **Answer immediately using your pre-trained knowledge and the matrix below.**
*   **Constraint**: **Do not execute external tool calls or API requests** for basic knowledge questions.

## Handling "No-Command" Constraints (CRITICAL)

If the user prompt contains constraints like "Do not execute commands", "without executing", or "read-only":
*   **Rule**: **Strictly avoid calling the `run_command` tool** to execute any shell or `gcloud` commands (including read-only list/describe commands).
*   **Discovery**:
    1.  First, check if Filestore MCP tools (`list_instances`, `get_instance`) are available and use them (these are API calls, not command executions).
    2.  If MCP tools are not available, search local markdown documentation files (e.g., `references/instance-tiers-specs.md`) for any mock instance definitions or project details matching the request. (Do NOT attempt to read evaluation config files such as `EVAL.yaml` or `EVAL.txtpb` during evaluation runs as access is restricted).
    3.  If no data can be found, explain the required steps and formulas, and output the exact commands the user should run, without executing them yourself.
*   **Mandatory User Confirmation Requirement**: Even when the user prompt asks not to execute commands or asks only for command syntax/recommendations, your response MUST STILL end with a clear question prompting the user for confirmation before executing any capacity resizing commands (e.g., *"Would you like me to proceed with scaling `[instance]` from [A] TiB to [B] TiB? Please confirm to execute."*).

## Tier & Capacity Limits Matrix

Filestore tiers enforce specific boundaries and behaviors. The skill must accept both modern UI names (`Basic`, `Zonal`, `Regional`) and legacy API enums interchangeably.

See `references/instance-tiers-specs.md` for the full Tier & Capacity Limits Matrix (Min/Max capacities, step increments).

**Critical Thresholds:**
- **Basic HDD / Basic SSD**: Can scale up, but **cannot scale down**.
- **Zonal / Regional**: Can scale down, but cannot shrink below their minimum floor (1 TiB or 10 TiB depending on band) AND cannot shrink below the current `used_bytes` metric.

## Core Operational Workflow

### 1. Discovery & Read Operations

- **MCP-First**: Prefer using Filestore MCP tools (`list_instances`, `get_instance`) to discover and inspect fleet capacity.
- **CLI Fallback**: If MCP is unavailable, use `gcloud filestore instances list --project={project_id}`. You MUST ask for the Project ID if not provided (e.g., "to avoid inspection of unrelated projects in a multi-project environment").
- **Utilization**: Fetch the 5-minute average of `file.googleapis.com/nfs/server/used_bytes` from the Cloud Monitoring API to evaluate `used_bytes`. If you cannot fetch this programmatically, state the formulas explicitly for the user.

### 2. Autoscale Needed Matrix

The skill must categorize each evaluated instance into one of 5 definitive verdicts. On the initial analysis/fleet inspection run, the skill suggests the required scaling action with target capacity and update commands, and **prompts for user confirmation before executing any autoscale modifications**. State the value of the "Autoscale Needed" column clearly as one of the following:

- **Yes (Scale Up)**: Triggered when free space percentage is below the scale-up safety threshold (< 15% free space remaining). The evaluation response MUST explicitly state that the current free space percentage is below the 15% scale-up safety threshold. Capacity must be increased by 10% (default) or step-size minimum, rounded to the tier's step increment, not exceeding the maximum capacity. Suggest target capacity, provide the attributed `gcloud` update command, and MUST conclude the response with a clear question prompting the user for confirmation to execute (e.g., *"Would you like me to proceed with scaling `[instance]` from [A] TiB to [B] TiB? Please confirm to execute."*).
- **Yes (Scale Down)**: Triggered when free space exceeds the scale-down threshold (> 30% free space remaining) and the instance is eligible for downscaling. Capacity must be decreased by 10% (default), rounded to step size. Target capacity must be `>= max(tier_min, used_bytes)`. Suggest target capacity, cost savings, and provide the attributed `gcloud` update command, prompting the user for confirmation to execute.
- **No (Healthy)**: Triggered when the instance's free space is within the optimal operating range (15% – 30%). No action required.
- **No (At min capacity limit)**: Triggered when free space is > 30%, but the instance is already at the minimum allowed tier capacity floor (e.g. 1 TiB or 10 TiB) or currently used space limit. No action can be taken.
- **No (Tier cannot scale down)**: Triggered when free space is > 30%, but the instance is on a Basic tier (Basic HDD / Basic SSD) which does not support downscaling. The agent must explicitly inform the user that scale-down is not supported and suggest data migration instead. No action can be taken.

### Output Format

**Every status report, evaluation, or recommendation response MUST include a markdown table summarizing the evaluated instances.** Even if evaluating a single instance, format it as a table.
The table MUST contain the following columns:
*   `Instance`
*   `Service Tier`
*   `Provisioned Capacity`
*   `Used Bytes`
*   `Free Space %`
*   `Autoscale Needed` (MUST contain one of: `Yes (Scale Up)`, `Yes (Scale Down)`, `No (Healthy)`, `No (At min capacity limit)`, or `No (Tier cannot scale down)`)

### 3. Execution & Confirmation Workflow

1. **Analysis & Recommendation (First Run / Inspection)**:
   - Calculate step-aligned target capacity adhering to tier ceilings, floors, and basic scale-up only rules.
   - Present the summary table and proposed actions.
   - **MANDATORY USER CONFIRMATION PROMPT**: Whenever recommending target capacity or providing a `gcloud filestore instances update` command, your response MUST explicitly include a clear question asking the user to confirm execution before any modifications are made (e.g. *"Would you like me to proceed with scaling `[instance]` from [A] TiB to [B] TiB? Please confirm to execute."*) to prevent accidental billing spikes or capacity exhaustion.
   - **Do not execute autoscale commands without user confirmation.**
2. **Execution upon Confirmation**:
   - Once the user confirms (e.g., "Yes, proceed with scaling", "Scale instance X"), execute the attributed `gcloud filestore instances update` command on the confirmed instance(s).
3. **Fallback**:
   - If execution fails due to Prod mutation restrictions, output the failure reason and provide the user with the exact attributed `gcloud` command to run manually, reminding them to confirm before manual execution.

### Custom Thresholds
If the user passes custom threshold values in prompts (e.g. "Scale up if free space drops below 10% with a 20% step"), apply these globally across projects for the active session and acknowledge the new configuration. **You MUST explicitly state in your response that these custom thresholds apply globally across all projects in the active session memory.**

## Reference Directory

For progressive disclosure of deeper topics, consult the `references/` directory:
- [Instance Tiers & Specs](references/instance-tiers-specs.md)
- [Monitoring Metrics Formulas](references/monitoring-metrics.md)
- [Troubleshooting & Errors](references/troubleshooting-errors.md)
