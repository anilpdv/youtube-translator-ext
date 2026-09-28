# Test strategy

The reliability program is layered: static checks, deterministic unit tests,
contract tests, subsystem integration tests, component tests, browser tests,
race/lifecycle tests, and release qualification. CI must run deterministic
tests without depending on live YouTube pages or provider credentials.

**P0 risks** are stale-session subtitles, credential leakage, malformed
provider output, cache corruption, and broken production builds. **P1 risks**
are parser regressions, cancellation leaks, accessibility regressions, and
incorrect resume behavior. **P2 risks** are visual differences and benchmark
regressions below the published budgets.

Tests use stable fixtures and fakes. Live YouTube smoke tests are explicitly
opt-in and never replace fixture-based tests. A flaky test is quarantined with
an owner, issue, failure rate, and expiry date; retries are not used to hide
failures.
