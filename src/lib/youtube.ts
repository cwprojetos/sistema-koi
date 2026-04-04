/**
 * Extracts the YouTube video ID from various YouTube URL formats.
 * Returns null if the URL is not a valid YouTube URL.
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // Standard watch URL
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    // Short URL (youtu.be)
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Shorts URL
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
