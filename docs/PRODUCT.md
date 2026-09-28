# Product Specification: YouTube Subtitle Translator (Stable V1)

## Product Purpose
YouTube Subtitle Translator is a reliability-first browser extension designed to translate existing YouTube caption tracks into synchronized translated or bilingual subtitles on desktop YouTube watch pages.

## Core Stable Capabilities
- Standard YouTube watch pages (`/watch?v=...`)
- Extraction of existing native and auto-generated caption tracks (JSON3, WebVTT)
- Manual selection of target language
- Explicit provider (Google Gemini API) and model selection
- Manual translation start
- Real-time batch progress tracking and cancellation
- Strict 1:1 cue-to-translation ID validation
- Partial translation recovery and failed-section retry
- Original, Translated, and Bilingual subtitle overlay display modes
- Persistent IndexedDB translation cache with content hashing
- Validated SubRip (.srt) export
- Privacy-safe diagnostic collection

## Unsupported in Stable V1
- Videos without captions
- Audio transcription (speech-to-text)
- Livestream translation
- YouTube Shorts (`/shorts/...`)
- Embedded players (`iframe`)
- Automatic unconfirmed translation
- Automatic provider or model fallback chains

## Experimental Features (Disabled by Default in Stable)
- Transcript panel DOM extraction
- Live-caption MutationObserver
- Adaptive subtitle timing / pace shaping
- Chrome Built-in AI / Prompt API
- Local Ollama endpoints
- Third-party cloud providers (OpenRouter)
- Floating transcript panel
- In-player toolbar buttons
