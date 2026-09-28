# Security

Provider credentials are stored separately from settings and translation cache data. Provider requests are intended to run only in the background service worker through bounded, allowlisted network policies. Content scripts receive translation results, never provider credentials.

Messages crossing extension boundaries must use the versioned envelope and validate their sender, freshness, payload, and authorization before execution. Diagnostics redact credential-shaped fields, authorization headers, and sensitive URL parameters.

Report suspected vulnerabilities privately through the repository's security reporting channel. Do not include API keys, captions, or exported translations in reports.
