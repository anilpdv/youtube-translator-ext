# Operations runbook

When a translation fails, inspect the sanitized diagnostic bundle in this
order: provider configuration and consent, provider availability, endpoint
policy, session authorization, rate limits, timeout/HTTP status, response-size
limits, response parsing, cue-ID validation, and bounded retry outcome.

Critical health issues include duplicate overlays, duplicate schedulers, and
provider concurrency above the configured limit. Warnings include slow stages
and cache write backlog. Diagnostics must never include caption text,
translations, credentials, request bodies, or raw provider responses.
