# Data flow

1. The content script discovers and validates a YouTube caption track.
2. The user explicitly starts translation.
3. The background service worker reads the provider credential.
4. Caption batches are sent to the selected provider through the secure request boundary.
5. Provider responses are validated before returning to the content runtime.
6. Translated subtitles are rendered and successful batches may be cached locally.
