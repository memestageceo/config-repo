---
title: mock 53
description: These exercises use real-world workload types — Deployments, StatefulSets, Jobs, CronJobs, and DaemonSets.
tags: mock, k8s, bash
---

Every exercise mixes at least two of: command/args shell scripting, ConfigMaps, Secrets, Downward API, and shared volumes.
No solutions are provided.

---

## Exercise 1 — Deployment with a Logging Sidecar and Log Rotation

**Scenario:** You have a web-app Deployment whose main container writes structured logs to a shared volume. A sidecar is responsible for shipping those logs (simulated here by printing them). A third init container pre-creates the log directory with the correct permissions.

**Requirements:**

Create a namespace `weblog`.

Create a ConfigMap `log-config` in `weblog` with:
```
LOG_PATH=/var/log/app
LOG_FILE=app.log
MAX_ENTRIES=100
```

Create a Deployment `web-logger` in `weblog` with **2 replicas** and **3 containers**:

**Init container** — `dir-setup` (`busybox`):
- Reads `LOG_PATH` from the ConfigMap as an env var.
- Creates the directory at `$LOG_PATH` and writes a file `init.txt` containing the text `directory created by init at <timestamp>` using command substitution.

**Main container** — `app` (`busybox`):
- Reads `LOG_PATH`, `LOG_FILE`, and `MAX_ENTRIES` as env vars from the ConfigMap.
- Also exposes `MY_POD_NAME` and `MY_POD_IP` via the Downward API as env vars.
- Runs an infinite loop that every 2 seconds appends a JSON-like line to `$LOG_PATH/$LOG_FILE`:
  ```
  {"pod":"<MY_POD_NAME>","ip":"<MY_POD_IP>","entry":<counter>,"ts":"<date>"}
  ```
- When `counter` exceeds `MAX_ENTRIES`, reset it to 0 and truncate the log file (overwrite instead of append on that iteration).

**Sidecar container** — `log-shipper` (`busybox`):
- Reads `LOG_PATH` and `LOG_FILE` from the ConfigMap as env vars.
- Waits until `$LOG_PATH/$LOG_FILE` exists (poll in a loop with `sleep 1`), then runs `tail -f` on it.

All three containers share an `emptyDir` volume at `/var/log/app`.

**Verify:**
- `kubectl logs <pod> -c log-shipper` shows JSON lines with correct pod name and IP.
- Both replicas use their own pod name/IP in the log entries.

---

## Exercise 2 — StatefulSet with Per-Pod Identity via Downward API and Init Container

**Scenario:** A StatefulSet where each pod must generate a unique config file on startup based on its own identity — pod name, ordinal index (parsed from the pod name), and namespace.

**Requirements:**

Create a namespace `stateful-app`.

Create a Secret `cluster-secret` in `stateful-app` with:
```
CLUSTER_TOKEN=tok3n-xyz-9999
JOIN_KEY=s3cur3-join-k3y
```

Create a StatefulSet `identity-sts` in `stateful-app` with **3 replicas**, image `busybox`, and **no** headless service needed for this exercise.

**Init container** — `config-gen` (`busybox`):
- Exposes `MY_POD_NAME` and `MY_NAMESPACE` via Downward API as env vars.
- Mounts the Secret `cluster-secret` as a **volume** at `/etc/cluster-secret` (not as env vars).
- Parses the ordinal from `MY_POD_NAME` (the number after the last `-`) using shell string manipulation — no external tools.
- Writes `/shared/node.conf` with content like:
  ```
  NODE_ID=<ordinal>
  NODE_NAME=<MY_POD_NAME>
  NAMESPACE=<MY_NAMESPACE>
  TOKEN=<contents of /etc/cluster-secret/CLUSTER_TOKEN file>
  JOIN_KEY=<contents of /etc/cluster-secret/JOIN_KEY file>
  ```

**Main container** — `node` (`busybox`):
- Waits for `/shared/node.conf`, then prints its full contents once and sleeps indefinitely.

Share an `emptyDir` at `/shared` between init and main containers.

**Verify:**
- Each pod prints a `node.conf` with the correct `NODE_ID` (0, 1, 2).
- Token and join key values are correctly read from the secret volume.

---

## Exercise 3 — Job with Retry Logic and Exit Code Control via Args

**Scenario:** A data-processing Job that simulates flaky work. It should retry on failure (up to 4 times), and the container itself decides success or failure based on a config value.

**Requirements:**

Create a namespace `batch`.

Create a ConfigMap `job-config` in `batch` with:
```
FAILURE_THRESHOLD=3
WORK_UNITS=10
```

Create a Job `flaky-processor` in `batch`:
- `backoffLimit: 4`
- `completions: 1`
- Image: `busybox`
- Injects `FAILURE_THRESHOLD` and `WORK_UNITS` as env vars from the ConfigMap.
- Also exposes `MY_POD_NAME` via Downward API.
- The container's shell script must:
  1. Print `Starting job on pod $MY_POD_NAME`.
  2. Loop from 1 to `$WORK_UNITS`, printing `Processing unit <n>` with a `sleep 0.5` between each.
  3. After the loop, generate a random number between 1 and 10 using `$RANDOM` and shell arithmetic.
  4. If the random number is less than or equal to `$FAILURE_THRESHOLD`, print `FAILED: random=<n>, threshold=$FAILURE_THRESHOLD` and exit with code `1`.
  5. Otherwise print `SUCCESS: random=<n>` and exit `0`.

Write the entire logic in the `args` field (using `sh -c` in `command`). Do not use a ConfigMap-mounted script file.

**Verify:**
- `kubectl get job flaky-processor` eventually shows `1/1` completions after some retries.
- `kubectl describe job flaky-processor` shows retry history.

---

## Exercise 4 — CronJob that Archives Logs from a Shared PVC

**Scenario:** An always-running Deployment writes logs to a file on a shared `emptyDir`. A CronJob periodically reads those logs and writes an archive summary. Both share a volume — but since CronJobs spin up new pods, the volume must be a `hostPath` (use `/tmp/app-logs` on the node) to simulate persistence.

> **Note:** In a real cluster this would use a PVC. For this exercise, use `hostPath` with path `/tmp/app-logs` and type `DirectoryOrCreate`.

**Requirements:**

Create a namespace `archive`.

Create a ConfigMap `archive-config` in `archive` with:
```
LOG_FILE=/logs/app.log
ARCHIVE_DIR=/logs/archives
LINES_PER_SUMMARY=20
```

**Deployment** `log-producer` in `archive` (1 replica, `busybox`):
- Reads `LOG_FILE` from the ConfigMap.
- Infinite loop: every 1 second append `<timestamp> - event <counter>` to `$LOG_FILE`.
- Mounts the `hostPath` volume at `/logs`.

**CronJob** `log-archiver` in `archive` (schedule: every 2 minutes — use `*/2 * * * *`):
- Reads `LOG_FILE`, `ARCHIVE_DIR`, and `LINES_PER_SUMMARY` from the ConfigMap.
- Also exposes `MY_POD_NAME` via Downward API.
- The job's shell script must:
  1. Create `$ARCHIVE_DIR` if it doesn't exist.
  2. Read the last `$LINES_PER_SUMMARY` lines from `$LOG_FILE` using `tail`.
  3. Write them to `$ARCHIVE_DIR/summary-<timestamp>.txt`.
  4. Print `Archived by $MY_POD_NAME at <timestamp>: <line-count> lines written`.
- Mounts the same `hostPath` volume at `/logs`.
- Set `successfulJobsHistoryLimit: 3` and `failedJobsHistoryLimit: 1`.

**Verify:**
- After 2+ minutes, `kubectl logs <archiver-pod>` shows the archive message.
- Files appear under `/tmp/app-logs/archives/` on the node.

---

## Exercise 5 — DaemonSet Node Agent with Downward API and Secret Token Auth

**Scenario:** A DaemonSet that runs a monitoring agent on every node. Each agent identifies itself using its node name (Downward API), authenticates using a shared secret token, and writes a per-node heartbeat file to a `hostPath` directory.

**Requirements:**

Create a namespace `monitoring`.

Create a Secret `agent-auth` in `monitoring` with:
```
AUTH_TOKEN=node-agent-s3cr3t
ENDPOINT=https://monitor.internal/ingest
```

Create a ConfigMap `agent-config` in `monitoring` with:
```
HEARTBEAT_INTERVAL=5
AGENT_VERSION=1.2.0
```

Create a DaemonSet `node-agent` in `monitoring` (`busybox` image) with:
- `MY_NODE_NAME` exposed via Downward API (use `spec.nodeName` field ref).
- `MY_POD_NAME` and `MY_NAMESPACE` exposed via Downward API.
- `AUTH_TOKEN` and `ENDPOINT` injected from the Secret using `secretKeyRef` (env vars, not volume).
- `HEARTBEAT_INTERVAL` and `AGENT_VERSION` from the ConfigMap as env vars.
- Mounts a `hostPath` volume (`/tmp/agent-heartbeats`, type `DirectoryOrCreate`) at `/heartbeats`.
- The container runs an infinite loop that every `$HEARTBEAT_INTERVAL` seconds writes a file `/heartbeats/$MY_NODE_NAME.json` with content:
  ```json
  {"node":"<MY_NODE_NAME>","pod":"<MY_POD_NAME>","ns":"<MY_NAMESPACE>","version":"<AGENT_VERSION>","token":"<first 6 chars of AUTH_TOKEN>...","ts":"<date>"}
  ```
  Truncate the token to its first 6 characters using shell string slicing: `${AUTH_TOKEN:0:6}`.

**Verify:**
- A `.json` file exists under `/tmp/agent-heartbeats/` for each node.
- The token field shows only the first 6 characters followed by `...`.

---

## Exercise 6 — Multi-Stage Job with Init + Sidecar Coordination via Shared Volume and Exit File

**Scenario:** A Job where the main container performs work and a sidecar monitors progress. The sidecar must exit cleanly when the main container is done — without using `shareProcessNamespace`. Use an exit-file convention on a shared volume.

**Requirements:**

Create a namespace `pipeline`.

Create a ConfigMap `pipeline-cfg` in `pipeline` with:
```
STAGES=5
STAGE_DURATION=3
OUTPUT_DIR=/work/output
```

Create a Secret `pipeline-creds` in `pipeline` with:
```
PIPELINE_ID=pipe-2024-alpha
SIGN_KEY=abc123def456
```

Create a Job `staged-pipeline` in `pipeline`:
- `backoffLimit: 0`
- Two containers (not init — both must run concurrently):

**Container 1** — `worker` (`busybox`):
- Reads `STAGES`, `STAGE_DURATION`, `OUTPUT_DIR` from ConfigMap as env vars.
- Reads `PIPELINE_ID` and `SIGN_KEY` from Secret as env vars.
- Exposes `MY_POD_NAME` via Downward API.
- The shell script:
  1. Creates `$OUTPUT_DIR`.
  2. Loops through stages 1 to `$STAGES`. For each stage:
     - Prints `[worker] Stage <n>/$STAGES starting`.
     - Writes `$OUTPUT_DIR/stage-<n>.txt` with content: `stage=<n> pipeline=$PIPELINE_ID pod=$MY_POD_NAME signed=<first-8-chars-of-SIGN_KEY>`.
     - Sleeps `$STAGE_DURATION` seconds.
     - Prints `[worker] Stage <n> complete`.
  3. After all stages, writes `/work/done` (empty file) to signal completion.
  4. Prints `[worker] All stages complete. Exiting.` and exits `0`.

**Container 2** — `monitor` (`busybox`):
- Reads `STAGES` and `OUTPUT_DIR` from ConfigMap as env vars.
- The shell script:
  1. Polls every 2 seconds. On each poll:
     - Counts how many `stage-*.txt` files exist in `$OUTPUT_DIR` using `ls | wc -l` (handle missing dir gracefully).
     - Prints `[monitor] <n>/$STAGES stages completed`.
  2. When `/work/done` exists, prints `[monitor] Worker finished. Shutting down.` and exits `0`.

Share an `emptyDir` at `/work` between both containers.

**Verify:**
- `kubectl logs <pod> -c worker` shows all stage completions.
- `kubectl logs <pod> -c monitor` shows progress updates and a clean shutdown message.
- `kubectl get job staged-pipeline` shows `1/1` completions.

---

## Exercise 7 — Deployment Rolling Update with ConfigMap-Driven Behavior Change

**Scenario:** You have a running Deployment whose container behavior is entirely driven by a ConfigMap. You must update the ConfigMap and trigger a rolling restart, then verify the new behavior — all without deleting the Deployment.

**Requirements:**

Create a namespace `rollout`.

Create a ConfigMap `app-behavior` in `rollout` with:
```
MODE=verbose
REPEAT=3
MESSAGE=hello from kubernetes
```

Create a Deployment `configurable-app` in `rollout` with **3 replicas** (`busybox`):
- Injects `MODE`, `REPEAT`, and `MESSAGE` as env vars from the ConfigMap.
- Also exposes `MY_POD_NAME` via Downward API.
- The shell script runs an infinite loop:
  - If `MODE=verbose`: every 4 seconds, print `[verbose][<MY_POD_NAME>] <MESSAGE>` repeated `$REPEAT` times (each on its own line using a nested loop).
  - If `MODE=quiet`: every 4 seconds, print only `.` (a dot).

**Part A:** Deploy and verify verbose mode is active in pod logs.

**Part B:** Update the ConfigMap:
```
MODE=quiet
REPEAT=3
MESSAGE=hello from kubernetes
```
Then trigger a rolling restart using the appropriate `kubectl` command (not `kubectl delete`).

**Verify:**
- Old pods show verbose output before the restart.
- New pods show only `.` after the restart.
- During the rollout, at least one old and one new pod are running simultaneously — confirm this by watching `kubectl get pods -n rollout` during the restart.

---

## Exercise 8 — CronJob + Init Container + Downward API Volume (Not Env Vars)

**Scenario:** A CronJob whose init container uses a Downward API **volume** (not env vars) to read pod labels, and uses those label values to name its output file.

**Requirements:**

Create a namespace `scheduled`.

Create a ConfigMap `schedule-cfg` in `scheduled` with:
```
REPORT_DIR=/data/reports
ITEM_COUNT=5
```

Create a Secret `schedule-secret` in `scheduled` with:
```
REPORT_TOKEN=rpt-t0k3n-x99
```

Create a CronJob `labeled-reporter` in `scheduled` (schedule: `*/3 * * * *`) with the following pod template:

**Pod labels** (set on the pod template):
```
app: reporter
env: staging
team: infra
```

**Init container** — `label-reader` (`busybox`):
- Mounts a Downward API volume at `/etc/podinfo` exposing these labels as a file: `labels`.
- Mounts a shared `emptyDir` at `/data`.
- The shell script:
  - Reads `/etc/podinfo/labels` (format is `key="value"` per line).
  - Parses the `env` and `team` label values using `grep` and `cut` or `sed`.
  - Writes `/data/report-name.txt` containing `<env>-<team>` (e.g. `staging-infra`).

**Main container** — `reporter` (`busybox`):
- Reads `REPORT_DIR` and `ITEM_COUNT` from ConfigMap as env vars.
- Reads `REPORT_TOKEN` from Secret as an env var.
- Mounts the same `emptyDir` at `/data`.
- The shell script:
  1. Waits for `/data/report-name.txt` to exist.
  2. Reads the report name from that file.
  3. Creates `$REPORT_DIR` if needed.
  4. Writes a report file `$REPORT_DIR/<report-name>-<timestamp>.txt` containing:
     - `token=<first-8-chars-of-REPORT_TOKEN>`
     - `items=<ITEM_COUNT>`
     - One line per item: `item-<n>: generated at <date>` (loop from 1 to `$ITEM_COUNT`).
  5. Prints `Report written: <filename>` and exits.

Set `successfulJobsHistoryLimit: 2`.

**Verify:**
- The report file is named `staging-infra-<timestamp>.txt`.
- Token is truncated to 8 characters.
- File contains the correct number of item lines.

---

## Exercise 9 — StatefulSet with Per-Pod ConfigMap Projection + Secret Volume + Downward API Volume (All Three as Volumes)

**Scenario:** A StatefulSet where every container reads its full configuration exclusively from mounted volumes — no env vars at all. ConfigMap, Secret, and Downward API are all mounted as separate volume paths.

**Requirements:**

Create a namespace `vault`.

Create a ConfigMap `vault-config` in `vault` with:
```
MAX_CONNECTIONS=50
TIMEOUT_SECONDS=30
REGION=us-east-1
```

Create a Secret `vault-secret` in `vault` with:
```
ROOT_TOKEN=vault-r00t-t0k3n
UNSEAL_KEY=un53al-k3y-42
```

Create a StatefulSet `vault-node` in `vault` with **2 replicas**, image `busybox`.

Each pod must:
- Mount `vault-config` ConfigMap as a volume at `/config/app` (all keys become files).
- Mount `vault-secret` Secret as a volume at `/config/secrets` (all keys become files).
- Mount a Downward API volume at `/config/meta` exposing:
  - `pod-name` → `metadata.name`
  - `pod-namespace` → `metadata.namespace`
  - `pod-ip` → `status.podIP`
  - `node-name` → `spec.nodeName`

The container shell script must — **using only file reads, no env vars** — produce this output on startup:

```
=== Vault Node Config ===
Identity:
  pod:  <contents of /config/meta/pod-name>
  ns:   <contents of /config/meta/pod-namespace>
  ip:   <contents of /config/meta/pod-ip>
  node: <contents of /config/meta/node-name>

App Config:
  max_connections: <contents of /config/app/MAX_CONNECTIONS>
  timeout:         <contents of /config/app/TIMEOUT_SECONDS>
  region:          <contents of /config/app/REGION>

Secrets:
  root_token: <first-10-chars>...
  unseal_key: <first-10-chars>...
```

After printing, the container sleeps indefinitely.

Implement the 10-char truncation using shell `cut` or parameter expansion — not hardcoded.

**Verify:**
- Both pods print their own pod name and IP (different for each).
- Secret values are truncated correctly.
- No `env:` or `envFrom:` fields exist anywhere in the StatefulSet spec.

---

## Notes

- For exercises involving `hostPath`, you may need to `exec` into the node or use a debug pod to verify files.
- Shell arithmetic for random numbers: `$(( RANDOM % 10 + 1 ))`.
- String slicing in busybox `sh`: `${VAR:0:N}` works in `ash`; if not, use `echo $VAR | cut -c1-N`.
- Parsing ordinals from pod names: `${POD_NAME##*-}` extracts everything after the last `-`.
- Downward API `status.podIP` may not be populated instantly — a short `sleep 2` in init containers can help.
