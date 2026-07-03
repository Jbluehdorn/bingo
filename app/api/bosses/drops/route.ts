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

function extractDropNames(wikitext: string): string[] {
  const drops: string[] = [];
  // Matches {{DropsLine|Name=Tanzanite fang|...}} and {{dropsline|Name=...|...}}
  const regex = /\{\{[Dd]rops[Ll]ine\|[^}]*?Name=([^|}\n]+)/g;
  let match;
  while ((match = regex.exec(wikitext)) !== null) {
    const name = match[1].trim();
    if (name && !drops.includes(name)) drops.push(name);
  }
  return drops;
}

async function fetchWikiSectionWikitext(page: string, sectionIndex: string): Promise<string> {
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

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) return Response.json({ drops: [] });

  try {
    // Step 1: Get page sections
    const sectionsUrl = new URL("https://oldschool.runescape.wiki/api.php");
    sectionsUrl.searchParams.set("action", "parse");
    sectionsUrl.searchParams.set("page", name);
    sectionsUrl.searchParams.set("prop", "sections");
    sectionsUrl.searchParams.set("format", "json");

    const sectionsResponse = await fetch(sectionsUrl.toString(), {
      headers: { "User-Agent": WIKI_USER_AGENT },
    });
    if (!sectionsResponse.ok) return Response.json({ drops: [] });

    const sectionsData = (await sectionsResponse.json()) as WikiSectionsResponse;
    const sections = sectionsData.parse?.sections ?? [];

    // Match "Unique drops", "Unique rewards", "Unique loot" etc.
    // This covers regular bosses AND raids (CoX/ToB/ToA use "Unique rewards")
    const targetSections = sections.filter((s) =>
      s.line?.toLowerCase().includes("unique") ||
      s.line?.toLowerCase().includes("reward"),
    );

    if (targetSections.length === 0) return Response.json({ drops: [] });

    // Step 2: Fetch and parse wikitext from each matching section
    const allDrops: string[] = [];
    for (const section of targetSections) {
      const wikitext = await fetchWikiSectionWikitext(name, section.index);
      for (const drop of extractDropNames(wikitext)) {
        if (!allDrops.includes(drop)) allDrops.push(drop);
      }
    }

    return Response.json({ drops: allDrops });
  } catch {
    return Response.json({ drops: [] });
  }
}
