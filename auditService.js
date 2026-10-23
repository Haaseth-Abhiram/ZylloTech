const dns = require('dns').promises;
const { URL } = require('url');

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local
  if (normalized.startsWith('fe80:')) return true; // Link-local
  if (normalized.startsWith('::ffff:')) {
    // IPv4-mapped IPv6
    const ipv4 = normalized.replace('::ffff:', '');
    return isPrivateIPv4(ipv4);
  }
  return false;
}

/**
 * Validates a target URL against SSRF and private network attacks.
 */
async function validateUrlForSsrf(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('Invalid URL format. Please include http:// or https://');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are permitted for analysis.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow localhost and common local domain variations
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Access to local network hosts is strictly prohibited.');
  }

  // Resolve DNS to verify all IP addresses
  let addresses = [];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (err) {
    throw new Error(`Domain resolution failed for "${hostname}": ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`Could not resolve IP address for "${hostname}".`);
  }

  for (const record of addresses) {
    const isPrivate = record.family === 6 ? isPrivateIPv6(record.address) : isPrivateIPv4(record.address);
    if (isPrivate) {
      throw new Error(`Access to private/internal IP address (${record.address}) is forbidden.`);
    }
  }

  return parsed;
}

/**
 * Performs a safe, SSRF-protected HTTP GET request with redirect validation and timeout.
 */
async function safeFetch(targetUrl, maxRedirects = 3) {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    await validateUrlForSsrf(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const startTime = Date.now();
    let response;
    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZylloTech-SEO-Auditor/1.0; +https://zyllotech.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        redirect: 'manual'
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Request timed out after 8 seconds. The remote server is responding too slowly.');
      }
      throw new Error(`Failed to fetch URL: ${fetchErr.message}`);
    }
    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;

    // Handle redirects manually to re-verify destination IPs
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response (${response.status}) without Location header.`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectsRemaining--;
      if (redirectsRemaining < 0) {
        throw new Error('Too many redirects encountered (maximum 3 hops permitted).');
      }
      continue;
    }

    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');
    const text = await response.text();

    return {
      finalUrl: currentUrl,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
      responseTimeMs,
      isHtml
    };
  }
}

/**
 * Checks for robots.txt and sitemap.xml availability safely.
 */
async function probeRobotsAndSitemap(origin) {
  const result = { robotsFound: false, sitemapFound: false, sitemapUrls: [] };

  try {
    const robotsRes = await safeFetch(`${origin}/robots.txt`, 1);
    if (robotsRes.status === 200 && robotsRes.body.length > 10) {
      result.robotsFound = true;
      // Extract sitemap references inside robots.txt if present
      const sitemapMatches = robotsRes.body.match(/sitemap:\s*(https?:\/\/[^\s]+)/gi);
      if (sitemapMatches) {
        result.sitemapUrls = sitemapMatches.map(m => m.replace(/sitemap:\s*/i, '').trim());
      }
    }
  } catch {
    // Ignore probing failures for robots.txt
  }

  try {
    const sitemapRes = await safeFetch(`${origin}/sitemap.xml`, 1);
    if (sitemapRes.status === 200 && sitemapRes.body.includes('<urlset')) {
      result.sitemapFound = true;
    }
  } catch {
    // Ignore probing failures for sitemap.xml
  }

  return result;
}

/**
 * Main SEO & Technical Audit engine.
 */
async function performSeoAudit(submittedUrl) {
  // 1. Validate URL & Fetch Page
  let normalizedUrl = submittedUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const fetchResult = await safeFetch(normalizedUrl);
  const html = fetchResult.body;
  const parsed = new URL(fetchResult.finalUrl);
  const origin = parsed.origin;

  // 2. Extract SEO and Semantic HTML features
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Meta Description
  const metaDescMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Canonical Tag
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : '';

  // Robots meta
  const robotsMetaMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const robotsDirectives = robotsMetaMatch ? robotsMetaMatch[1].trim() : '';

  // Viewport Meta
  const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
  const hasViewport = !!viewportMatch;

  // Headings
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

  // Open Graph Tags
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);

  // Images & Alt attributes
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  let imagesWithoutAlt = 0;
  for (const img of imgTags) {
    if (!/alt=["'][^"']+["']/i.test(img)) {
      imagesWithoutAlt++;
    }
  }

  // Probe robots.txt & sitemap.xml
  const probe = await probeRobotsAndSitemap(origin);

  // 3. Compute Health Score & Categorize Findings
  let score = 100;
  const critical = [];
  const warnings = [];
  const passed = [];
  const recommendations = [];

  // Status code
  if (fetchResult.status === 200) {
    passed.push({
      item: 'HTTP Status Code',
      detail: `Server responded with valid HTTP 200 OK (${fetchResult.responseTimeMs}ms latency).`
    });
  } else {
    score -= 25;
    critical.push({
      item: 'HTTP Status Error',
      detail: `Server responded with HTTP ${fetchResult.status} ${fetchResult.statusText}. Search engines may drop this page.`
    });
  }

  // HTTPS Security
  if (parsed.protocol === 'https:') {
    passed.push({
      item: 'SSL/TLS Encryption',
      detail: 'Site is served over secure HTTPS protocol.'
    });
  } else {
    score -= 15;
    critical.push({
      item: 'Insecure Protocol (HTTP)',
      detail: 'Site is not using HTTPS. Modern browsers flag unencrypted connections and search engines penalize rankings.'
    });
    recommendations.push('Install an SSL/TLS certificate and enforce automatic HTTPS redirection.');
  }

  // Page Title
  if (!title) {
    score -= 15;
    critical.push({
      item: 'Missing Page Title',
      detail: 'No <title> tag found. Title is the single most critical on-page SEO signal for search crawlers.'
    });
    recommendations.push('Add a descriptive <title> tag between 30 and 60 characters with primary target keywords.');
  } else if (title.length < 25) {
    score -= 5;
    warnings.push({
      item: 'Page Title Too Short',
      detail: `Current title is ${title.length} characters ("${title}"). Recommended length is 30–60 characters.`
    });
    recommendations.push('Expand your title tag to include your brand name and secondary differentiator keywords.');
  } else if (title.length > 70) {
    score -= 5;
    warnings.push({
      item: 'Page Title May Truncate',
      detail: `Current title is ${title.length} characters. Search engines typically truncate titles over 60–65 characters.`
    });
    recommendations.push('Keep title tags under 60 characters so Google and Bing display your entire title in SERPs.');
  } else {
    passed.push({
      item: 'Page Title',
      detail: `Optimal length (${title.length} characters): "${title}".`
    });
  }

  // Meta Description
  if (!metaDescription) {
    score -= 15;
    critical.push({
      item: 'Missing Meta Description',
      detail: 'Search engines will auto-generate snippets from body text, often hurting organic click-through rates (CTR).'
    });
    recommendations.push('Provide a compelling meta description of 120–160 characters with a clear call to action.');
  } else if (metaDescription.length < 70) {
    score -= 5;
    warnings.push({
      item: 'Meta Description Short',
      detail: `Length is ${metaDescription.length} characters. You have space for up to 160 characters to maximize SERP real estate.`
    });
  } else {
    passed.push({
      item: 'Meta Description',
      detail: `Well-sized snippet (${metaDescription.length} characters): "${metaDescription.slice(0, 100)}..."`
    });
  }

  // Headings
  if (h1Matches.length === 0) {
    score -= 10;
    critical.push({
      item: 'Missing H1 Heading',
      detail: 'No <h1> tag detected. H1 defines the primary topic for both users and search crawlers.'
    });
    recommendations.push('Add exactly one prominent <h1> tag near the top of the content hierarchy.');
  } else if (h1Matches.length > 1) {
    score -= 5;
    warnings.push({
      item: 'Multiple H1 Headings',
      detail: `Found ${h1Matches.length} <h1> tags. While HTML5 allows multiple H1s, best practice for AEO and SEO is a single dominant H1.`
    });
    recommendations.push('Consolidate your heading structure into one primary H1 and use H2/H3 for subtopics.');
  } else {
    passed.push({
      item: 'H1 Heading Hierarchy',
      detail: 'Exactly 1 H1 heading found, establishing clear content focus.'
    });
  }

  // Mobile Viewport
  if (hasViewport) {
    passed.push({
      item: 'Mobile Viewport Configured',
      detail: 'Viewport meta tag detected, enabling responsive rendering on handheld devices.'
    });
  } else {
    score -= 10;
    critical.push({
      item: 'Missing Mobile Viewport Meta',
      detail: 'The page lacks a mobile viewport tag, resulting in mobile rendering penalties.'
    });
    recommendations.push('Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> in <head>.');
  }

  // Canonical Tag
  if (canonicalUrl) {
    passed.push({
      item: 'Canonical Tag Present',
      detail: `Explicit canonical URL defined: ${canonicalUrl}. Protects against duplicate content dilution.`
    });
  } else {
    warnings.push({
      item: 'No Canonical URL Tag',
      detail: 'Canonical tag is absent. If query parameters or multiple URLs resolve this page, ranking signals may fragment.'
    });
    recommendations.push('Add a self-referential <link rel="canonical" href="..."> tag to indicate the preferred URL.');
  }

  // Image Alt Tags
  if (imgTags.length > 0) {
    const missingRatio = imagesWithoutAlt / imgTags.length;
    if (imagesWithoutAlt === 0) {
      passed.push({
        item: 'Image Accessibility (Alt Attributes)',
        detail: `All ${imgTags.length} images have descriptive alt attributes.`
      });
    } else if (missingRatio > 0.5) {
      score -= 10;
      warnings.push({
        item: 'Missing Image Alt Attributes',
        detail: `${imagesWithoutAlt} out of ${imgTags.length} images lack alt attributes, impairing accessibility and image search indexing.`
      });
      recommendations.push('Provide descriptive alt text for informative images; use alt="" only for purely decorative graphics.');
    } else {
      score -= 5;
      warnings.push({
        item: 'Some Images Lack Alt Attributes',
        detail: `${imagesWithoutAlt} of ${imgTags.length} images are missing alt text.`
      });
    }
  }

  // Social / Open Graph
  if (ogTitleMatch && ogImageMatch) {
    passed.push({
      item: 'Open Graph Social Cards',
      detail: 'og:title and og:image tags are configured for rich sharing on LinkedIn, X, and messaging apps.'
    });
  } else {
    warnings.push({
      item: 'Incomplete Open Graph Metadata',
      detail: `Missing ${!ogTitleMatch ? 'og:title ' : ''}${!ogImageMatch ? 'og:image' : ''}. Shared links may display generic fallback thumbnails.`
    });
    recommendations.push('Implement Open Graph (og:title, og:description, og:image) tags to increase social click-throughs.');
  }

  // Robots.txt & Sitemap
  if (probe.robotsFound) {
    passed.push({
      item: 'Robots.txt Reachable',
      detail: `Found valid robots.txt at ${origin}/robots.txt.`
    });
  } else {
    warnings.push({
      item: 'Robots.txt Not Detected',
      detail: 'Search bots could not locate a robots.txt file at the root origin.'
    });
    recommendations.push('Create a robots.txt file to guide search spiders and protect non-public resources.');
  }

  if (probe.sitemapFound || probe.sitemapUrls.length > 0) {
    passed.push({
      item: 'XML Sitemap Available',
      detail: probe.sitemapFound
        ? `Found XML sitemap at ${origin}/sitemap.xml.`
        : `Sitemap reference declared in robots.txt: ${probe.sitemapUrls.join(', ')}.`
    });
  } else {
    warnings.push({
      item: 'XML Sitemap Not Found',
      detail: 'Could not detect /sitemap.xml. Sitemaps accelerate new page discovery and indexing speed.'
    });
    recommendations.push('Generate a clean XML sitemap listing your indexable pages and submit it to Google Search Console.');
  }

  // Ensure score stays bounded 0-100
  score = Math.max(10, Math.min(100, score));

  return {
    url: fetchResult.finalUrl,
    hostname: parsed.hostname,
    score,
    responseTimeMs: fetchResult.responseTimeMs,
    overview: {
      title,
      metaDescription,
      canonicalUrl,
      headings: {
        h1Count: h1Matches.length,
        h2Count: h2Matches.length,
        h3Count: h3Matches.length
      },
      imagesTotal: imgTags.length,
      imagesMissingAlt: imagesWithoutAlt,
      robotsFound: probe.robotsFound,
      sitemapFound: probe.sitemapFound || probe.sitemapUrls.length > 0,
      hasViewport,
      hasOg: !!(ogTitleMatch && ogImageMatch)
    },
    findings: {
      critical,
      warnings,
      passed
    },
    recommendations
  };
}

module.exports = {
  performSeoAudit,
  validateUrlForSsrf
};
