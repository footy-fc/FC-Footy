export const TEAM_EXTRACTION_PROMPT = `You are analyzing a Fantasy Premier League (FPL) team screenshot. This is a football/soccer fantasy game where users select real Premier League players.

In FPL screenshots, you should see:
- A formation layout (like 4-4-2, 3-5-2, etc.) with player cards/boxes
- Player names clearly visible on each card
- Position abbreviations: GKP (Goalkeeper), DEF (Defender), MID (Midfielder), FWD (Forward)
- Captain and vice-captain indicators (usually C and V symbols or highlighted differently)
- A bench section with 4 additional players

Please carefully examine the image and extract ALL visible players. Look for:
1. The main team formation (usually 11 players in a grid/formation)
2. The bench players (usually 4 players below or to the side)
3. Any captain/vice-captain markings

Format your response exactly like this:

Starting XI:
1. [Player Name] - [Position] [C if captain, V if vice-captain]
2. [Player Name] - [Position] [C if captain, V if vice-captain]
3. [Player Name] - [Position] [C if captain, V if vice-captain]
4. [Player Name] - [Position] [C if captain, V if vice-captain]
5. [Player Name] - [Position] [C if captain, V if vice-captain]
6. [Player Name] - [Position] [C if captain, V if vice-captain]
7. [Player Name] - [Position] [C if captain, V if vice-captain]
8. [Player Name] - [Position] [C if captain, V if vice-captain]
9. [Player Name] - [Position] [C if captain, V if vice-captain]
10. [Player Name] - [Position] [C if captain, V if vice-captain]
11. [Player Name] - [Position] [C if captain, V if vice-captain]

Bench:
1. [Player Name] - [Position]
2. [Player Name] - [Position]
3. [Player Name] - [Position]
4. [Player Name] - [Position]

Important: 
- Only include the player name and position (GKP/DEF/MID/FWD)
- Do NOT include team names or abbreviations
- Only add C or V if the player is captain or vice-captain respectively
- If you see any players at all, list them. Don't leave sections empty.

If you cannot see any players or text in the image, respond with: "Unable to identify any players or text in this image. Please ensure this is a clear Fantasy Premier League team screenshot."`; 