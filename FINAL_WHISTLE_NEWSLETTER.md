# Final Whistle newsletter

Subscribers manage their preference from **Profile → Final Whistle**. Footy asks only for a delivery email and explicit consent; the authenticated user's verified FPL manager, season, and FC Fantasy league are attached server-side.

## Production configuration

- `FINAL_WHISTLE_ADMIN_TOKEN` — required server-only bearer token for subscriber exports.
- `FINAL_WHISTLE_LIST_INBOX` — optional operations destination. Defaults to `finalwhistle@agentmail.to`, matching the original static signup example.

Do not expose `FINAL_WHISTLE_ADMIN_TOKEN` through a `NEXT_PUBLIC_` variable.

## List operations

The protected endpoint returns active subscribers only and never caches responses.

```sh
curl -H "Authorization: Bearer $FINAL_WHISTLE_ADMIN_TOKEN" \
  "https://your-footy-host.example/api/admin/newsletter"
```

Download a CSV suitable for the Subscribers sheet or an email-provider import:

```sh
curl -H "Authorization: Bearer $FINAL_WHISTLE_ADMIN_TOKEN" \
  "https://your-footy-host.example/api/admin/newsletter?format=csv"
```

Unsubscribed users are removed from the active-subscriber index immediately. A user can also permanently delete their saved preference through the authenticated profile API.
