export function buildAssistantMessage(containerRef: string, nameArg: string): string {
  return `# Docker Container Troubleshooting Guide

I'll help you identify and resolve the issue with ${containerRef}. Follow the steps below.

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

> ⚠️ The log reading tool will be added to the project in the future. When available (\`get_container_logs\`), use it to inspect application output and identify internal errors — it is the most direct source for diagnosing crashes and startup failures.

---

## Next step

Run \`list_containers\` with the full set of flags shown in step 1 to start the diagnosis.`;
}
