export function buildAssistantMessage(): string {
  return `# Docker Volume Removal Guide

I'll help you safely remove a Docker volume. This is a destructive operation — **all data stored in the volume will be permanently lost**. Follow each step carefully.

---

## 1. List containers using the volume

Before doing anything, identify which containers are mounted to the target volume:

\`\`\`
tool: list_volumes
args: { name: "<volume_name>", includeContainers: true }
\`\`\`

Present the result to the user:
- **Volume name**, driver, mountpoint
- **Containers using it**: id, name, state

---

## 2. Assess data-loss risk

Before warning the user, analyze the volume name and the names/images of containers using it to determine if this is a **high-risk volume**.

**High-risk indicators** (treat as high-risk if ANY match):

| Signal | Examples |
|---|---|
| Volume name suggests a database | contains \`postgres\`, \`mysql\`, \`mariadb\`, \`mongo\`, \`redis\`, \`sqlite\`, \`elastic\`, \`cassandra\`, \`kafka\`, \`rabbit\`, \`mq\`, \`db\`, \`database\`, \`data\`, \`storage\` |
| Volume name suggests app state | contains \`uploads\`, \`media\`, \`files\`, \`assets\`, \`backup\`, \`config\`, \`secrets\`, \`certs\`, \`keys\` |
| Container name/image suggests a database or stateful service | \`postgres\`, \`mysql\`, \`mariadb\`, \`mongo\`, \`redis\`, \`elasticsearch\`, \`rabbitmq\`, \`kafka\`, \`zookeeper\` |

**Decision:**
- If high-risk → follow **Step 2a** (double-check flow).
- If low-risk → follow **Step 2b** (standard warning).

---

## 2a. High-risk double-check (only if high-risk)

Show this first confirmation:

> 🚨 **High-Risk Volume Detected**
>
> Volume \`<volume_name>\` appears to store **critical data** (e.g. database records, application files, or secrets).
> Containers using it: \`<container names>\`.
>
> **Deleting this volume may cause permanent, unrecoverable data loss.**
>
> Are you sure you want to continue? Type **yes** to proceed to the final confirmation, or **no** to cancel.

Only continue if the user confirms with **yes**.

Then show the second confirmation:

> ⚠️ **Final Confirmation Required**
>
> You are about to **permanently delete** volume \`<volume_name>\` and all data inside it.
> This action **cannot be undone**.
>
> Type **DELETE** (all caps) to confirm, or anything else to cancel.

Only continue if the user types exactly **DELETE**.

---

## 2b. Standard warning (only if low-risk)

**Do not proceed without explicit confirmation.** Show this warning:

> ⚠️ **Data Loss Warning**
>
> Removing volume \`<volume_name>\` will **permanently delete all data** stored in it.
> The following container(s) use this volume: \`<container names>\`.
>
> After removal:
> - The containers will be stopped (force) and started again without the volume.
> - **Data stored in the volume cannot be recovered.**
>
> Type **yes** to confirm you want to proceed, or **no** to cancel.

Only continue if the user types **yes** or gives equivalent explicit authorization.

---

## 3. Stop containers using the volume (force)

For each container using the volume, stop it with force:

\`\`\`
tool: stop_containers
args: { id: "<container_id>", force: true }
\`\`\`

---

## 4. Delete the volume

Now that no containers are using the volume, delete it:

\`\`\`
tool: delete_volume
args: { name: "<volume_name>", confirmed: true }
\`\`\`

If the deletion fails because the volume is still reported as in use, re-check with \`list_volumes\` (includeContainers: true) and stop the remaining containers.

---

## 5. Restart the containers

Start each previously stopped container again:

\`\`\`
tool: start_containers
args: { id: "<container_id>" }
\`\`\`

Repeat for each container that was stopped in step 3.

---

## 6. Report the result

After all steps complete, report to the user:

> "Done. Volume \`<volume_name>\` was removed. The following containers were restarted: \`<names>\`.
> Note: those containers no longer have the volume mounted — you may need to recreate them with a new volume if persistent storage is required."

If any step failed, report the exact error and do not proceed with subsequent steps.

---

## Notes

- Docker does **not** support force-removing a volume while it is in use. Containers must be stopped first.
- Stopping with \`timeout: 0\` sends SIGKILL immediately — no graceful shutdown. Warn the user if the container runs a database or stateful service.
- If the user wants to preserve the data, suggest creating a backup (e.g. \`docker run --rm -v <volume>:/data busybox tar czf /backup.tar.gz /data\`) before proceeding.`;
}
