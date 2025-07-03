# FC-Footy Team Management System

## Overview

The FC-Footy Team Management System is a comprehensive solution for managing football teams that can participate in multiple leagues simultaneously. It uses Upstash Redis for data storage and ESPN logos for team branding.

## Architecture

### Core Components

1. **Team Service** (`src/lib/teamService.ts`)
   - Handles CRUD operations for teams, leagues, and memberships
   - Manages Redis data storage and relationships
   - Provides utility methods for team-league operations

2. **ESPN Logo Service** (`src/lib/espnLogoService.ts`)
   - Manages ESPN logo URLs with validation
   - Provides fallback mechanisms for missing logos
   - Supports batch validation for multiple teams

3. **Migration Service** (`src/lib/teamMigrationService.ts`)
   - Migrates existing hardcoded team data to Redis
   - Validates and fixes logo URLs
   - Handles data cleanup and maintenance

4. **Type Definitions** (`src/types/teamTypes.ts`)
   - Comprehensive TypeScript interfaces
   - Service interfaces for data operations
   - Migration and validation result types

## Database Schema

### Redis Key Structure

```
# Team keys
team:{teamId}                    # Team data
team:abbr:{abbreviation}         # Team lookup by abbreviation
team:name:{normalizedName}       # Team lookup by name

# League keys
league:{leagueId}                # League data
league:active                    # List of active leagues

# Membership keys
membership:{membershipId}        # Membership data
team:{teamId}:leagues            # All leagues for a team
league:{leagueId}:teams          # All teams in a league
membership:active:{teamId}       # Active memberships for a team
```

### Data Models

#### Team
```typescript
interface Team {
  id: string;                    // Unique team identifier
  name: string;                  // Full team name
  shortName: string;             // Short display name
  abbreviation: string;          // 3-letter code (e.g., "ars", "liv")
  country: string;               // Country code (e.g., "ENG", "ESP")
  logoUrl: string;               // ESPN logo URL
  roomHash?: string;             // Optional room hash
  createdAt: string;
  updatedAt: string;
}
```

#### League
```typescript
interface League {
  id: string;                    // League identifier (e.g., "eng.1", "uefa.champions")
  name: string;                  // League name
  country: string;               // Country code
  type: "domestic" | "continental" | "international";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### TeamLeagueMembership
```typescript
interface TeamLeagueMembership {
  id: string;                    // Unique membership ID
  teamId: string;                // Reference to team
  leagueId: string;              // Reference to league
  season: string;                // Season (e.g., "2024-25")
  startDate: string;             // When team joined this league
  endDate?: string;              // When team left (if applicable)
  active: boolean;               // Current membership status
  createdAt: string;
  updatedAt: string;
}
```

## ESPN Logo Integration

### Logo URL Pattern
```
https://a.espncdn.com/i/teamlogos/soccer/500/{abbreviation}.png
```

### Features
- **Automatic URL Generation**: Creates ESPN logo URLs from team abbreviations
- **Validation**: Checks if logos exist before using them
- **Fallback System**: Provides alternative logo sources when ESPN logos are unavailable
- **Batch Processing**: Validates multiple logos efficiently

### Fallback Sources
1. ESPN CDN (primary)
2. Supabase storage (existing pattern)
3. Local assets
4. Default spinner image

## API Endpoints

### Migration API
- `POST /api/migrate-teams` - Run team migration
- `GET /api/migrate-teams` - Get API status

### Usage Example
```bash
# Run migration
curl -X POST http://localhost:3000/api/migrate-teams \
  -H "x-api-key: your-api-key"

# Check status
curl http://localhost:3000/api/migrate-teams
```

## Usage Examples

### Creating a Team
```typescript
import { teamService } from '../lib/teamService';

const team = await teamService.createTeam({
  name: "Arsenal",
  shortName: "Arsenal",
  abbreviation: "ars",
  country: "ENG",
  logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/ars.png",
  roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0"
});
```

### Adding Team to League
```typescript
const membership = await teamService.addTeamToLeague({
  teamId: team.id,
  leagueId: "eng.1",
  season: "2024-25",
  startDate: "2024-08-01"
});
```

### Getting Team with All Leagues
```typescript
const teamWithLeagues = await teamService.getTeamWithLeagues(teamId);
console.log(`${teamWithLeagues.name} participates in:`, 
  teamWithLeagues.leagues.map(l => l.name));
```

### Validating ESPN Logo
```typescript
import { ESPNLogoService } from '../lib/espnLogoService';

const isValid = await ESPNLogoService.validateLogo("ars");
const logoData = await ESPNLogoService.getLogoData("ars");
```

## Migration Process

### Step 1: Run Migration
```bash
# Via API
curl -X POST http://localhost:3000/api/migrate-teams

# Or programmatically
import { TeamMigrationService } from '../lib/teamMigrationService';
const result = await TeamMigrationService.migrateExistingData();
```

### Step 2: Validate Logos
```typescript
const logoResult = await TeamMigrationService.validateAndFixLogos();
```

### Migration Results
```typescript
interface MigrationResult {
  teamsCreated: number;
  leaguesCreated: number;
  membershipsCreated: number;
  errors: string[];
}
```

## Testing

### Run Test Suite
```bash
# Execute test script
npx ts-node src/scripts/testTeamServices.ts
```

### Test Coverage
- ✅ ESPN Logo Service
- ✅ Team Service - League Creation
- ✅ Team Service - Team Creation
- ✅ Team Service - Membership Creation
- ✅ Team Service - Get Team with Leagues
- ✅ Team Service - Get League with Teams
- ✅ Team Service - Logo Validation
- ✅ Migration Service (dry run)

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_KV_REST_API_URL=your-upstash-redis-url
NEXT_PUBLIC_KV_REST_API_TOKEN=your-upstash-redis-token
NEXT_PUBLIC_NOTIFICATION_API_KEY=your-api-key
```

## Benefits

### Scalability
- Teams can participate in multiple leagues simultaneously
- Easy to add new leagues and teams
- Efficient Redis-based data storage

### Consistency
- Single source of truth for team data
- Standardized ESPN logo integration
- Consistent data models across the application

### Reliability
- Robust fallback mechanisms for missing logos
- Error handling and validation
- Data integrity through proper relationships

### Performance
- Fast Redis lookups
- Efficient batch operations
- Cached logo validation

## Future Enhancements

1. **Logo CDN**: Implement local logo caching
2. **Bulk Operations**: Add batch team/league operations
3. **Analytics**: Track logo usage and validation metrics
4. **Admin Interface**: Web-based team management UI
5. **API Rate Limiting**: Protect against abuse
6. **Data Export**: Export team data in various formats

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**
   - Verify environment variables
   - Check Upstash Redis status
   - Ensure proper network connectivity

2. **Logo Validation Failures**
   - Check ESPN CDN availability
   - Verify team abbreviations
   - Review fallback mechanisms

3. **Migration Errors**
   - Check for duplicate team abbreviations
   - Verify league definitions
   - Review error logs for specific issues

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=team-service:*
```

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Use conventional commit messages
5. Test with multiple leagues and teams

## License

This project is part of FC-Footy and follows the same licensing terms.

## Team Service Methods

### Core Team Operations
- `createTeam(teamData)` - Create a new team
- `getTeam(teamId)` - Get team by ID
- `getTeamByAbbr(abbreviation)` - Get team by abbreviation
- `getTeamByName(name)` - Get team by name
- `getAllTeams()` - Get ALL teams regardless of league membership
- `updateTeam(teamId, updates)` - Update team data
- `deleteTeam(teamId)` - Delete team and all memberships

### League Operations
- `createLeague(leagueData)` - Create a new league
- `getLeague(leagueId)` - Get league by ID
- `getActiveLeagues()` - Get all active leagues
- `updateLeague(leagueId, updates)` - Update league data

### Membership Operations
- `addTeamToLeague(membershipData)` - Add team to league
- `removeTeamFromLeague(teamId, leagueId, season)` - Remove team from league
- `getTeamLeagues(teamId)` - Get all leagues for a team
- `getLeagueTeams(leagueId)` - Get all teams in a league
- `getActiveTeamMemberships(teamId)` - Get active memberships for a team

### Utility Methods
- `getTeamLogo(teamId, leagueId?)` - Get team logo with validation
- `validateTeamInLeague(teamId, leagueId)` - Check if team is in league
- `getTeamWithLeagues(teamId)` - Get team with all its leagues
- `getLeagueWithTeams(leagueId)` - Get league with all its teams

## Recent Fixes

### Team Retrieval Issue (Fixed)
**Problem**: Teams created without league memberships were not visible in API responses or admin interface.

**Root Cause**: The GET `/api/teams` endpoint only returned teams that were members of active leagues, making orphaned teams invisible.

**Solution**: 
1. Added `getAllTeams()` method to `TeamService` that scans Redis for all team keys
2. Updated GET `/api/teams` to use `getAllTeams()` instead of league-based filtering
3. Updated admin interface to use the new method for consistency

**Result**: All teams are now visible regardless of league membership, allowing proper team management.
``` 
</rewritten_file>