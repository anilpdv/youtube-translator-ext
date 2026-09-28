# Release policy

Development builds may enable experimental flags and are not stability
commitments. Beta builds enable the Stable V1 workflow plus controlled
diagnostics and feedback. Stable builds disable experimental features, debug
logging, fallback providers, automatic translation, and fault injection.

Stable blockers include credential or caption leakage, broken production
builds, migration failure, duplicate subtitle overlays, unsupported stable
features enabled, failed core workflow qualification, or an unavailable
rollback artifact.
