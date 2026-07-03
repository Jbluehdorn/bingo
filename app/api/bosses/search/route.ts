export const dynamic = "force-dynamic";

const WIKI_USER_AGENT = "OSRS-Bingo/1.0 (https://github.com/Jbluehdorn/bingo)";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  try {
    const url = new URL("https://oldschool.runescape.wiki/api.php");
    url.searchParams.set("action", "opensearch");
    url.searchParams.set("search", q);
    url.searchParams.set("limit", "15");
    url.searchParams.set("namespace", "0");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": WIKI_USER_AGENT },
    });

    if (!response.ok) return Response.json({ results: [] });

    const [, names] = (await response.json()) as [string, string[]];

    // Filter out subpages, disambiguation pages, and strategy pages
    const results = names
      .filter(
        (name) =>
          !name.includes("/") &&
          !name.toLowerCase().includes("disambiguation") &&
          !name.toLowerCase().includes("strategies") &&
          !name.toLowerCase().includes("speed-chaser") &&
          !name.toLowerCase().includes("display"),
      )
      .slice(0, 8);

    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
