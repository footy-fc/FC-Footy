# Fanclub API

These routes expose the Footy club catalog and the Farcaster users who support each club.

Base URL on production:

```text
https://fc-footy.vercel.app
```

## 1. List clubs

```http
GET /api/fanclubs/clubs
```

Optional query params:

- `type=club|country|all`
- `leagueId=eng.1`

Default behavior:

- `type` defaults to `club`
- returns the selectable team catalog used by Footy

Example:

```bash
curl "https://fc-footy.vercel.app/api/fanclubs/clubs?leagueId=eng.1"
```

Response shape:

```json
{
  "ok": true,
  "count": 20,
  "filters": {
    "leagueId": "eng.1",
    "type": "club"
  },
  "clubs": [
    {
      "teamId": "eng.1-ars",
      "name": "Arsenal",
      "abbreviation": "ars",
      "leagueId": "eng.1",
      "leagueName": "Premier League",
      "logoUrl": "https://...",
      "roomHash": "0x...",
      "type": "club"
    }
  ]
}
```

Use `teamId` as the canonical key in the supporters endpoint.

## 2. List supporters for a club

```http
GET /api/fanclubs/supporters
```

Required query params:

- either `teamId=eng.1-ars`
- or `leagueId=eng.1&abbr=ars`

Optional query params:

- `primaryOnly=true|false`
- `includePreferences=true|false`

Default behavior:

- `primaryOnly=true`
- this means the endpoint returns users whose main team is the target club, matching Footy’s “first item in the preferences array” rule

Examples:

```bash
curl "https://fc-footy.vercel.app/api/fanclubs/supporters?teamId=eng.1-ars"
curl "https://fc-footy.vercel.app/api/fanclubs/supporters?leagueId=eng.1&abbr=ars&primaryOnly=false"
curl "https://fc-footy.vercel.app/api/fanclubs/supporters?teamId=eng.1-ars&includePreferences=true"
```

Response shape:

```json
{
  "ok": true,
  "team": {
    "teamId": "eng.1-ars",
    "name": "Arsenal",
    "abbreviation": "ars",
    "leagueId": "eng.1",
    "leagueName": "Premier League",
    "logoUrl": "https://...",
    "roomHash": "0x...",
    "type": "club"
  },
  "filters": {
    "primaryOnly": true,
    "includePreferences": false
  },
  "count": 2,
  "supporters": [
    {
      "fid": 123,
      "username": "alice",
      "displayName": "Alice",
      "pfpUrl": "https://...",
      "primaryTeamId": "eng.1-ars",
      "supportsTargetAsPrimary": true
    }
  ]
}
```

Notes:

- `fid` is the Farcaster ID you can use elsewhere.
- `username` is resolved from the Farcaster/HyperSnap user API.
- if `primaryOnly=false`, the endpoint returns anyone who follows the club anywhere in their Footy preferences.
- if `includePreferences=true`, each supporter object also includes the raw `teamPreferences` array.
