/**
 * Generates data/bosses.json from the static boss definitions below,
 * fetching thumbnail image URLs from the OSRS Wiki pageimages API.
 *
 * Run with: node scripts/generate-bosses.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../data/bosses.json");
const WIKI_USER_AGENT = "OSRS-Bingo/1.0 (https://github.com/Jbluehdorn/bingo)";
const THUMB_SIZE = 200;

// ---------------------------------------------------------------------------
// Boss definitions
// id          – kebab-case slug (used as React key / search key)
// name        – display name shown on the tile and in search results
// wikiTitle   – exact wiki article title for image lookup (defaults to name)
// title       – suggested tile display title (editable by admin)
// group       – group name for grouped search (null = ungrouped)
// drops       – collection log items for this boss / raid
// ---------------------------------------------------------------------------
const BOSS_DEFS = [
  // ── Barrows ──────────────────────────────────────────────────────────────
  {
    id: "ahrim",
    name: "Ahrim the Blighted",
    title: "Barrows — Ahrim",
    group: "Barrows",
    drops: ["Ahrim's hood", "Ahrim's robetop", "Ahrim's robeskirt", "Ahrim's staff", "Bolt rack"],
  },
  {
    id: "dharok",
    name: "Dharok the Wretched",
    title: "Barrows — Dharok",
    group: "Barrows",
    drops: ["Dharok's helm", "Dharok's platebody", "Dharok's platelegs", "Dharok's greataxe", "Bolt rack"],
  },
  {
    id: "guthan",
    name: "Guthan the Infested",
    title: "Barrows — Guthan",
    group: "Barrows",
    drops: ["Guthan's helm", "Guthan's platebody", "Guthan's chainskirt", "Guthan's warspear", "Bolt rack"],
  },
  {
    id: "karil",
    name: "Karil the Tainted",
    title: "Barrows — Karil",
    group: "Barrows",
    drops: ["Karil's coif", "Karil's leathertop", "Karil's leatherskirt", "Karil's crossbow", "Bolt rack"],
  },
  {
    id: "torag",
    name: "Torag the Corrupted",
    title: "Barrows — Torag",
    group: "Barrows",
    drops: ["Torag's helm", "Torag's platebody", "Torag's platelegs", "Torag's hammers", "Bolt rack"],
  },
  {
    id: "verac",
    name: "Verac the Defiled",
    title: "Barrows — Verac",
    group: "Barrows",
    drops: ["Verac's helm", "Verac's brassard", "Verac's plateskirt", "Verac's flail", "Bolt rack"],
  },

  // ── God Wars Dungeon ──────────────────────────────────────────────────────
  {
    id: "kreearra",
    name: "Kree'arra",
    title: "GWD — Kree'arra (Armadyl)",
    group: "God Wars Dungeon",
    drops: ["Pet kree'arra", "Armadyl helmet", "Armadyl chestplate", "Armadyl chainskirt", "Armadyl hilt", "Godsword shard 1", "Godsword shard 2", "Godsword shard 3"],
  },
  {
    id: "zilyana",
    name: "Commander Zilyana",
    title: "GWD — Zilyana (Saradomin)",
    group: "God Wars Dungeon",
    drops: ["Pet zilyana", "Armadyl crossbow", "Saradomin hilt", "Saradomin sword", "Saradomin's light", "Godsword shard 1", "Godsword shard 2", "Godsword shard 3"],
  },
  {
    id: "graardor",
    name: "General Graardor",
    title: "GWD — Graardor (Bandos)",
    group: "God Wars Dungeon",
    drops: ["Pet general graardor", "Bandos chestplate", "Bandos tassets", "Bandos boots", "Bandos hilt", "Godsword shard 1", "Godsword shard 2", "Godsword shard 3"],
  },
  {
    id: "kril",
    name: "K'ril Tsutsaroth",
    title: "GWD — K'ril (Zamorak)",
    group: "God Wars Dungeon",
    drops: ["Pet k'ril tsutsaroth", "Staff of the dead", "Zamorakian spear", "Steam battlestaff", "Zamorak hilt", "Godsword shard 1", "Godsword shard 2", "Godsword shard 3"],
  },

  // ── Dagannoth Kings ───────────────────────────────────────────────────────
  {
    id: "dagannoth-supreme",
    name: "Dagannoth Supreme",
    title: "DKs — Supreme (Range)",
    group: "Dagannoth Kings",
    drops: ["Pet dagannoth supreme", "Archers ring", "Dragon axe", "Seercull"],
  },
  {
    id: "dagannoth-rex",
    name: "Dagannoth Rex",
    title: "DKs — Rex (Melee)",
    group: "Dagannoth Kings",
    drops: ["Pet dagannoth rex", "Berserker ring", "Warrior ring", "Dragon axe"],
  },
  {
    id: "dagannoth-prime",
    name: "Dagannoth Prime",
    title: "DKs — Prime (Magic)",
    group: "Dagannoth Kings",
    drops: ["Pet dagannoth prime", "Seers ring", "Dragon axe", "Mud battlestaff"],
  },

  // ── Moons of Peril ────────────────────────────────────────────────────────
  {
    id: "blood-moon",
    name: "Blood Moon",
    title: "Moons — Blood Moon",
    group: "Moons of Peril",
    drops: ["Blood moon helm", "Blood moon chestplate", "Blood moon tassets", "Dual macuahuitl", "Atlatl dart"],
  },
  {
    id: "blue-moon",
    name: "Blue Moon",
    title: "Moons — Blue Moon",
    group: "Moons of Peril",
    drops: ["Blue moon helm", "Blue moon chestplate", "Blue moon tassets", "Blue moon spear", "Atlatl dart"],
  },
  {
    id: "eclipse-moon",
    name: "Eclipse Moon",
    title: "Moons — Eclipse Moon",
    group: "Moons of Peril",
    drops: ["Eclipse moon helm", "Eclipse moon chestplate", "Eclipse moon tassets", "Eclipse atlatl", "Atlatl dart"],
  },

  // ── Desert Treasure II ────────────────────────────────────────────────────
  {
    id: "duke-sucellus",
    name: "Duke Sucellus",
    title: "DT2 — Duke Sucellus",
    group: "Desert Treasure II",
    drops: ["Virtus mask", "Virtus robe top", "Virtus robe bottom", "Chromium ingot", "Awakener's orb", "Magus vestige", "Eye of the duke", "Ice quartz", "Frozen tablet", "Baron"],
  },
  {
    id: "the-leviathan",
    name: "The Leviathan",
    title: "DT2 — The Leviathan",
    group: "Desert Treasure II",
    drops: ["Virtus mask", "Virtus robe top", "Virtus robe bottom", "Chromium ingot", "Awakener's orb", "Venator vestige", "Leviathan's lure", "Smoke quartz", "Scarred tablet", "Lil'viathan"],
  },
  {
    id: "the-whisperer",
    name: "The Whisperer",
    title: "DT2 — The Whisperer",
    group: "Desert Treasure II",
    drops: ["Virtus mask", "Virtus robe top", "Virtus robe bottom", "Chromium ingot", "Awakener's orb", "Bellator vestige", "Siren's staff", "Shadow quartz", "Sirenic tablet", "Wisp"],
  },
  {
    id: "vardorvis",
    name: "Vardorvis",
    title: "DT2 — Vardorvis",
    group: "Desert Treasure II",
    drops: ["Virtus mask", "Virtus robe top", "Virtus robe bottom", "Chromium ingot", "Awakener's orb", "Ultor vestige", "Executioner's axe head", "Blood quartz", "Strangled tablet", "Butch"],
  },

  // ── Raids ─────────────────────────────────────────────────────────────────
  {
    id: "chambers-of-xeric",
    name: "Chambers of Xeric",
    wikiTitle: "Chambers of Xeric",
    title: "Chambers of Xeric",
    group: "Raids",
    drops: [
      "Dexterous prayer scroll", "Arcane prayer scroll", "Twisted buckler",
      "Dragon hunter crossbow", "Dinh's bulwark", "Ancestral hat",
      "Ancestral robe top", "Ancestral robe bottom", "Dragon claws",
      "Elder maul", "Kodai insignia", "Twisted bow",
    ],
  },
  {
    id: "theatre-of-blood",
    name: "Theatre of Blood",
    wikiTitle: "Theatre of Blood",
    title: "Theatre of Blood",
    group: "Raids",
    drops: [
      "Avernic defender hilt", "Justiciar faceguard", "Justiciar chestguard",
      "Justiciar legguards", "Ghrazi rapier", "Sanguinesti staff", "Scythe of vitur",
    ],
  },
  {
    id: "tombs-of-amascut",
    name: "Tombs of Amascut",
    wikiTitle: "Tombs of Amascut",
    title: "Tombs of Amascut",
    group: "Raids",
    drops: [
      "Osmumten's fang", "Lightbearer", "Elidinis' ward",
      "Masori mask", "Masori body", "Masori chaps", "Tumeken's shadow",
    ],
  },

  // ── Instanced Bosses ──────────────────────────────────────────────────────
  {
    id: "zulrah",
    name: "Zulrah",
    title: "Zulrah",
    group: null,
    drops: [
      "Pet snakeling", "Tanzanite mutagen", "Magma mutagen", "Jar of swamp",
      "Magic fang", "Serpentine visage", "Tanzanite fang", "Zul-andra teleport",
      "Uncut onyx", "Zulrah's scales",
    ],
  },
  {
    id: "vorkath",
    name: "Vorkath",
    title: "Vorkath",
    group: null,
    drops: ["Vorki", "Vorkath's head", "Draconic visage", "Skeletal visage", "Jar of decay", "Dragonbone necklace"],
  },
  {
    id: "nightmare",
    name: "The Nightmare",
    title: "The Nightmare",
    group: null,
    drops: [
      "Little nightmare", "Inquisitor's mace", "Inquisitor's great helm",
      "Inquisitor's hauberk", "Inquisitor's plateskirt", "Nightmare staff",
      "Volatile orb", "Harmonised orb", "Eldritch orb", "Jar of dreams",
      "Slepey tablet", "Parasitic egg",
    ],
  },
  {
    id: "phantom-muspah",
    name: "Phantom Muspah",
    title: "Phantom Muspah",
    group: null,
    drops: ["Muphin", "Venator shard", "Ancient icon", "Charged ice", "Frozen cache", "Ancient essence"],
  },
  {
    id: "yama",
    name: "Yama",
    title: "Yama",
    group: null,
    drops: [
      "Yami", "Soulflame horn", "Oathplate helm", "Oathplate chest", "Oathplate legs",
      "Oathplate shards", "Barrel of demonic tallow", "Forgotten lockbox",
      "Dossier", "Diabolic worms", "Chasm teleport scroll",
    ],
  },
  {
    id: "obor",
    name: "Obor",
    title: "Obor",
    group: null,
    drops: ["Hill giant club"],
  },
  {
    id: "bryophyta",
    name: "Bryophyta",
    title: "Bryophyta",
    group: null,
    drops: ["Bryophyta's essence"],
  },
  {
    id: "amoxliatl",
    name: "Amoxliatl",
    title: "Amoxliatl",
    group: null,
    drops: ["Moxi", "Glacial temotli", "Pendant of ates (inert)", "Frozen tear"],
  },
  {
    id: "royal-titans",
    name: "Royal Titans",
    title: "Royal Titans",
    group: null,
    drops: [
      "Bran", "Deadeye prayer scroll", "Mystic vigour prayer scroll",
      "Fire element staff crown", "Ice element staff crown", "Giantsoul amulet", "Desiccated page",
    ],
  },
  {
    id: "doom-of-mokhaiotl",
    name: "Doom of Mokhaiotl",
    title: "Doom of Mokhaiotl",
    group: null,
    drops: ["Dom", "Avernic treads", "Eye of ayak (uncharged)", "Mokhaiotl cloth", "Mokhaiotl waystone", "Demon tear"],
  },

  // ── World Bosses ──────────────────────────────────────────────────────────
  {
    id: "corporeal-beast",
    name: "Corporeal Beast",
    title: "Corporeal Beast",
    group: null,
    drops: ["Pet dark core", "Elysian sigil", "Arcane sigil", "Spectral sigil", "Holy elixir", "Spirit shield"],
  },
  {
    id: "kalphite-queen",
    name: "Kalphite Queen",
    title: "Kalphite Queen",
    group: null,
    drops: ["Kalphite princess", "Kq head", "Jar of sand", "Dragon 2h sword", "Dragon chainbody", "Dragon pickaxe"],
  },
  {
    id: "sarachnis",
    name: "Sarachnis",
    title: "Sarachnis",
    group: null,
    drops: ["Sraracha", "Jar of eyes", "Giant egg sac", "Sarachnis cudgel", "Pristine spider silk"],
  },
  {
    id: "scurrius",
    name: "Scurrius",
    title: "Scurrius",
    group: null,
    drops: ["Scurrius' spine", "Scurry"],
  },
  {
    id: "giant-mole",
    name: "Giant Mole",
    title: "Giant Mole",
    group: null,
    drops: ["Baby mole", "Immaculate mole skin", "Mole skin", "Mole claw"],
  },
  {
    id: "the-hueycoatl",
    name: "The Hueycoatl",
    title: "The Hueycoatl",
    group: null,
    drops: ["Huberte", "Dragon hunter wand", "Hueycoatl hide", "Tome of earth (empty)", "Soiled page", "Huasca seed"],
  },

  // ── Wilderness Bosses ─────────────────────────────────────────────────────
  {
    id: "chaos-fanatic",
    name: "Chaos Fanatic",
    title: "Wilderness — Chaos Fanatic",
    group: "Wilderness",
    drops: ["Pet chaos elemental", "Odium shard 1", "Malediction shard 1"],
  },
  {
    id: "crazy-archaeologist",
    name: "Crazy archaeologist",
    title: "Wilderness — Crazy Archaeologist",
    group: "Wilderness",
    drops: ["Odium shard 2", "Malediction shard 2", "Fedora"],
  },
  {
    id: "scorpia",
    name: "Scorpia",
    title: "Wilderness — Scorpia",
    group: "Wilderness",
    drops: ["Scorpia's offspring", "Odium shard 3", "Malediction shard 3", "Dragon 2h sword"],
  },
  {
    id: "king-black-dragon",
    name: "King Black Dragon",
    title: "Wilderness — King Black Dragon",
    group: "Wilderness",
    drops: ["Prince black dragon", "Kbd heads", "Dragon pickaxe", "Draconic visage"],
  },
  {
    id: "chaos-elemental",
    name: "Chaos Elemental",
    title: "Wilderness — Chaos Elemental",
    group: "Wilderness",
    drops: ["Pet chaos elemental", "Dragon pickaxe", "Dragon 2h sword"],
  },
  {
    id: "revenant-maledictus",
    name: "Revenant maledictus",
    title: "Wilderness — Revenant Maledictus",
    group: "Wilderness",
    drops: [
      "Amulet of avarice", "Craw's bow (u)", "Thammaron's sceptre (u)",
      "Viggora's chainmace (u)", "Ancient crystal",
    ],
  },
  {
    id: "vetion",
    name: "Vet'ion",
    wikiTitle: "Calvar'ion",
    title: "Wilderness — Vet'ion",
    group: "Wilderness",
    drops: ["Vet'ion jr.", "Ring of the gods", "Dragon pickaxe", "Dragon 2h sword", "Skull of vet'ion", "Voidwaker blade"],
  },
  {
    id: "venenatis",
    name: "Venenatis",
    wikiTitle: "Spindel",
    title: "Wilderness — Venenatis",
    group: "Wilderness",
    drops: ["Venenatis spiderling", "Treasonous ring", "Dragon pickaxe", "Dragon 2h sword", "Fangs of venenatis", "Voidwaker gem"],
  },
  {
    id: "callisto",
    name: "Callisto",
    wikiTitle: "Artio",
    title: "Wilderness — Callisto",
    group: "Wilderness",
    drops: ["Callisto cub", "Tyrannical ring", "Dragon pickaxe", "Dragon 2h sword", "Claws of callisto", "Voidwaker hilt"],
  },

  // ── Slayer Bosses ─────────────────────────────────────────────────────────
  {
    id: "grotesque-guardians",
    name: "Grotesque Guardians",
    wikiTitle: "Dusk",
    title: "Grotesque Guardians",
    group: "Slayer",
    drops: ["Noon", "Black tourmaline core", "Granite gloves", "Granite ring", "Granite hammer", "Jar of stone", "Granite dust"],
  },
  {
    id: "abyssal-sire",
    name: "Abyssal Sire",
    title: "Abyssal Sire",
    group: "Slayer",
    drops: [
      "Abyssal orphan", "Unsired", "Abyssal head", "Bludgeon spine",
      "Bludgeon claw", "Bludgeon axon", "Jar of miasma", "Abyssal dagger", "Abyssal whip",
    ],
  },
  {
    id: "kraken",
    name: "Kraken",
    wikiTitle: "Cave kraken",
    title: "Kraken",
    group: "Slayer",
    drops: ["Pet kraken", "Kraken tentacle", "Trident of the seas (full)", "Jar of dirt"],
  },
  {
    id: "cerberus",
    name: "Cerberus",
    title: "Cerberus",
    group: "Slayer",
    drops: ["Hellpuppy", "Eternal crystal", "Pegasian crystal", "Primordial crystal", "Jar of souls", "Smouldering stone", "Key master teleport"],
  },
  {
    id: "thermonuclear-smoke-devil",
    name: "Thermonuclear smoke devil",
    title: "Thermonuclear Smoke Devil",
    group: "Slayer",
    drops: ["Pet smoke devil", "Occult necklace", "Smoke battlestaff", "Dragon chainbody", "Jar of smoke"],
  },
  {
    id: "alchemical-hydra",
    name: "Alchemical Hydra",
    title: "Alchemical Hydra",
    group: "Slayer",
    drops: [
      "Ikkle hydra", "Hydra's claw", "Hydra tail", "Hydra leather",
      "Hydra's fang", "Hydra's eye", "Hydra's heart",
      "Dragon knife", "Dragon thrownaxe", "Jar of chemicals", "Alchemical hydra heads",
    ],
  },
  {
    id: "araxxor",
    name: "Araxxor",
    title: "Araxxor",
    group: "Slayer",
    drops: [
      "Nid", "Araxyte venom sac", "Spider cave teleport", "Araxyte fang",
      "Noxious point", "Noxious blade", "Noxious pommel", "Araxyte head",
      "Jar of venom", "Coagulated venom",
    ],
  },
  {
    id: "shellbane-gryphon",
    name: "Shellbane gryphon",
    title: "Shellbane Gryphon",
    group: "Slayer",
    drops: ["Gull", "Jar of feathers", "Belle's folly (tarnished)", "Gryphon feather"],
  },

  // ── Minigame Bosses ───────────────────────────────────────────────────────
  {
    id: "crystalline-hunllef",
    name: "Crystalline Hunllef",
    title: "The Gauntlet — Crystalline Hunllef",
    group: "Minigame",
    drops: ["Youngllef", "Crystal armour seed", "Crystal weapon seed", "Enhanced crystal weapon seed"],
  },
  {
    id: "corrupted-hunllef",
    name: "Corrupted Hunllef",
    title: "Corrupted Gauntlet — Corrupted Hunllef",
    group: "Minigame",
    drops: ["Youngllef", "Crystal armour seed", "Crystal weapon seed", "Enhanced crystal weapon seed", "Gauntlet cape"],
  },
  {
    id: "tzkok-jad",
    name: "TzTok-Jad",
    title: "Fight Caves — TzTok-Jad",
    group: "Minigame",
    drops: ["Tzrek-jad", "Fire cape"],
  },
  {
    id: "tzkal-zuk",
    name: "TzKal-Zuk",
    title: "Inferno — TzKal-Zuk",
    group: "Minigame",
    drops: ["Jal-nib-rek", "Infernal cape"],
  },
  {
    id: "sol-heredit",
    name: "Sol Heredit",
    title: "Fortis Colosseum — Sol Heredit",
    group: "Minigame",
    drops: [
      "Smol heredit", "Dizana's quiver (uncharged)", "Sunfire fanatic cuirass",
      "Sunfire fanatic chausses", "Sunfire fanatic helm", "Echo crystal",
      "Tonalztics of ralos (uncharged)", "Sunfire splinters",
    ],
  },
];

// ---------------------------------------------------------------------------
// Fetch image URLs from the wiki pageimages API in batches of 50
// ---------------------------------------------------------------------------
async function fetchImageUrls(wikiTitles) {
  const results = {};
  const unique = [...new Set(wikiTitles)];

  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url = new URL("https://oldschool.runescape.wiki/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("titles", batch.join("|"));
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("pithumbsize", String(THUMB_SIZE));
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": WIKI_USER_AGENT },
    });
    const data = await response.json();
    const pages = data.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const imageUrl = page.thumbnail?.source ?? null;
      results[page.title] = imageUrl;
    }

    // Polite delay between batches
    if (i + 50 < unique.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

async function main() {
  console.log(`Fetching images for ${BOSS_DEFS.length} bosses...`);

  const wikiTitles = BOSS_DEFS.map((b) => b.wikiTitle ?? b.name);
  const imageMap = await fetchImageUrls(wikiTitles);

  const output = BOSS_DEFS.map((b) => {
    const wikiTitle = b.wikiTitle ?? b.name;
    const imageUrl = imageMap[wikiTitle] ?? null;
    const entry = {
      id: b.id,
      name: b.name,
      title: b.title,
      group: b.group,
      imageUrl,
      drops: b.drops,
    };
    return entry;
  });

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✓ Written ${output.length} entries to data/bosses.json`);

  // Report any missing images
  const missing = output.filter((b) => !b.imageUrl);
  if (missing.length) {
    console.warn(`⚠ No image found for: ${missing.map((b) => b.name).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
