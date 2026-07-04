import { OSRS_SKILLS } from "@/lib/types";

const WOM_BASE_URL = "https://api.wiseoldman.net/v2/players";

function getPlayerUrl(username: string): string {
  return `${WOM_BASE_URL}/${encodeURIComponent(username)}`;
}

export async function validatePlayer(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  const response = await fetch(getPlayerUrl(trimmed), { method: "GET" });
  return response.ok;
}

export async function getPlayerXp(username: string): Promise<Record<string, number>> {
  const response = await fetch(getPlayerUrl(username.trim()), { method: "GET" });
  if (!response.ok) {
    throw new Error(`Unable to fetch WOM data for ${username}.`);
  }

  const payload = (await response.json()) as {
    latestSnapshot?: {
      data?: {
        skills?: Record<string, { experience?: number }>;
      };
    };
  };

  const skills = payload.latestSnapshot?.data?.skills ?? {};
  return Object.fromEntries(
    OSRS_SKILLS.map((skill) => [skill, Number(skills[skill]?.experience ?? 0)]),
  );
}

/** Returns XP gained per skill since startDate (ISO string). Uses WOM /gained endpoint. */
export async function getPlayerXpGained(username: string, startDate: string): Promise<Record<string, number>> {
  const url = `${getPlayerUrl(username.trim())}/gained?startDate=${encodeURIComponent(startDate)}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Unable to fetch WOM gains for ${username}.`);
  }

  const payload = (await response.json()) as {
    data?: {
      skills?: Record<string, { experience?: { gained?: number } }>;
    };
  };

  const skills = payload.data?.skills ?? {};
  return Object.fromEntries(
    OSRS_SKILLS.map((skill) => [skill, Math.max(0, Number(skills[skill]?.experience?.gained ?? 0))]),
  );
}

export async function updatePlayer(username: string): Promise<void> {
  const response = await fetch(getPlayerUrl(username.trim()), { method: "POST" });
  if (!response.ok) {
    throw new Error(`Unable to update WOM data for ${username}.`);
  }
}
