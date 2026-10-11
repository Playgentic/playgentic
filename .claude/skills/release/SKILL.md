---
name: release
description: Kick off a release of the playgentic npm package. Picks the semver bump from the changelog, bumps package.json and the changelog, commits, tags and pushes the tag. CI (.github/workflows/release.yml) then creates the GitHub release and publishes to npm. Use when asked to release, publish, tag, or cut a version of this repo.
argument-hint: "[x.y.z | major | minor | patch]"
disable-model-invocation: true
---

# Release

This skill is for maintaining this repo.

Your job ends at pushing a version tag. Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`, which then:
1. re-runs CI (smoke test + pack check)
2. verifies the tag matches `package.json`
3. creates the GitHub release from that version's changelog section
4. publishes to npm with provenance

**Never run `npm publish` or create the GitHub release yourself.**

Stop at the first failure and report it. Never paper over a failed check to keep going.

## 1. Preflight

```bash
git status --porcelain                      # must be empty
git branch --show-current                   # must be main
git fetch origin --tags && git status -sb   # must not be behind origin/main
node scripts/release.mjs current            # the version being released from
npm view playgentic version                 # what npm has now
```

Run the same checks CI runs, so the release doesn't fail after the tag is pushed:

```bash
npm run smoke
npm pack --dry-run
```

Check that publishing can work. Stop and tell the user if either check fails:
- `gh secret list` includes `NPM_TOKEN`.
- `gh repo view --json visibility -q .visibility` is `PUBLIC`, because npm provenance requires a public repo.

## 2. Pick the version

Read `## [Unreleased]` in `CHANGELOG.md`. If it's empty or says `_Nothing yet._`, stop: there's nothing to release. Ask the user to record the changes first, or offer to draft entries from `git log v<current>..HEAD` for them to approve.

If the user gave an exact version, use it. Otherwise propose a bump from the Unreleased entries:
- **major:** anything under "Removed" or marked BREAKING, such as a removed CLI command or flag, a changed template layout that existing projects rely on, or a raised Node minimum. While the version is `0.x`, a breaking change bumps minor instead.
- **minor:** "Added", or a backwards-compatible behaviour change.
- **patch:** only "Fixed", docs, or template wording.

Make sure the version is newer than both `package.json` and `npm view playgentic version`, and that the tag `v<x.y.z>` doesn't already exist (`git tag -l v<x.y.z>`).

Show the user the current version, the proposed version, and the Unreleased entries. **Get confirmation before continuing.**

## 3. Bump, commit, tag

```bash
node scripts/release.mjs bump <x.y.z>   # package.json + CHANGELOG [Unreleased] → [x.y.z] - today
git diff --stat
git add -A
git commit -m "release: v<x.y.z>"
git tag -a v<x.y.z> -m "v<x.y.z>"
```

## 4. Push and hand off to CI

Pushing the tag publishes to npm, and npm versions can't be reused. **Confirm with the user before pushing:**

```bash
git push origin main
git push origin v<x.y.z>
```

Then follow the release run until it finishes:

```bash
gh run list --workflow release.yml --limit 1
gh run watch <run-id> --exit-status
```

Report:
- the run result
- the release URL (`gh release view v<x.y.z> --json url -q .url`)
- the npm version now live (`npm view playgentic version`)

## If the release run fails

Read the failing step with `gh run view <run-id> --log-failed`.

- **Checks failed, or the tag doesn't match `package.json`:** nothing was published. Ask the user before deleting the tag, then run `git push origin :refs/tags/v<x.y.z>` and `git tag -d v<x.y.z>`, fix forward with a new commit, and re-tag.
- **GitHub release created but npm publish failed** (e.g. a missing or expired `NPM_TOKEN`): fix the cause, then re-run with `gh run rerun <run-id> --failed`, or `gh workflow run release.yml --ref v<x.y.z>`. The workflow skips the existing GitHub release. Never move the tag.
- **Published to npm:** it's done, even if a later step failed. Never try to republish the same version; ship a patch instead.
