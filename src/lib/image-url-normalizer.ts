"use strict";

// ONE canonical URL normalizer for ALL image sources.
// Source-agnostic: does NOT filter by hostname.
// Source trust validation is handled separately by the image pipeline.

/**
 * Normalizes image URLs by:
 * - Trimming surrounding whitespace
 * - Repairing whitespace between protocol and slashes
 *   (https: //www → https://www, http: //www → http://www)
 * - Collapsing malformed extra slashes immediately after the protocol
 *   (https:///www → https://www, but NOT touching //// in paths)
 * - Preserving the remainder of the URL path intact
 * - Validating with the standard URL parser
 * - Returning null only when the URL is genuinely invalid
 *
 * Source-agnostic: works for any hostname.
 * Source trust validation is handled separately by the image pipeline.
 */
export function normalizeImageURL(
  url: string
): string | null {
  if (typeof url !== "string") return null;

  let result = url.trim();

  if (result.length === 0) return null;

  // Repair: whitespace between protocol and slashes
  // https: //www → https://www
  // http: //www  → http://www
  // Must do this BEFORE any other processing
  result = result.replace(/^https:\s\//i, "https://");
  result = result.replace(/^http:\s\//i, "http://");

  // Collapse malformed extra slashes immediately after the protocol
  // https:///www → https://www  (3+ slashes → 2 slashes)
  // http:///www → http://www
  // Do NOT touch valid // or /// in paths later in the URL
  result = result.replace(/^https:\/\/\//i, "https://");
  result = result.replace(/^http:\/\/\//i, "http://");
  // General case: 3+ slashes after protocol
  result = result.replace(/^https:\/{3,}/i, "https://");
  result = result.replace(/^http:\/{3,}/i, "http://");

  // After the above repair, we may have introduced a valid URL,
  // or we may need to handle the case where there were 3+ slashes.
  // Use URL parser to validate and reconstruct.
  try {
    const parsed = new URL(result);

    // Validate we got a proper hostname
    if (!parsed.hostname) return null;

    // Reconstruct the URL properly:
    // Use the parsed protocol, hostname, and pathname.
    // This automatically collapses extra slashes that the URL parser handles.
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;

    // Additional check: ensure it still starts with valid protocol
    if (!/^https?:/.test(normalized)) return null;

    return normalized;
  } catch {
    // URL parsing failed - try a fallback approach
    // Check if it has a valid protocol prefix
    const protocolPattern = /^https?:\/\\/i;
    if (!protocolPattern.test(result)) {
      // No valid protocol:// prefix found after repair attempts
      return null;
    }

    // Return as-is if it has a valid protocol:// format
    // (the repair steps above should have fixed most cases)
    return result;
  }
}

