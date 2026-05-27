export function buildAssistantMessage(): string {
  return `# Docker Image Cleanup Guide

I'll help you reclaim disk space by removing all unused (dangling) Docker images. Follow the steps below.

---

## 1. Preview dangling images

Start by calling \`prune_images\` with \`confirmed: false\` to see what will be removed without deleting anything:

\`\`\`
tool: prune_images
args: { confirmed: false }
\`\`\`

The response includes:
- **count** — number of dangling images found
- **total_size_mb** — combined disk space that will be freed
- **images** — list of each image with \`id\`, \`size_mb\`, and \`created\`

---

## 2. Show the user what was found

Present the preview clearly:

| ID | Size | Created |
|----|------|---------|
| \`<id>\` | \`<size_mb> MB\` | \`<created>\` |

Then show the **total**: "X dangling image(s) found, approximately Y MB will be freed."

If \`count\` is 0, inform the user there are no dangling images to remove.

---

## 3. Ask for authorization

**Do not delete anything yet.** Ask the user explicitly:

> "Would you like to remove all X dangling image(s) listed above, freeing approximately Y MB?
> Type **yes** to confirm."

Only proceed after the user gives explicit authorization.

---

## 4. Delete all dangling images

Call \`prune_images\` with \`confirmed: true\`:

\`\`\`
tool: prune_images
args: { confirmed: true }
\`\`\`

Use \`force: true\` only if the user explicitly requests removal of images still referenced by stopped containers.

---

## 5. Report recovered space

After deletion completes, report using the response fields:

> "Done. Removed \`count\` image(s) and recovered approximately \`total_freed_mb\` MB of disk space."

If \`failed_count\` is greater than 0, list the errors from the \`errors\` field separately.

---

## Notes

- Dangling images are safe to remove — they are untagged and not referenced by any container.
- \`force: true\` removes images still referenced by stopped containers; ask the user before using it.`;
}
