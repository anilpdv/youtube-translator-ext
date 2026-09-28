# Privacy

The extension processes caption text locally until the user starts translation. When translation starts, caption batches are sent to the configured provider. Provider credentials remain in the extension background context and are never sent to YouTube page code or content scripts.

Successful translations may be retained in a bounded local IndexedDB cache to support resume. Users can delete credentials and cached translations through the local-data deletion workflow. Audio is not sent by the stable application.
