# FC Footy Scripts

This folder contains utility scripts for the FC Footy application.

## 📊 FPL Scatterplot Generator

**File:** `fpl-scatterplot.mjs`

Generates an interactive scatterplot of FPL player cost vs total points with team logos and interactive features.

### Usage
```bash
node scripts/fpl-scatterplot.mjs
```

### Features
- **Interactive Chart**: Players grouped by position (GK, DEF, MID, FWD)
- **Hover Tooltips**: Player details (name, club, cost, points, position)
- **Team Logos**: Correct team logos from KV database
- **Interactive Legend**: Toggle position visibility
- **Player Names**: Toggle player names on/off
- **Team Logos**: Toggle team logos on/off
- **Statistics Panel**: Updates based on visible positions
- **Linear Regression**: Trend lines for each position

### Output
- **File**: `public/fpl-scatterplot.html`
- **URL**: `http://localhost:3000/fpl-scatterplot.html`
- **Data**: Aggregate season totals (updated when script runs)

### Data Sources
- **FPL Data**: From `/api/fpl-bootstrap` (cached daily)
- **Team Logos**: From KV database
- **Player Stats**: Current season aggregate totals

---

## 🎮 Gameweek Summary Generator

**File:** `gameweek-summary.mjs`

Generates and posts gameweek summaries to Farcaster with infographics.

### Usage
```bash
node scripts/gameweek-summary.mjs
```

### Features
- Fetches FPL standings data
- Matches managers with Farcaster IDs
- Generates infographic with top/bottom performers
- Posts to Farcaster with embed

---

## 🎨 Template Design Tester

**File:** `test-template-design.mjs`

Opens the gameweek infographic template in a browser for design iteration.

### Usage
```bash
node scripts/test-template-design.mjs
```

### Features
- Uses demo data for quick iteration
- Opens template in browser
- Real-time design testing

---

## 🔧 Environment Setup

### Required Environment Variables
```bash
# FPL API
NEXT_PUBLIC_FPL_API_URL=https://fantasy.premierleague.com/api

# Farcaster
NEYNAR_API_KEY=your_neynar_api_key
SIGNER_UUID=your_signer_uuid

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATAJWT=your_pinata_jwt
NEXT_PUBLIC_PINATAGATEWAY=https://gateway.pinata.cloud

# KV Database
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
NEXT_PUBLIC_KV_REST_API_URL=your_kv_url
NEXT_PUBLIC_KV_REST_API_TOKEN=your_kv_token

# Notifications
NEXT_PUBLIC_NOTIFICATION_API_KEY=your_notification_key
```

### Installation
```bash
# Install dependencies
yarn install

# Run scripts
node scripts/[script-name].mjs
```

---

## 📁 File Structure

```
scripts/
├── README.md                    # This file
├── fpl-scatterplot.mjs         # FPL player analysis scatterplot
├── gameweek-summary.mjs        # Gameweek summary generator
└── test-template-design.mjs    # Template design tester
```

---

## 🚀 Quick Start

1. **Generate FPL Scatterplot**:
   ```bash
   node scripts/fpl-scatterplot.mjs
   ```
   Opens: `http://localhost:3000/fpl-scatterplot.html`

2. **Test Template Design**:
   ```bash
   node scripts/test-template-design.mjs
   ```
   Opens template in browser for design iteration

3. **Generate Gameweek Summary**:
   ```bash
   node scripts/gameweek-summary.mjs
   ```
   Posts to Farcaster with infographic

---

## 🔄 Data Updates

- **FPL Scatterplot**: Run script to update with latest FPL data
- **Gameweek Summary**: Run after each gameweek for latest standings
- **Template Design**: Use for visual iteration and testing

---

## 📊 Data Caching

- **FPL Bootstrap**: Cached daily in Redis
- **Team Data**: Fetched from KV database
- **Generated Pages**: All data embedded in HTML (no DB hits during interaction)

---

## 🎯 Use Cases

### For FPL Analysis
- **Player Value Analysis**: Cost vs points correlation
- **Position Performance**: Compare GK, DEF, MID, FWD
- **Team Performance**: Visualize team logos and performance

### For Content Creation
- **Gameweek Summaries**: Automated Farcaster posts
- **Infographic Generation**: Visual content for social media
- **Template Testing**: Design iteration and validation

---

## 🛠️ Development

### Adding New Scripts
1. Create new `.mjs` file in `scripts/` folder
2. Add documentation to this README
3. Include usage examples and features
4. Update environment variables if needed

### Script Guidelines
- Use ES modules (`import/export`)
- Include error handling
- Add console logging for debugging
- Document environment requirements
- Test with sample data first

---

## 📞 Support

For issues or questions about these scripts:
1. Check environment variables are set correctly
2. Verify API endpoints are accessible
3. Check console output for error messages
4. Ensure dependencies are installed

---

*Last updated: $(date)*

 