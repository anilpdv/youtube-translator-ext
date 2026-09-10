import { CaptionTrack, TranscriptSegment, VideoMetadata } from './types';

/**
 * Robustly retrieves video transcript from YouTube by querying YouTube's Innertube API
 * and player metadata endpoints with full client spoofing.
 */
export async function getTranscriptForVideo(
  videoId: string,
  preferredLang: string = 'auto'
): Promise<{ segments: TranscriptSegment[]; title: string; language: string }> {
  let playerResponse: any = null;
  let title = 'YouTube Video';

  // Strategy 1: YouTube Official Innertube WEB API (Most reliable, returns signed caption URLs)
  try {
    const innertubeResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240918.00.00',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240918.00.00',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId: videoId,
      }),
    });

    if (innertubeResp.ok) {
      playerResponse = await innertubeResp.json();
      title = playerResponse?.videoDetails?.title || title;
    }
  } catch (e) {
    console.warn('[YouTubeService] Innertube API fetch error:', e);
  }

  // Strategy 2: Fallback to HTML watch page scrape
  if (!playerResponse || !playerResponse.captions) {
    try {
      const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });

      if (pageResp.ok) {
        const html = await pageResp.text();
        const match =
          html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\n|<\/script>)/s) ||
          html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (match && match[1]) {
          playerResponse = JSON.parse(match[1]);
          title = playerResponse?.videoDetails?.title || title;
        }
      }
    } catch (e) {
      console.warn('[YouTubeService] HTML scrape error:', e);
    }
  }

  const captionTracks: CaptionTrack[] =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  console.log(`[YouTubeService] Found ${captionTracks.length} caption tracks for ${videoId}:`, captionTracks.map(t => t.languageCode));

  let candidateTracks: CaptionTrack[] = [];

  // Filter based on preferred language
  if (preferredLang && preferredLang !== 'auto') {
    const matched = captionTracks.filter((t) => t.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase()));
    if (matched.length > 0) {
      candidateTracks.push(...matched);
    }
  }

  // Add all remaining tracks in priority order
  captionTracks.forEach((t) => {
    if (!candidateTracks.some((c) => c.baseUrl === t.baseUrl)) {
      candidateTracks.push(t);
    }
  });

  // Try downloading segments from candidates
  for (const track of candidateTracks) {
    try {
      console.log(`[YouTubeService] Trying caption track: ${track.languageCode} (${track.baseUrl})`);
      const segments = await fetchTimedSegments(track.baseUrl);
      if (segments.length > 0) {
        console.log(`[YouTubeService] Successfully retrieved ${segments.length} lines from track ${track.languageCode}`);
        return {
          segments,
          title,
          language: track.languageCode,
        };
      }
    } catch (err) {
      console.warn(`[YouTubeService] Failed loading track ${track.languageCode}:`, err);
    }
  }

  // Strategy 3: Direct timedtext fallback without playerResponse
  const fallbackLangs = preferredLang && preferredLang !== 'auto' ? [preferredLang, 'de', 'en', 'es', 'ja', 'fr'] : ['de', 'en', 'es', 'ja', 'fr', 'hi'];
  for (const lang of fallbackLangs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const segments = await fetchTimedSegments(url);
      if (segments.length > 0) {
        return {
          segments,
          title,
          language: lang,
        };
      }
    } catch (e) {}
  }

  throw new Error('Could not find or fetch subtitles for this video.');
}

async function fetchTimedSegments(baseUrl: string): Promise<TranscriptSegment[]> {
  // Ensure we try both json3 and standard xml
  const formats = baseUrl.includes('fmt=') ? [baseUrl] : [`${baseUrl}&fmt=json3`, baseUrl];

  for (const url of formats) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      });
      if (!resp.ok) continue;

      const text = await resp.text();
      if (!text || text.trim().length === 0) continue;

      // 1. JSON3 format
      try {
        const data = JSON.parse(text);
        if (data.events && Array.isArray(data.events)) {
          const segments: TranscriptSegment[] = [];
          for (const event of data.events) {
            if (!event.segs) continue;
            const segText = event.segs.map((s: any) => s.utf8 || '').join('').trim();
            if (!segText || segText === '\n') continue;

            const start = (event.tStartMs || 0) / 1000;
            const dur = (event.dDurationMs || 0) / 1000;

            segments.push({
              start,
              dur: Math.max(dur, 0.8),
              text: segText.replace(/\n/g, ' '),
            });
          }
          if (segments.length > 0) return segments;
        }
      } catch (e) {}

      // 2. XML / timedtext format
      const segments: TranscriptSegment[] = [];
      const textTagRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>(.*?)<\/text>/g;
      let match;
      while ((match = textTagRegex.exec(text)) !== null) {
        const start = parseFloat(match[1] || '0');
        const dur = parseFloat(match[2] || '1');
        const rawContent = match[3]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (rawContent) {
          segments.push({
            start,
            dur: Math.max(dur, 0.8),
            text: rawContent.replace(/\n/g, ' '),
          });
        }
      }
      if (segments.length > 0) return segments;
    } catch (e) {}
  }

  return [];
}
