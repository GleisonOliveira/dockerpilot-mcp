export function buildAssistantMessage(containerRef: string, nameArg: string): string {
  return `# Docker Container Troubleshooting Guide

I'll help you identify and resolve the issue with ${containerRef}. Follow the steps below.

---

## 0. Verify Docker is running

Before anything else, confirm the Docker daemon is reachable:

\`\`\`
tool: docker_status
args: {}
\`\`\`

**If the call fails or returns \`status: "unavailable"\`:**
- Docker daemon is not running or the socket is not accessible
- Ask the user to start Docker (e.g. open Docker Desktop, or run \`sudo systemctl start docker\`)
- **Do not proceed to the next steps until Docker is confirmed running**

If Docker is running, the response will include \`status: "running"\` along with engine version, container counts, and resource usage — useful context for the rest of the diagnosis.

---

## 1. Check current container state

First, list all containers (including stopped ones) to get a full overview:

\`\`\`
tool: list_containers
args: { all: true, includeStateDetails: true, includePorts: true, includeHealthcheck: true, includeUsage: true, includeResourceLimits: true, includeNetworks: true }
\`\`\`

To filter by name, also pass \`name: "${nameArg}"\`.

---

## 2. Possible causes and what to look for

### Container stopped / not starting
- **Non-zero exit code** → internal application error
- **Exit code 137** → container was killed (OOM kill or \`docker kill\`)
- **Exit code 1** → generic application error (check logs)
- **OOM killed = true** → out of memory; consider increasing the memory limit

> Use \`includeRestartInfo: true\` to see how many times the container restarted and its restart policy.

### High resource usage
- Container consuming excessive CPU or memory, causing instability or slowness
- OOM kill risk when memory usage is near the configured limit

> Check \`includeUsage: true\` (current CPU/memory) and \`includeResourceLimits: true\` (configured limits) to spot containers near or over their limits.

### Port conflict
- Another process (or container) is already using the mapped port
- Container shows as \`exited\` shortly after start attempt

> Use \`includePorts: true\` to see port mappings for all containers.
> Compare with other running containers to identify the conflict.

### No exposed ports — container not reachable externally
- If the container has no port mappings (empty \`ports\` in the response), it **cannot be accessed from outside the Docker network or from the host machine**
- This is intentional for internal-only services, but may be the root cause if the user is trying to reach the container from a browser, external client, or another host
- To expose a port, the container must be recreated with the desired mapping (e.g. \`-p 8080:80\`)
- Use \`create_container\` with the \`ports\` parameter to recreate it with the correct bindings

### Network / communication problem
- Container cannot reach another service despite both running
- Containers on different networks cannot communicate

> Use \`includeNetworks: true\` to verify that the containers involved are on the same network.

### Internal container problem
- Application hanging, crash loop, unavailable dependency
- Healthcheck failing repeatedly

> Use \`includeHealthcheck: true\` to see the healthcheck status and last check log.

### Container in \`dead\` state
- A \`dead\` container cannot be started — it must be removed and recreated.
- This is different from \`exited\`, which can be restarted normally.

### Service dependency issue
- Container depends on another that is not ready yet (e.g., database)

> Use \`includeDependencyInfo: true\` and \`includeComposeMetadata: true\` to inspect Compose dependencies and startup order.

---

## 3. Available actions

### Start a stopped container
Always include \`startDependencies: true\` to ensure dependent services (e.g. databases, caches) start first.

Before starting, preview what will be affected with \`dryRun: true\`:
\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true, dryRun: true }
\`\`\`

Then execute:
\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true }
\`\`\`

### Stop a problematic container
Always preview first with \`dryRun: true\`:
\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true, dryRun: true }
\`\`\`

Then execute:
\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true }
\`\`\`

If the container is unresponsive or stuck, force stop with SIGKILL:
\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], force: true, stopDependents: true }
\`\`\`

### Restart (stop + start)
\`\`\`
1. stop_containers → names: ["${nameArg}"], stopDependents: true, dryRun: true  (preview)
2. stop_containers → names: ["${nameArg}"], stopDependents: true
3. start_containers → names: ["${nameArg}"], startDependencies: true, dryRun: true  (preview)
4. start_containers → names: ["${nameArg}"], startDependencies: true
\`\`\`

If unresponsive, force the stop:
\`\`\`
1. stop_containers → names: ["${nameArg}"], force: true, stopDependents: true
2. start_containers → names: ["${nameArg}"], startDependencies: true
\`\`\`

---

## 4. Read container logs

Use \`container_logs\` to inspect application output and identify internal errors — it is the most direct source for diagnosing crashes and startup failures.

To fetch the last 20 lines of logs, you need the container ID (not the name). Get it from \`list_containers\` first, then:
\`\`\`
container_logs → id: "<container-id>", tail: 20
\`\`\`

Increase \`tail\` if the relevant error occurred earlier in the output.

---

## Next step

Run \`list_containers\` with the full set of flags shown in step 1 to start the diagnosis.`;
}
