export function buildAssistantMessage(projectDir: string): string {
  const cdCmd = projectDir ? `cd ${projectDir} && ` : "";
  return `# Docker Compose — Restart All Services

I'll restart the entire project using the Bash tool directly.

---

## Option A — Soft restart (keep containers, restart processes)

\`\`\`bash
${cdCmd}docker compose restart
\`\`\`

Restarts all running containers without recreating them. Fast, but does **not** pick up changes to \`docker-compose.yml\`.

---

## Option B — Full restart (down + up, recommended after config changes)

\`\`\`bash
${cdCmd}docker compose down && docker compose up -d
\`\`\`

Stops and removes all containers, then recreates them from scratch. Use this when:
- You changed \`docker-compose.yml\` or environment variables
- A service is in a broken state that soft restart won't fix
- You want a clean slate

---

## 2. Verify all services are running

\`\`\`
tool: list_containers
args: { all: true }
\`\`\`

All services should show **State: running**. Investigate any \`exited\` or \`restarting\` containers with:

\`\`\`
tool: container_logs
args: { id: "<container-id>", tail: 50 }
\`\`\`

---

## Next step

Choose Option A (soft) or Option B (full) and execute${projectDir ? ` inside \`${projectDir}\`` : ""}.`;
}
