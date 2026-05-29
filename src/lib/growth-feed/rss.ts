function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripHtml(value: string) {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function pickTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

export function parseRssFeed(xml: string, limit = 8) {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return items.slice(0, limit).map((block) => {
    const title = pickTag(block, "title");
    const link = pickTag(block, "link") || pickTag(block, "guid");
    const pubDate = pickTag(block, "pubDate") || pickTag(block, "updated") || pickTag(block, "published");
    const description = stripHtml(pickTag(block, "description") || pickTag(block, "content:encoded") || pickTag(block, "summary"));

    return { title, link, pubDate, description };
  }).filter((item) => item.title && item.link);
}

export function parseAtomFeed(xml: string, limit = 8) {
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return entries.slice(0, limit).map((block) => {
    const title = pickTag(block, "title");
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const link = linkMatch?.[1] ?? pickTag(block, "id");
    const pubDate = pickTag(block, "updated") || pickTag(block, "published");
    const description = stripHtml(pickTag(block, "summary") || pickTag(block, "content"));

    return { title, link, pubDate, description };
  }).filter((item) => item.title && item.link);
}

export function parseFeedXml(xml: string, limit = 8) {
  if (/<feed[\s>]/i.test(xml)) {
    return parseAtomFeed(xml, limit);
  }
  return parseRssFeed(xml, limit);
}

export function truncateExcerpt(text: string, max = 180) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}…`;
}
