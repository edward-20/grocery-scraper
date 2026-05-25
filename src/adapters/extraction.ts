import type { Page } from "playwright";

export interface PageSnapshot {
  url: string;
  title: string;
  jsonLd: unknown[];
  nextData?: unknown;
  scripts: unknown[];
  meta: Record<string, string>;
  text: string;
}

export async function capturePageSnapshot(page: Page): Promise<PageSnapshot> {
  return page.evaluate(() => {
    function parseJson(text: string | null): unknown | undefined {
      if (!text) {
        return undefined;
      }
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    }

    const jsonLd = [...document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')]
      .map((script) => parseJson(script.textContent))
      .filter((value): value is unknown => value !== undefined);

    const nextData = parseJson(document.querySelector<HTMLScriptElement>("script#__NEXT_DATA__")?.textContent ?? null);

    const scripts = [...document.querySelectorAll<HTMLScriptElement>("script")]
      .map((script) => script.textContent?.trim() ?? "")
      .filter((text) => text.includes('"price"') || text.includes('"Product"') || text.includes('"product"'))
      .slice(0, 20)
      .map((text) => {
        const json = parseJson(text);
        return json ?? text.slice(0, 20000);
      });

    const meta = [...document.querySelectorAll<HTMLMetaElement>("meta")]
      .map((element) => [
        element.getAttribute("property") ?? element.getAttribute("name") ?? "",
        element.getAttribute("content") ?? "",
      ])
      .filter(([name, content]) => name && content)
      .reduce<Record<string, string>>((accumulator, [name, content]) => {
        accumulator[name] = content;
        return accumulator;
      }, {});

    return {
      url: location.href,
      title: document.title,
      jsonLd,
      nextData,
      scripts,
      meta,
      text: document.body.innerText.slice(0, 30000),
    };
  });
}

export function findObjects(value: unknown, predicate: (candidate: Record<string, unknown>) => boolean): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];
  const seen = new WeakSet<object>();

  function visit(candidate: unknown): void {
    if (!candidate || typeof candidate !== "object") {
      return;
    }
    if (seen.has(candidate)) {
      return;
    }
    seen.add(candidate);

    if (!Array.isArray(candidate)) {
      const record = candidate as Record<string, unknown>;
      if (predicate(record)) {
        matches.push(record);
      }
    }

    for (const child of Object.values(candidate)) {
      visit(child);
    }
  }

  visit(value);
  return matches;
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.replace(/[$,]/g, "").trim();
      const parsed = Number.parseFloat(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export function getPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

export function extractImage(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return firstString(...value);
  }
  if (value && typeof value === "object") {
    return firstString(
      (value as Record<string, unknown>).url,
      (value as Record<string, unknown>).src,
      (value as Record<string, unknown>).large,
      (value as Record<string, unknown>).medium,
      (value as Record<string, unknown>).small,
    );
  }
  return undefined;
}
