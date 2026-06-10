# Game Week Summary Script

This script generates and posts a cast to Farcaster summarizing the current game week performance of managers in the Farcaster Fantasy League, with friendly banter about top and bottom performers.

## Features

- 🏆 Congratulates top 3 performing managers with FIDs and usernames
- 😅 Playfully mentions bottom 3 performing managers with FIDs and usernames
- 📊 Fetches real-time data from the FPL API
- 🎯 Posts directly to Farcaster with proper mentions
- 🔥 Includes friendly banter and emojis for engagement

## Prerequisites

1. **Environment Variables**: You need to set up the following environment variables:
   - `NEYNAR_API_KEY` or `NEXT_PUBLIC_NEYNAR_API_KEY`: Your Neynar API key
   - `SIGNER_UUID`: Your Farcaster signer UUID for posting casts

2. **Dependencies**: The script uses the following packages (already in package.json):
   - `@neynar/nodejs-sdk`
   - `dotenv`

## Usage

### Run the script:
```bash
yarn gameweek:summary
```

Or directly:
```bash
node scripts/gameweek-summary.mjs
```

### Test the script (without posting):
```bash
yarn gameweek:summary:test
```

Or directly:
```bash
node scripts/gameweek-summary-test.mjs
```

### Upload a manually exported infographic
If you have already exported the latest PNG locally and just want the script to upload it to QStorage instead of doing that by hand:

```bash
node scripts/gameweek-summary-test.mjs --image /absolute/path/to/gameweek-summary.png
```

Or for the live posting script:

```bash
node scripts/gameweek-summary.mjs --image /absolute/path/to/gameweek-summary.png
```

You can also use:

```bash
GAMEWEEK_SUMMARY_IMAGE_PATH=/absolute/path/to/gameweek-summary.png node scripts/gameweek-summary-test.mjs
```

This uses the app's existing `/api/upload` route, so the target app environment still needs working QStorage variables.

### What it does:

1. **Fetches FPL Data**: Gets current standings from the Farcaster Fantasy League (ID: 18526)
2. **Retrieves Usernames**: Fetches lowercase usernames from Merv Hub using FIDs
3. **Generates Banter**: Creates friendly, playful text with football emojis for top and bottom performers
4. **Posts Cast**: Publishes the summary to Farcaster with proper mentions (no FIDs, no hashtags)

## Example Output

The script will generate a cast like this:

```
🎮 Game Week Summary - Farcaster Fantasy League! 🏆

🥇 @je11yf15h - The king stays king! 👑⚽️
🥈 @femmie - So close, yet so far! 😅⚽️
🥉 @sunkybobo - Bronze medal energy! 🎯⚽️

😅 @neolethh.base.eth - At least you're not last... oh wait! 😂⚽️
🤔 @kai19 - Maybe next week? 🤞⚽️
💪 @juvelir - Keep fighting! 💪⚽️

⚽ Keep the banter friendly and the competition fierce! 🔥
```

## Configuration

### League ID
The script is configured to use the Farcaster Fantasy League (ID: 18526). To change this, modify the `leagueId` parameter in the `fetchFPLLeagueData()` function call.

### Banter Style
The banter is designed to be friendly and playful, not mean-spirited, with football-themed emojis. You can customize the banter functions:
- `generateTopPerformersBanter()`: For top 3 performers
- `generateBottomPerformersBanter()`: For bottom 3 performers

### Username Format
- Usernames are fetched from Merv Hub and converted to lowercase
- No FIDs are displayed in the final cast
- Mentions use the format `@username` only

## Error Handling

The script includes comprehensive error handling:
- ✅ Validates environment variables
- ✅ Checks for minimum number of managers with FIDs
- ✅ Handles FPL API errors gracefully
- ✅ Provides detailed console output for debugging

## Console Output

The script provides detailed console output showing:
- 🔄 Progress indicators
- ✅ Success confirmations
- 📊 Manager rankings and stats
- 📝 Generated cast text preview
- 🔗 Cast hash after successful posting

## Troubleshooting

### Common Issues:

1. **Missing Environment Variables**
   ```
   ❌ Missing NEYNAR_API_KEY environment variable
   ❌ Missing SIGNER_UUID environment variable
   ```
   Solution: Set up your `.env` file with the required variables
   
   💡 **Tip**: Use `yarn gameweek:summary:test` to test the script without needing the SIGNER_UUID

2. **Upload route works manually but not from the script**
   - Make sure the app is running on `http://localhost:3000`, or that `NEXT_PUBLIC_URL` points at a deployed environment with working `/api/upload`.
   - The upload route requires QStorage env vars on the server side:
     - `QSTORAGE_ENDPOINT`
     - `QSTORAGE_BUCKET`
     - `QSTORAGE_ACCESS_KEY_ID`
     - `QSTORAGE_SECRET_ACCESS_KEY`
     - optional: `QSTORAGE_REGION`, `QSTORAGE_PREFIX`

3. **Automatic image generation falls back**
   - The current script tries to use `canvas` for PNG generation, but this repo does not currently ship with `canvas`.
   - Use the `--image` workflow above if you are exporting the image yourself.

2. **Insufficient Managers with FIDs**
   ```
   ❌ Need at least 6 managers with FIDs to generate summary
   ```
   Solution: Ensure the fantasy-managers-lookup.json file is up to date

3. **FPL API Errors**
   ```
   ❌ Failed to fetch FPL data: FPL API error: 404
   ```
   Solution: Check if the league ID is correct and the API is accessible

## Future Enhancements

Potential improvements for future versions:
- 📈 Include game week points (not just total)
- 🎯 Add more personalized banter based on performance trends
- 📊 Include league statistics and milestones
- 🏆 Add special mentions for weekly high scorers
- 🔄 Support for multiple leagues

## Contributing

When modifying the script:
- Keep the banter friendly and inclusive
- Maintain the DRY principle
- Add proper error handling for new features
- Test with different league configurations
