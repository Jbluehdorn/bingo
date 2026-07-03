export const dynamic = "force-dynamic";

const WIKI_USER_AGENT = "OSRS-Bingo/1.0 (https://github.com/Jbluehdorn/bingo)";

interface WikiPage {
  thumbnail?: { source: string };
}

interface WikiResponse {
  query?: { pages?: Record<string, WikiPage> };
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) return Response.json({ imageUrl: null });

  try {
    const url = new URL("https://oldschool.runescape.wiki/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", name);
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("format", "json");
    url.searchParams.set("pithumbsize", "200");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": WIKI_USER_AGENT },
    });

    if (!response.ok) return Response.json({ imageUrl: null });

    const data = (await response.json()) as WikiResponse;
    const pages = data.query?.pages ?? {};
    const page = Object.values(pages)[0];
    const imageUrl = page?.thumbnail?.source ?? null;

    return Response.json({ imageUrl });
  } catch {
    return Response.json({ imageUrl: null });
  }
}
