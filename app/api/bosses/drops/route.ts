export const dynamic = "force-dynamic";

const WIKI_USER_AGENT = "OSRS-Bingo/1.0 (https://github.com/Jbluehdorn/bingo)";

interface WikiSection {
  index: string;
  line: string;
}

interface WikiSectionsResponse {
  parse?: { sections?: WikiSection[] };
}

interface WikiWikiTextResponse {
  parse?: { wikitext?: { "*": string } };
}

// Case-insensitive: matches {{DropsLine|name=Foo|...}} regardless of parameter casing
function extractDropNames(wikitext: string): string[] {
  const drops: string[] = [];
  const regex = /\{\{dropsline\b[^}]*?name=([^|}\n]+)/gi;
  let match;
  while ((match = regex.exec(wikitext)) !== null) {
    const name = match[1].trim();
    if (name && !drops.includes(name)) drops.push(name);
  }
  return drops;
}

async function fetchPageSections(page: string): Promise<WikiSection[]> {
  const url = new URL("https://oldschool.runescape.wiki/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", page);
  url.searchParams.set("prop", "sections");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: { "User-Agent": WIKI_USER_AGENT } });
  if (!response.ok) return [];
  const data = (await response.json()) as WikiSectionsResponse;
  return data.parse?.sections ?? [];
}

async function fetchSectionWikitext(page: string, sectionIndex: string): Promise<string> {
  const url = new URL("https://oldschool.runescape.wiki/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", page);
  url.searchParams.set("section", sectionIndex);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: { "User-Agent": WIKI_USER_AGENT } });
  if (!response.ok) return "";
  const data = (await response.json()) as WikiWikiTextResponse;
  return data.parse?.wikitext?.["*"] ?? "";
}

// Parse {{Main|Page name}} from wikitext (used by raid pages to delegate to a chest/rewards page)
function extractMainPageLink(wikitext: string): string | null {
  const match = wikitext.match(/\{\{[Mm]ain\|([^|}]+)/);
  return match ? match[1].trim() : null;
}

async function findUniqueDropsOnPage(pageName: string): Promise<string[]> {
  const sections = await fetchPageSections(pageName);

  // First pass: look for sections explicitly named "unique*" (Uniques, Unique drops, Unique rewards…)
  const uniqueSections = sections.filter((s) =>
    s.line?.toLowerCase().includes("unique"),
  );

  if (uniqueSections.length > 0) {
    const drops: string[] = [];
    for (const section of uniqueSections) {
      const wikitext = await fetchSectionWikitext(pageName, section.index);
      for (const drop of extractDropNames(wikitext)) {
        if (!drops.includes(drop)) drops.push(drop);
      }
    }
    if (drops.length > 0) return drops;
  }

  // Second pass: look in "reward*" sections for a {{Main|...}} link (CoX, ToB, ToA etc.)
  // and follow it one level deep.
  const rewardSections = sections.filter((s) =>
    s.line?.toLowerCase().includes("reward"),
  );

  for (const section of rewardSections) {
    const wikitext = await fetchSectionWikitext(pageName, section.index);
    const linkedPage = extractMainPageLink(wikitext);
    if (!linkedPage) continue;

    // Fetch the linked page and look for "unique" sections there
    const linkedSections = await fetchPageSections(linkedPage);
    const linkedUniqueSections = linkedSections.filter((s) =>
      s.line?.toLowerCase().includes("unique"),
    );

    const drops: string[] = [];
    for (const section of linkedUniqueSections) {
      const linkedWikitext = await fetchSectionWikitext(linkedPage, section.index);
      for (const drop of extractDropNames(linkedWikitext)) {
        if (!drops.includes(drop)) drops.push(drop);
      }
    }
    if (drops.length > 0) return drops;
  }

  return [];
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) return Response.json({ drops: [] });

  try {
    const drops = await findUniqueDropsOnPage(name);
    return Response.json({ drops });
  } catch {
    return Response.json({ drops: [] });
  }
}
