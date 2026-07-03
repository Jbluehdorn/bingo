export function getSkillImageUrl(skillName: string): string {
  const capitalized =
    skillName.charAt(0).toUpperCase() + skillName.slice(1).toLowerCase();
  return `https://oldschool.runescape.wiki/images/${capitalized}_icon.png`;
}

export function getBossImageUrl(bossName: string): string {
  const encoded = encodeURIComponent(bossName.replace(/ /g, "_"));
  return `https://oldschool.runescape.wiki/images/${encoded}_chathead.png`;
}

export function getTileImageUrl(tile: {
  type: string;
  boss_name: string | null;
  skill_name: string | null;
  image_url: string | null;
}): string {
  if (tile.image_url) return tile.image_url;
  if (tile.type === "xp" && tile.skill_name) return getSkillImageUrl(tile.skill_name);
  if (tile.type === "drop" && tile.boss_name) return getBossImageUrl(tile.boss_name);
  return "";
}

export function resolveStoredImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }

  return `/api/images/${value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
