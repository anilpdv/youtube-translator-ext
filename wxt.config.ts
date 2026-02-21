import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'YouTube AI Subtitle Translator',
    description: 'Ultra-fast, accurate AI translation & synchronized subtitles for YouTube videos using Chrome Built-in AI, YouTube Auto-Translate, and Gemini.',
    version: '1.0.0',
    permissions: ['storage', 'tabs'],
    host_permissions: [
      '*://*.youtube.com/*',
      'https://generativelanguage.googleapis.com/*',
      'http://localhost:11434/*',
      'http://127.0.0.1:11434/*'
    ],
    action: {
      default_title: 'YouTube AI Translator Settings'
    },
    // Fixed key = deterministic extension ID for E2E tests: aodhhghnofcjgfdenndnbohopllconpi
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29X2rFLqPD7fBBGBKa0KSxoPlbbbKGqbfbPjIGINSQNFxcJFuG7eFQ7MzU8EG8LoO5cM+F0qFVz8zzJX0Rvl5p1WT1aA7k8HjX7dFW3gQcGjnFyMsAKlHRdpCbfE1XxKOGh5nKUkuYsHn+c7Wkr8e3P3pS4E7Xdm+k7eiA8sYUblp6RM8n0ynbRFv9KkYb1tBKEiJk/eBRkRnH2GkJFPt0kZR7Ox0RlACf9BqAqGnEZdLAaE0q6tM8g+lrZe1w5RXHicSHT+DnTGVZ+M1ZMsXOPFvxA1RJL0fXvLzfcnMB3RBNhQIDAQAB',
    web_accessible_resources: [
      {
        resources: ['popup.html'],
        matches: ['*://*/*'],
      },
    ],
  },
});
