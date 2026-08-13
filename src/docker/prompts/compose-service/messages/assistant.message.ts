export function buildAssistantMessage(serviceName: string, action: string): string {
  const nameArg = serviceName || "<service-name>";
  const actionNote = action ? `\n> Requested action: **${action}**\n` : "";

  return `# Docker Compose — Manage Individual Service
${actionNote}
I'll manage the \`${nameArg}\` service using the MCP tools available in this session.

---

## 0. Identify the service

\`list_containers\` with \`includeComposeMetadata: true\` exposes the Compose project, service name and config files (\`compose_metadata.project\`, \`compose_metadata.service\`, \`compose_metadata.config_files\`, \`compose_metadata.working_dir\`) read from the \`com.docker.compose.*\` labels:

\`\`\`
tool: list_containers
args: { all: true, includeComposeMetadata: true }
\`\`\`

Look for the container whose \`compose_metadata.service\` matches the service to manage — that gives you the exact container name. Note any \`container_name:\` override in the Compose config, which becomes the exact container name instead of the default \`<project>-<service>-1\` pattern.

---

## 1. Find the running container name

Compose services map to containers with names like \`<project>-<service>-1\`. List all containers to confirm the exact name:

\`\`\`
tool: list_containers
args: { all: true }
\`\`\`

Filter by name if needed — pass \`name: "${nameArg}"\` to narrow results.

---

## 2. Start the service

Always preview first with \`dryRun: true\`, then execute:

\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true, dryRun: true }
\`\`\`

\`\`\`
tool: start_containers
args: { names: ["${nameArg}"], startDependencies: true }
\`\`\`

> \`startDependencies: true\` ensures services this one depends on (e.g. database) start first.

---

## 3. Stop the service

Preview, then execute:

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true, dryRun: true }
\`\`\`

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], stopDependents: true }
\`\`\`

> \`stopDependents: true\` also stops any services that depend on this one.

If the container is unresponsive, force-stop:

\`\`\`
tool: stop_containers
args: { names: ["${nameArg}"], force: true, stopDependents: true }
\`\`\`

---

## 4. Restart the service

\`\`\`
tool: restart_container
args: { name: "${nameArg}" }
\`\`\`

For a full cycle (stop → start with dependency handling):

\`\`\`
1. stop_containers  → names: ["${nameArg}"], stopDependents: true
2. start_containers → names: ["${nameArg}"], startDependencies: true
\`\`\`

---

## 5. Check logs after action

Get the container ID from \`list_containers\`, then:

\`\`\`
tool: container_logs
args: { id: "<container-id>", tail: 30 }
\`\`\`

---

## Next step

Run \`list_containers\` with \`includeComposeMetadata: true\` to identify the service and get the exact container name for \`${nameArg}\`, then apply the requested action.`;
}
