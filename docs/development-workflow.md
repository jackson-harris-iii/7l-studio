# Development and review workflow

## Implementation plan and boundaries

The initial setup adds `AGENTS.md`, `.greptile/config.json`, `.greptile/files.json`,
`.greptile/rules.md`, this guide, and `.github/pull_request_template.md`.
GitHub Actions already runs syntax/HTML checks, Node tests, and a Cloudflare dry run.
No new runtime dependency or unattended coding service is needed.

This adapts a plan → change → test → review → correct → human release process to
this repository. Guidance is committed and works in a fresh clone. Greptile's
GitHub app and repository enablement trigger reviews; `AGENTS.md` alone does not.
Configuration follows the [official Greptile file reference](https://www.greptile.com/docs/code-review/greptile-config-reference).
Verified against that reference on October 2, 2026: `effort` accepts `base`,
`plus`, `apex`, or `auto`; `autoReview` accepts `open`, `push`, and `rebase`.
These are current configuration fields, not the older `triggerOnUpdates` alias.

Risks: the repository is public; media privacy decisions must remain explicit;
reviews may concern an older commit; a CI pass is not a live deployment check.
The controls below address those risks. The live SmugMug API remains pending an
application key and real upstream validation. Wider repository rollout and any
paid service upgrade require their own scope decision.

## Work on a branch

1. Confirm the requested outcome and inspect relevant code and Git status.
2. Plan complex changes, including affected files, risks, tests, and uncertainty.
3. Make a focused change. Update regression tests and documentation as needed.
4. Run the commands in `README.md`; inspect UI changes in the browser with media muted.
5. Commit, record `git rev-parse HEAD` and `git status --short`, and push the branch.
6. Open a PR with actual verification evidence and remaining limitations.

## Bounded Greptile correction loop

Greptile is configured for standard (`base`) reviews on open, push, and rebase,
with status checks and auto-approval disabled. Dashboard account/repository
settings must also permit reviews. No cross-repository context is configured.

The active coding agent can handle up to **two correction passes** per task.
Wait at most **ten minutes total** for review results, using spaced status checks.
Do not repeatedly trigger duplicate reviews, start a background agent, or extend
the loop silently. If a review does not arrive, report it as blocked/pending.

For each pass:

1. Read findings and their commit/review state. Verify each against the code.
2. Fix valid issues with a regression test where appropriate. Explain disagreements
   using code evidence; do not mechanically accept suggestions or dismiss findings.
3. Rerun relevant checks, commit, and push. Any new commit invalidates old test/review
   evidence for the new head until refreshed.
4. Resolve discussions only after the issue is demonstrably fixed or the owner
   accepts the explanation. Do not hide unresolved findings to meet a score.

Before calling a PR ready, compare local HEAD, remote PR head, the tested commit,
and the commit covered by the latest Greptile review. Require green CI, no unresolved
actionable findings, and a current-head 5/5 review for the normal release path.
If Greptile does not expose trustworthy commit coverage or a score, say so; do not
infer it from a general green badge. A score is an additional signal, not proof of
correctness or permission to merge. Jackson can explicitly accept a documented
exception. Local hooks and these instructions are not server-side enforcement.

## Release and evidence

Jackson authorizes merge/publication for the specific scope. After release, verify
the public HTTPS page, `/api/portfolio`, selected media, and blocked private paths.
Record the deployed commit/version and URL. Cloudflare build logs must show success;
`wrangler deploy --dry-run` never counts as deployment. Preserve rollback information.

Evidence should include:

- Exact commit and whether the working tree was clean.
- Commands, outcomes, CI links, and browser checks that were actually run.
- Greptile review link, reviewed commit, score, and unresolved findings.
- Explicit skipped, blocked, or not-run checks and why.
- Publication URL/version, or a clear statement that no release happened.

Branch protection is separate from prose/configuration. Do not claim these gates
are mandatory on GitHub until the repository rules have actually been configured.
