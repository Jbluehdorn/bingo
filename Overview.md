# OSRS Bingo

A web app to manage an Old School RuneScape bingo competition between two teams. Both teams compete on the same 5×5 grid of 25 challenges. The first team to complete all 25 tiles wins.

## Tech Stack
- **Frontend/Backend**: Next.js deployed to Cloudflare Pages
- **Database**: Cloudflare D1 (edge SQLite)
- **Image Storage**: Cloudflare R2 (team photos, drop screenshots)
- **UI**: OSRS-themed, dark/medieval aesthetic

## External APIs
- **Wise Old Man API** - https://docs.wiseoldman.net/api
  - Validate player usernames when adding to a team
  - Look up current XP snapshots for exp-based tile tracking
- **OSRSBox API** - https://github.com/osrsbox/osrsbox-api
  - Retrieve boss and skill images for tile display on the board

## Game Structure
- One active game at a time
- Two teams, both competing on the **same** 25 tiles
- Win condition: first team to complete all 25 tiles (full board)
- Admins reset the entire game (tiles, drops, rosters, progress) via a button in /admin to start a new competition

## Teams
- Each team has a name, a team photo (uploaded to R2), and a roster of player usernames
- Player usernames must be validated against the Wise Old Man API before being added
- Team configuration is managed from /admin

## Tiles
There are two types of tiles, shared by both teams:

### Drop Tiles
- Goal: "X uniques from Y boss"
- Requires X separate drop submissions to complete
- Any player on the team can submit drops; one player can submit multiple drops for the same tile
- Each submission requires a player name, the tile, and a screenshot uploaded to R2
- Submissions are **instant** — no admin approval required
- Admins can remove individual drop submissions if needed

### XP Tiles
- Goal: "X total XP in Y skill"
- Progress is tracked **automatically** using the Wise Old Man API
- XP is measured as a **delta** from a baseline snapshot taken when the competition officially starts
- Admins trigger the competition start (which records the baseline XP for all players on both teams)
- A tile completes automatically once a team's combined XP gain meets the goal

## Bonus Pet Tile
- If any player on a team gets a **pet drop**, admins can award that team a free tile completion
- Admins manually select which tile on the board to mark as complete for that team
- This is applied from the /admin page

## Pages

### / (Main Board)
- Displays both teams' 5×5 bingo boards side by side
- Each tile shows:
  - An image of the boss or skill (from OSRSBox API)
  - Current progress toward the tile goal (e.g. "2/3 drops" or "45,230 / 100,000 XP")
  - Green background if complete, red if incomplete
- Each team's name is shown with a "X/25" tiles completed count
- Links to the drop log page for each team

### /log-drop
- Players select their name (from their team's roster) and the relevant tile
- Players upload a screenshot as proof of drop
- Submission is instant and immediately counts toward tile progress

### /admin (Secret, No Auth)
- **Game Management**
  - Start competition (triggers XP baseline snapshot via Wise Old Man API)
  - Reset entire game (clears all tiles, drops, rosters, and progress)
  - Apply bonus pet tile (select a team + tile to auto-complete)
- **Team Management**
  - Edit team names and team photos
  - Add/remove player usernames (validated against Wise Old Man API)
- **Tile Setup**
  - Define the 25 tiles (drop goal or XP goal)
  - For drop tiles: set boss name and required unique count
  - For XP tiles: set skill name and required XP amount
- **Drop Management**
  - View all submitted drops
  - Remove individual drop submissions

