export const WEBFILES_URL = 'https://parents.msrit.edu/webfiles/';

export const FALLBACK_URLS = {
  odd: {
    label: 'ODD SEM',
    url: 'https://parents.msrit.edu/newparents/',
  },
  even: {
    label: 'EVEN SEM',
    url: 'https://parents.msrit.edu/newparentseven/index.php',
  },
};

/**
 * MSRIT academic calendar:
 * - Odd Semester typically runs August (month 7, 0-indexed) through January (month 0)
 * - Even Semester typically runs February (month 1) through July (month 6)
 */
export function detectCurrentSemester(date = new Date()) {
  const month = date.getMonth();
  if (month >= 7 || month === 0) {
    return 'odd';
  }
  return 'even';
}

export async function fetchSemesterUrls() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(WEBFILES_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return FALLBACK_URLS;
    }

    const html = await res.text();
    const resolved = {
      odd: { ...FALLBACK_URLS.odd },
      even: { ...FALLBACK_URLS.even },
    };

    const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];
    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: match[2].replace(/<[^>]+>/g, ' ').trim(),
        index: match.index,
      });
    }

    const oddIdx = html.search(/ODD\s+TERM/i);
    const evenIdx = html.search(/EVEN\s+TERM/i);

    const toAbsolute = (href) => {
      if (!href) return null;
      if (href.startsWith('http://') || href.startsWith('https://')) return href;
      if (href.startsWith('/')) return `https://parents.msrit.edu${href}`;
      return `https://parents.msrit.edu/webfiles/${href}`;
    };

    if (oddIdx !== -1) {
      const oddLink = links.find((l) => l.index > oddIdx && !l.href.startsWith('#'));
      if (oddLink) {
        resolved.odd.url = toAbsolute(oddLink.href) || resolved.odd.url;
      }
    }

    if (evenIdx !== -1) {
      const evenLink = links.find((l) => l.index > evenIdx && !l.href.startsWith('#'));
      if (evenLink) {
        resolved.even.url = toAbsolute(evenLink.href) || resolved.even.url;
      }
    }

    return resolved;
  } catch (err) {
    return FALLBACK_URLS;
  }
}
