#!/bin/bash

# Simple Remove Duplicate Teams Script
# Uses only curl and basic shell commands (no jq required)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000/api"
API_KEY="${NEXT_PUBLIC_NOTIFICATION_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_NOTIFICATION_API_KEY environment variable not set${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Starting duplicate team removal process...${NC}\n"

# Function to get all teams and extract names
get_team_names() {
    echo -e "${YELLOW}📊 Fetching all teams...${NC}"
    local response=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams")
    
    # Extract team names using grep and sed (basic approach)
    echo "$response" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | sort
}

# Function to find duplicate names
find_duplicate_names() {
    local names="$1"
    echo "$names" | uniq -d
}

# Function to get team details by name
get_team_by_name() {
    local team_name="$1"
    local response=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams")
    
    # Extract the team object containing this name
    echo "$response" | grep -o '{[^}]*"name":"'"$team_name"'"[^}]*}' | head -1
}

# Function to extract team ID from JSON
extract_team_id() {
    local team_json="$1"
    echo "$team_json" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g'
}

# Function to extract creation date from JSON
extract_created_at() {
    local team_json="$1"
    echo "$team_json" | grep -o '"createdAt":"[^"]*"' | sed 's/"createdAt":"//g' | sed 's/"//g'
}

# Function to delete team
delete_team() {
    local team_id="$1"
    local team_name="$2"
    
    echo -e "${YELLOW}🗑️  Deleting team: $team_name ($team_id)${NC}"
    
    local response=$(curl -s -w "%{http_code}" -X DELETE \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        "$API_BASE/teams/$team_id")
    
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}  ✅ Successfully deleted team: $team_name${NC}"
        return 0
    else
        echo -e "${RED}  ❌ Failed to delete team: $team_name (HTTP $http_code)${NC}"
        echo "Response: $response_body"
        return 1
    fi
}

# Function to compare dates (simple string comparison)
compare_dates() {
    local date1="$1"
    local date2="$2"
    
    # Simple string comparison (ISO dates sort correctly)
    if [[ "$date1" < "$date2" ]]; then
        echo "first"
    else
        echo "second"
    fi
}

# Main execution
main() {
    # Get all team names
    local team_names=$(get_team_names)
    local total_teams=$(echo "$team_names" | wc -l)
    
    echo -e "${GREEN}Found $total_teams total teams${NC}\n"
    
    if [ "$total_teams" -eq 0 ]; then
        echo -e "${YELLOW}No teams found. Exiting...${NC}"
        exit 0
    fi
    
    # Find duplicate names
    local duplicate_names=$(find_duplicate_names "$team_names")
    local duplicate_count=$(echo "$duplicate_names" | wc -l)
    
    if [ "$duplicate_count" -eq 0 ]; then
        echo -e "${GREEN}🎉 No duplicate team names found! All teams are unique.${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}🔍 Found $duplicate_count duplicate team names:${NC}"
    echo "$duplicate_names" | while read -r name; do
        echo "  - $name"
    done
    echo
    
    echo -e "${YELLOW}Would you like to proceed with removal? (y/N)${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled.${NC}"
        exit 0
    fi
    
    # Process duplicates
    local removed_count=0
    
    echo "$duplicate_names" | while read -r duplicate_name; do
        if [ -n "$duplicate_name" ]; then
            echo -e "${BLUE}Processing duplicates for: $duplicate_name${NC}"
            
            # Get all teams with this name
            local response=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams")
            local matching_teams=$(echo "$response" | grep -o '{[^}]*"name":"'"$duplicate_name"'"[^}]*}' | tr '\n' '|')
            
            # Split into individual team objects
            IFS='|' read -ra TEAM_ARRAY <<< "$matching_teams"
            
            if [ ${#TEAM_ARRAY[@]} -gt 1 ]; then
                echo -e "${YELLOW}Found ${#TEAM_ARRAY[@]} teams with name: $duplicate_name${NC}"
                
                # Get details for first two teams
                local team1_json="${TEAM_ARRAY[0]}"
                local team2_json="${TEAM_ARRAY[1]}"
                
                local team1_id=$(extract_team_id "$team1_json")
                local team1_created=$(extract_created_at "$team1_json")
                local team2_id=$(extract_team_id "$team2_json")
                local team2_created=$(extract_created_at "$team2_json")
                
                echo "  Team 1: $duplicate_name ($team1_id) - Created: $team1_created"
                echo "  Team 2: $duplicate_name ($team2_id) - Created: $team2_created"
                
                # Determine which to keep (earlier creation date)
                local keep_first=$(compare_dates "$team1_created" "$team2_created")
                
                if [ "$keep_first" = "first" ]; then
                    echo -e "${GREEN}  Keeping: Team 1 (earlier creation date)${NC}"
                    if delete_team "$team2_id" "$duplicate_name"; then
                        removed_count=$((removed_count + 1))
                    fi
                else
                    echo -e "${GREEN}  Keeping: Team 2 (earlier creation date)${NC}"
                    if delete_team "$team1_id" "$duplicate_name"; then
                        removed_count=$((removed_count + 1))
                    fi
                fi
                echo
            fi
        fi
    done
    
    echo -e "${GREEN}✅ Successfully removed $removed_count duplicate teams!${NC}"
    
    # Show final count
    local final_response=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams")
    local final_count=$(echo "$final_response" | grep -o '"name":"[^"]*"' | wc -l)
    echo -e "${BLUE}📊 Remaining teams: $final_count${NC}"
}

# Run main function
main "$@" 