# Rollback

Keep the exact approved previous package and checksum. Pause distribution when
critical errors, credential leakage, data loss, or core-workflow failure is
confirmed. Roll back to the last qualified package, then publish a hotfix
branch only after reproducing the issue and adding a regression test.
