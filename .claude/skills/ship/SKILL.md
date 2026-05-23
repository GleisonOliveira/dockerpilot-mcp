---
name: ship
description: >
  Git workflow skill: creates branch (never touches main), stages all files, generates
  Conventional Commits message in English, pushes, and opens a pull request filling the
  project PR template. Use when user says "commit", "push", "ship", "subir alterações",
  "dar push", "abrir PR", "pull request", "commitar", or invokes /ship.
---

Execute full git ship workflow. Never commit to main. Follow steps in order.

## Steps

### 1. Check current branch

```bash
git branch --show-current
```

If current branch is `main` or `master` → go to step 2. Otherwise → go to step 3.

### 2. Create and switch to new branch

Ask user for branch name, or infer from staged diff context (e.g. `feat/add-export`, `fix/null-crash`).
Branch naming: `<type>/<short-slug>` — types: `feat`, `fix`, `refactor`, `chore`, `docs`.

```bash
git checkout -b <branch-name>
```

### 3. Stage all changes

```bash
git add -A
```

Check what's staged:

```bash
git diff --cached --stat
```

If nothing staged → tell user, stop.

### 4. Generate commit message

Analyze `git diff --cached` output. Write commit message in **English**, Conventional Commits format:

- Subject: `<type>(<scope>): <imperative summary>` — ≤72 chars, no period
- Body: only if why is non-obvious (breaking change, migration note, linked issue)
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`
- No AI attribution, no "this commit", no emoji unless project uses them

Show message to user and confirm before committing.

### 5. Commit

```bash
git commit -m "$(cat <<'EOF'
<generated-message>
EOF
)"
```

### 6. Push

```bash
git push -u origin <current-branch>
```

### 7. Open Pull Request

Read the project PR template from `.github/pull_request_template.md` if it exists.

Fill each section based on the diff:

- **Why this PR?** — summarize the motivation/problem solved
- **Related issue** — extract from branch name or commit if present, else `N/A`
- **What changed?** — bullet list of main changes from diff
- **Screenshots / Images** — include only if UI files changed; otherwise remove section
- **Checklist** — leave all checkboxes unchecked (author fills on GitHub)

Create PR:

```bash
gh pr create --title "<commit-subject>" --body "$(cat <<'EOF'
<filled-template>
EOF
)"
```

Print PR URL when done.

## Rules

- NEVER commit or push to `main` or `master`
- NEVER use `--force` or `--no-verify`
- If branch already exists remotely, use `git push` without `-u`
- Commit message always in English
- PR description language: match the project's primary language (check README)
- If `gh` CLI not available: warn user, stop at step 6
- If PR template not found: use plain summary as PR body
