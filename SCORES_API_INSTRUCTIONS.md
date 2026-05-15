# Scores API Instructions

Use the external scores endpoint on production:

`https://fc-footy.vercel.com/api/scores`

Example request:

`https://fc-footy.vercel.com/api/scores?league=eng.1&apiKey=zaal_winning`

## Purpose

This endpoint proxies ESPN soccer scoreboard data by league slug and returns a JSON payload with:

- `success`
- `source`
- `league`
- `dates`
- `eventCount`
- `data` - the upstream ESPN scoreboard response

## Required query params

- `league`
  - Required
  - ESPN soccer league slug
  - Example: `eng.1`

## Optional query params

- `dates`
  - Optional
  - Format: `YYYYMMDD`
  - Example: `20260515`
- `apiKey`
  - Optional if auth is supplied another way
  - Example: `zaal_winning`

## Auth options

Any one of these is valid:

1. Query param:
   `?apiKey=zaal_winning`
2. Header:
   `x-api-key: zaal_winning`
3. Basic auth:
   username can be anything, password must be the API key

Basic auth example:

`Authorization: Basic base64(anything:zaal_winning)`

## Example requests

### Query param auth

```bash
curl "https://fc-footy.vercel.com/api/scores?league=eng.1&apiKey=zaal_winning"
```

### Header auth

```bash
curl -H "x-api-key: zaal_winning" "https://fc-footy.vercel.com/api/scores?league=eng.1"
```

### With a specific date

```bash
curl "https://fc-footy.vercel.com/api/scores?league=eng.1&dates=20260515&apiKey=zaal_winning"
```

## Response example

```json
{
  "success": true,
  "source": "espn",
  "league": "eng.1",
  "dates": null,
  "eventCount": 1,
  "data": {
    "events": []
  }
}
```

## Error behavior

- `400` if `league` is missing
- `400` if `dates` is not in `YYYYMMDD` format
- `401` if auth is missing or invalid
- `502` if the upstream ESPN scoreboard call fails

## Valid leagues

These are the league slugs currently used in this codebase and safe to hand to a developer:

| League | Slug |
|---|---|
| Premier League | `eng.1` |
| La Liga | `esp.1` |
| Bundesliga | `ger.1` |
| Serie A | `ita.1` |
| Ligue 1 | `fra.1` |
| UEFA Champions League | `uefa.champions` |
| UEFA Europa League | `uefa.europa` |
| FA Cup | `eng.fa` |
| EFL Cup | `eng.league_cup` |
| EFL Championship | `eng.2` |
| MLS | `usa.1` |
| FIFA World Cup | `fifa.world` |
| FIFA Club World Cup | `fifa.cwc` |
| AFCON | `caf.nations` |
| UEFA Nations League | `uefa.nations` |
| World Cup Qualifying UEFA | `fifa.worldq.uefa` |
| World Cup Qualifying CAF | `fifa.worldq.caf` |
| World Cup Qualifying CONCACAF | `fifa.worldq.concacaf` |
| World Cup Qualifying CONMEBOL | `fifa.worldq.conmebol` |
| World Cup Qualifying AFC | `fifa.worldq.afc` |

## Notes

- The endpoint is generic and can work with other valid ESPN soccer league slugs, but the table above is the set already used by this app.
- If the deploy domain changes, keep the path and params the same and only replace the host.
