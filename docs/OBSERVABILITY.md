# Observability

Observability is local by default. Events use stable names such as
`caption.parse.completed`, `translation.batch.completed`,
`rendering.overlay.mounted`, and `cache.lookup.partial-hit`.

Allowed data is limited to counts, durations, low-cardinality provider/model
identifiers, error codes, resource counts, and performance summaries. Session
and video identifiers are hashed when correlation is needed. Credentials,
authorization headers, caption/translation text, prompts, raw responses,
cookies, page HTML, and full caption URLs are forbidden.

Diagnostic history is bounded and sanitized before export. Remote telemetry is
disabled; adding it requires explicit consent and a separate privacy review.
