# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

TypeScript API-test-automation framework built on **Playwright Test** (`APIRequestContext` only — no browsers) that tests the public **Todoist REST API** (`https://api.todoist.com/api/v1/`). Built for the "Tesena Fest 2026" workshop on AI-assisted API testing. It is test-only: no production dependencies.

Read `brief.md` and `docs/test-architecture-plan.md` first for full rationale and design decisions; `Test Cases for automation.md` is the TC-001…TC-015 catalog that spec files and tags reference by ID.

Note: `tests/` does not exist yet on disk — this is currently scaffolding (clients, fixtures, schemas, CI) with no committed spec files.

## Commands

```sh
npm ci                        # install deps + git hooks (husky)
cp .env.example .env          # then set TODOIST_API_TOKEN
npm run lint                  # eslint .
npm run lint:fix
npm run format                # prettier --write .
npm run format:check
npm run typecheck             # tsc --noEmit
npm test                      # all tests (playwright test)
npm run test:smoke            # only @smoke-tagged tests
npx playwright test path/to/file.spec.ts        # single file
npx playwright test -g "TC-002 create task"     # single test by title/grep
```

Target environment is selected via `TEST_ENV` (default `prod`), which picks `config/<TEST_ENV>.ts`. Node version is pinned by `.nvmrc` (`>=24 <25`).

## Architecture

- **`config/`** — `index.ts` resolves `TEST_ENV` → `EnvConfig` (throws on unknown env); one file per environment (currently `prod.ts`). Add an environment by adding a file and registering it in the `environments` map.
- **`src/clients/`** — OO API client layer. `BaseClient` wraps an authenticated `APIRequestContext` with `get/post/delete`, a `send()` escape hatch for raw-status checks (used in negative tests), and a `listAll` cursor-pagination helper. One client class per resource (`ProjectsClient`, `TasksClient`, `LabelsClient`, `CommentsClient`, `UserClient`), assembled by `createTodoistApi(request)` into the `TodoistApi` interface. `UserClient` only reads `GET /user` for timezone — there is no login flow; auth is a bearer token on every request.
- **`src/fixtures/`** — Playwright fixture composition, merged via `mergeTests` into the single `test`/`expect`/`Schema` export from `src/fixtures/index.ts` that all specs must import (never import `@playwright/test` directly in a spec). `api.fixture.ts` provides `api`, `unauthenticatedApi`, `apiWithToken(token)`. `data.fixture.ts` provides `testData.create*` builders that auto-track and clean up created resources in reverse order after each test (tolerant of 404). `user.fixture.ts` provides worker-scoped `account`/`accountTimezone`.
- **`src/data/`** — payload builders (`projectBuilder.ts`, `taskBuilder.ts`, etc.) that generate unique `autotest-<runId>-...` names via `runId.ts`, so parallel/CI runs never collide and stale data is identifiable. `cleanup.ts` (`isStale`/`deleteStaleTestData`) is invoked once from `src/global-setup.ts` to purge `autotest-` data older than 1 hour before the run starts.
- **`src/schemas/`** — `openapi.json` is a pinned snapshot of the Todoist OpenAPI spec (machine-written; refresh manually with `node scripts/update-openapi.mts` and review the diff — never hand-edit). `validator.ts` (Ajv 2020 + ajv-formats) exposes `Schema` name constants; `matchers.ts` adds the custom `expect(...).toMatchSchema(Schema.X)` matcher used in specs.
- **`src/utils/dates.ts`** — timezone-aware "today/tomorrow" calendar math using `Intl` against `accountTimezone`, deliberately independent of the test runner's local clock.

### Security: token redaction is layered, not single-point

The Todoist API token must never leak into logs, reports, or CI artifacts. This is enforced at three independent layers — understand all three before touching logging, error handling, reporters, or CI artifact steps:

1. **`src/clients/ApiError`/`RequestFailedError`** and `src/utils/redact.ts` (`redact`/`redactBytes`) — scrub the token from error messages/stacks at the source.
2. **`src/reporters/redact-reporter.ts`** — a custom Playwright reporter that strips the token from attachments (including inside zipped traces), stdout/stderr, and error output. It **must stay first** in `playwright.config.ts`'s `reporter` array so other reporters never see the raw value.
3. **`scripts/check-no-token.mts`** — a CI-only brute-force scan of `playwright-report/`/`test-results/` (including inside zip and base64-embedded zip content) that blocks artifact upload if the literal token string is found anywhere.

ESLint additionally bans `console` outright in framework and test code (`no-console: error`), except in `scripts/**`. `.env` holds the live token, is gitignored, and must never be read, printed, or pasted into chat, commits, or PRs.

## Test conventions

- Every spec title is prefixed with its test case ID from `Test Cases for automation.md` (e.g. `TC-002`), and tagged with that ID plus a suite tag: `@smoke`, `@regression`, `@e2e`, or `@negative`. Multi-input cases split into suffixed IDs (`TC-015a`, `TC-015b`, ...).
- Specs are grouped by resource/suite under `tests/` (e.g. `tests/tasks/create-task.spec.ts`), per the mapping table in `docs/test-architecture-plan.md`.
- `eslint-plugin-playwright`'s `flat/recommended` rules apply specifically to `tests/**/*.ts` (see `eslint.config.mjs`).

## Git workflow

- **Every distinct change gets its own GitHub issue, its own isolated git worktree/branch, and its own PR referencing that issue** (e.g. `Closes #N`). Never bundle unrelated changes into one commit/PR, and never commit straight to `main`. Workflow per change: open the issue → create a worktree for it → implement → open the PR.
- Commit messages must match `^#[0-9]+ .+` (issue-id prefix), enforced by the `commit-msg` hook (Merge/Revert/fixup/squash exempt). `npm ci` sets `core.commentChar` to `;` so Git doesn't strip `#`-prefixed subject lines.
- `pre-commit` runs `lint-staged` (eslint --fix + prettier --write on staged files).
- `pre-push` blocks direct pushes to `main`.
- CI (`pr.yml`) runs lint → format:check → typecheck → `playwright test --pass-with-no-tests` → `check-no-token.mts` (gates artifact upload) → flaky-report PR comment, against a **shared Todoist test account**, so PR runs use `concurrency: group: todoist-account` (never `pull_request_target`). `smoke.yml` runs `@smoke` hourly and opens a `smoke-failure`-labeled GitHub issue on failure.
- `README.md`, `brief.md`, `Test Cases for automation.md`, `docs/` and `src/schemas/openapi.json` are excluded from Prettier auto-formatting (hand-written/machine-written content kept as authored).
