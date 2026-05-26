export function buildAssistantMessage(): string {
  return `# Docker Image Cleanup Guide

I'll help you reclaim disk space by identifying and removing unused (dangling) Docker images. Follow the steps below.

---

## 1. List dangling images

Dangling images are untagged layers no longer referenced by any container. Start by listing them along with their container usage:

\`\`\`
tool: list_images
args: { dangling: true, includeContainers: true }
\`\`\`

For each image returned, note:
- **id** — short image ID
- **tags** — usually empty for dangling images
- **size_mb** — disk space consumed by this image
- **running_containers** — containers currently using it

---

## 2. Show the user what was found

Present each dangling image clearly:

| ID | Tags | Size | Containers |
|----|------|------|------------|
| \`<id>\` | \`<tags or none>\` | \`<size_mb> MB\` | \`<container names or none>\` |

Then show the **total size** of all dangling images combined (sum of \`size_mb\` for every image in the list).

---

## 3. Ask for authorization

**Do not delete anything yet.** Ask the user explicitly:

> "Would you like to remove all X dangling image(s) listed above, freeing approximately Y MB?
> Type **yes** to confirm, or tell me which images to skip."

Only proceed to deletion after the user gives explicit authorization.

---

## 4. Delete authorized images

For each image the user authorized, call \`delete_image\` with \`force: true\` and \`confirmed: true\`.
Process them one by one:

\`\`\`
tool: delete_image
args: { id: "<image_id>", force: true, confirmed: true }
\`\`\`

If the user asked to skip specific images, omit those from the deletion loop.

---

## 5. Report recovered space

After all deletions complete, sum the \`size_mb\` of **only the successfully deleted images** and report:

> "Done. Removed X image(s) and recovered approximately Y MB of disk space."

If any deletion failed, list the failed image IDs and their errors separately.

---

## Notes

- Dangling images are safe to remove — they are not tagged and not used by running containers.
- \`force: true\` is required to remove images still referenced by stopped (non-running) containers.
- If \`running_containers\` is non-empty for an image, warn the user before including it — those containers would be affected.`;
}
