import test from "node:test";
import assert from "node:assert/strict";
import { enrichTeamsWithEspnLogos } from "./espnTeamLogos.ts";

test("adds ESPN logos to promoted FPL teams", () => {
  const fplTeams = [
    { id: 7, name: "Coventry City", short_name: "COV" },
    { id: 11, name: "Hull City", short_name: "HUL" },
    { id: 12, name: "Ipswich Town", short_name: "IPS" },
  ];
  const espnTeams = [
    {
      id: "388",
      displayName: "Coventry City",
      abbreviation: "COV",
      logos: [{ href: "https://a.espncdn.com/i/teamlogos/soccer/500/388.png" }],
    },
    {
      id: "306",
      displayName: "Hull City",
      abbreviation: "HUL",
      logos: [{ href: "https://a.espncdn.com/i/teamlogos/soccer/500/306.png" }],
    },
    {
      id: "373",
      displayName: "Ipswich Town",
      abbreviation: "IPS",
      logos: [{ href: "https://a.espncdn.com/i/teamlogos/soccer/500/373.png" }],
    },
  ];

  const enriched = enrichTeamsWithEspnLogos(fplTeams, espnTeams);

  assert.deepEqual(
    enriched.map(({ espnId, logoUrl }) => ({ espnId, logoUrl })),
    [
      {
        espnId: "388",
        logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/388.png",
      },
      {
        espnId: "306",
        logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/306.png",
      },
      {
        espnId: "373",
        logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/373.png",
      },
    ]
  );
});

test("maps the FPL Manchester abbreviations to ESPN abbreviations", () => {
  const enriched = enrichTeamsWithEspnLogos(
    [
      { id: 1, name: "Man City", short_name: "MCI" },
      { id: 2, name: "Man Utd", short_name: "MUN" },
    ],
    [
      {
        id: "382",
        displayName: "Manchester City",
        abbreviation: "MNC",
        logo: "https://example.com/mnc.png",
      },
      {
        id: "360",
        displayName: "Manchester United",
        abbreviation: "MAN",
        logo: "https://example.com/man.png",
      },
    ]
  );

  assert.equal(enriched[0].espnId, "382");
  assert.equal(enriched[1].espnId, "360");
});

test("leaves unmatched teams usable without inventing a logo", () => {
  const [team] = enrichTeamsWithEspnLogos(
    [{ id: 1, name: "Unknown FC", short_name: "UNK" }],
    []
  );

  assert.equal(team.name, "Unknown FC");
  assert.equal(team.logoUrl, undefined);
});
