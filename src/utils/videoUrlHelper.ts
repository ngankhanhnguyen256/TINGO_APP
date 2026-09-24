/**
 * Helper to parse, extract IDs and generate embed URLs for TikTok, YouTube Shorts, YouTube, and direct video links
 */

export interface ParsedVideoInfo {
  type: 'tiktok' | 'youtube' | 'direct' | 'blob' | 'indexeddb' | 'cloud' | 'unknown';
  videoId?: string;
  embedUrl?: string;
  suggestedThumbnailUrl?: string;
  isEmbeddable: boolean;
}

/**
 * Extracts TikTok Video ID from various TikTok URL formats:
 * - https://www.tiktok.com/@username/video/7468088493021
 * - https://www.tiktok.com/v/7468088493021.html
 * - https://www.tiktok.com/embed/v2/7468088493021
 * - https://www.tiktok.com/embed/7468088493021
 * - https://m.tiktok.com/v/7468088493021.html
 */
export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Pattern 1: standard tiktok.com/@user/video/123456789...
  const match1 = cleanUrl.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i);
  if (match1 && match1[1]) return match1[1];

  // Pattern 2: embed URLs or v/123456789...
  const match2 = cleanUrl.match(/tiktok\.com\/(?:embed\/v2\/|embed\/|v\/|player\/v1\/)(\d+)/i);
  if (match2 && match2[1]) return match2[1];

  // Pattern 3: direct digits if someone pastes just the video id
  const match3 = cleanUrl.match(/^(\d{15,22})$/);
  if (match3 && match3[1]) return match3[1];

  return null;
}

/**
 * Extracts YouTube Video ID from standard, shorts, or youtu.be links
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const ytMatch = cleanUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return ytMatch[1];
  }
  return null;
}

/**
 * Parse any video URL string to get type, videoId, embedUrl, and thumbnail
 */
export function parseVideoUrl(url: string | undefined | null): ParsedVideoInfo {
  if (!url) {
    return { type: 'unknown', isEmbeddable: false };
  }

  const clean = url.trim();

  // 1. IndexedDB / Local / Cloud Video protocol
  if (clean.startsWith('indexeddb://') || clean.startsWith('cloud-video://') || clean.startsWith('local-video://')) {
    return {
      type: 'cloud',
      isEmbeddable: false,
    };
  }

  // 2. Blob or Data URL
  if (clean.startsWith('blob:') || clean.startsWith('data:video/')) {
    return {
      type: 'blob',
      isEmbeddable: false,
    };
  }

  // 3. TikTok
  const tiktokId = extractTikTokVideoId(clean);
  if (tiktokId) {
    return {
      type: 'tiktok',
      videoId: tiktokId,
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`,
      isEmbeddable: true,
    };
  }

  // Check if it's a TikTok shortlink (vt.tiktok.com or vm.tiktok.com)
  if (clean.includes('tiktok.com')) {
    return {
      type: 'tiktok',
      isEmbeddable: true,
      embedUrl: clean.includes('/embed/') ? clean : undefined,
    };
  }

  // 4. YouTube / Shorts
  const ytId = extractYouTubeVideoId(clean);
  if (ytId) {
    return {
      type: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`,
      suggestedThumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      isEmbeddable: true,
    };
  }

  // 5. Direct MP4 / WebM / Media stream
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    return {
      type: 'direct',
      isEmbeddable: false,
    };
  }

  return { type: 'unknown', isEmbeddable: false };
}

/**
 * Fetch metadata from TikTok oEmbed (title, author, thumbnail)
 */
export async function fetchTikTokMetadata(tiktokUrl: string): Promise<{
  title?: string;
  author?: string;
  thumbnailUrl?: string;
} | null> {
  try {
    const oembedEndpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl.trim())}`;
    const res = await fetch(oembedEndpoint);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || '',
        author: data.author_name || '',
        thumbnailUrl: data.thumbnail_url || '',
      };
    }
  } catch (e) {
    // Silent catch (CORS or network)
  }
  return null;
}
