---
name: cleanup-merged
description: Use when the user says a PR is merged and asks to clean up after it — remove its worktree and branch, switch back to main, update main from origin (e.g. "je to mergnuté, ukliď po sobě", "review prošlo, přepni mě na main", "PR merged, clean up").
---

# Cleanup after a merged PR

## Overview

After a PR merge, remove **only this PR's local traces** (worktree, local branch) and update the main checkout. Cleanup is **local only** (team decision).

## Rules

- **Never `git push origin --delete`**, not even your own merged branch. Just mention it in the report.
- **One destructive command per Bash call** (`worktree remove`, `branch -D`). Chained ones get blocked by the permission classifier as a whole.
- Run everything from the **main checkout** (`git -C <main>`), never from inside the worktree being removed.
- Other worktrees and branches (incl. teammates') are only listed.
- No `--force`, `reset --hard`, `clean`, `stash`, `checkout --` or `rm -rf`.

## Steps

1. **Identify** the PR number, branch, worktree path and main checkout (`git worktree list`, `gh pr list --head <branch> --state all`). Ask if ambiguous.
2. **Verify the merge:** `gh pr view <N> --json state,headRefName,headRefOid`. If it is not `MERGED`, **skip steps 4–6**.
3. `git -C <main> fetch --prune origin`
4. **Check the worktree:** both `git -C <wt> status --short` and `git -C <wt> log --oneline origin/main..HEAD` must be empty. If not, show what is there, ask, and **skip steps 5–6**.
5. **Remove the worktree:** `git -C <main> worktree remove <wt>`.
   On `Permission denied` / `Device or resource busy` (Windows: VS Code or a terminal holds the folder), run `git -C <main> worktree prune` once. Tell the user to close that folder in VS Code and delete it, then continue.
6. **Delete the local branch** with its guard in the same call:
   `git -C <main> merge-base --is-ancestor <branch> origin/main && git -C <main> branch -D <branch>`
   (`-d` misleads when local main is behind; the ancestry check is the guard.)
7. **Update main.** Always do this, even when steps 4–6 were skipped: `git -C <main> switch main`, then `git -C <main> pull --ff-only`.
   If blocked (untracked files would be overwritten, not a fast-forward), show the files and ask; never delete or move them. Leave unrelated local changes as they are.
8. **Verify:** `git -C <main> status -sb` (`## main...origin/main` with no ahead/behind means in sync) and `git -C <main> worktree list`.

## Final report (always, in this order)

1. **Done:** what was removed and where main is now (`<sha>`, in sync with origin/main or not).
2. **Left on purpose:** the remote branch, local changes in the main checkout, a locked folder.
3. **Needs your decision:** every question from steps 1, 2, 4 and 7.
4. **Other leftovers:** worktrees and branches not belonging to this PR, each with a suggestion. Suggest only; do not delete.
