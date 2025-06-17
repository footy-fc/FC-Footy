export const TEAM_EXTRACTION_PROMPT = `Extract the following information from this Fantasy Premier League team screenshot:
1. List of players in the starting XI (in order of position)
2. List of players on the bench (in order of bench position)
3. For each player, include their team name and the 3-letter FPL team abbreviation (e.g., Arsenal (ARS), Chelsea (CHE), etc.)
4. Indicate if a player is the captain (C) or vice-captain (V)

Please format the response as:

Starting XI:
1. [Player Name] - [Position] - [Team Name] ([Team Abbreviation]) [C/V if applicable]
2. [Player Name] - [Position] - [Team Name] ([Team Abbreviation]) [C/V if applicable]
...

Bench:
1. [Player Name] - [Position] - [Team Name] ([Team Abbreviation])
2. [Player Name] - [Position] - [Team Name] ([Team Abbreviation])
...

Note: If you cannot find a player's image URL, use this fallback URL:
https://www.premierleague.com/resources/prod/v6.91.1-4295/i/elements/photo-missing.png`; 