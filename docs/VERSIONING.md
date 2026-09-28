# Versioning

Versions follow `MAJOR.MINOR.PATCH`. Beta builds use `0.9.0-beta.N`; the
first stable release is `1.0.0`. Major versions require incompatible migration
work, minor versions add compatible capabilities, and patches contain fixes.
Release builds use `npm ci`, a pinned lockfile, Node 22, and an explicit
development, beta, or stable channel.
