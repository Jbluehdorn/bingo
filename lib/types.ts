export const OSRS_SKILLS = [
  "attack",
  "defence",
  "strength",
  "hitpoints",
  "ranged",
  "prayer",
  "magic",
  "cooking",
  "woodcutting",
  "fletching",
  "fishing",
  "firemaking",
  "crafting",
  "smithing",
  "mining",
  "herblore",
  "agility",
  "thieving",
  "slayer",
  "farming",
  "runecrafting",
  "hunter",
  "construction",
] as const;

export type SkillName = (typeof OSRS_SKILLS)[number];
export type GameStatus = "setup" | "active" | "completed";

export interface Game {
  id: number;
  status: GameStatus;
  started_at: string | null;
  winner_team_id: number | null;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  photo_url: string | null;
  created_at: string;
}

export interface Player {
  id: number;
  team_id: number;
  username: string;
  created_at: string;
}

export interface TeamWithPlayers extends Team {
  players: Player[];
}

export type TileType = "drop" | "xp";

export interface Tile {
  id: number;
  position: number;
  type: TileType;
  boss_name: string | null;
  required_drops: number | null;
  skill_name: string | null;
  required_xp: number | null;
  image_url: string | null;
  created_at: string;
}

export interface DropSubmission {
  id: number;
  tile_id: number;
  team_id: number;
  player_id: number;
  image_url: string;
  submitted_at: string;
}

export interface DropSubmissionWithDetails extends DropSubmission {
  player_username: string;
  team_name: string;
  tile_name: string;
}

export interface XpSnapshot {
  id: number;
  player_id: number;
  skill_name: string;
  base_xp: number;
  snapshot_taken_at: string;
}

export interface PetCompletion {
  id: number;
  team_id: number;
  tile_id: number;
  awarded_at: string;
}

export interface TileWithProgress {
  tile: Tile;
  team1: TeamTileProgress;
  team2: TeamTileProgress;
}

export interface TeamTileProgress {
  team_id: number;
  is_complete: boolean;
  pet_completed: boolean;
  current_drops: number;
  current_xp: number;
}
