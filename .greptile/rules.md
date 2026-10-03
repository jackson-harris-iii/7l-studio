# Review focus

Prioritize concrete correctness, security/privacy, regressions, maintainability,
and meaningful tests over cosmetic preferences. Explain the trigger, consequence,
and affected code for each finding. Read the files listed in `files.json`.

Review source allowlists, excluded collections, visibility handling, cache expiry,
and fail-closed behavior carefully. Flag any route or build change that exposes
repository files, environment files, credentials, or unapproved media. Flag new
external network calls or client-side secrets. Preserve muted, click-to-load video
and accessible controls. Check that Node preview and Worker behavior remain aligned.

This is a small JavaScript site with Node's built-in tests, not a TypeScript/React
application. Do not request framework migrations or speculative abstractions.
Mocked SmugMug tests are not proof of live integration. Documentation and PR evidence
must distinguish tests from live checks and actual deployment from a dry run.
