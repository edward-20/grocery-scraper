export function normalizeUrl(input: string, base?: string): string {
  const url = new URL(input, base);
  url.hash = "";
  return url.toString();
}

export function sameOrigin(url: string, origin: string): boolean {
  return new URL(url).origin === new URL(origin).origin;
}

export function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => normalizeUrl(url)))];
}
