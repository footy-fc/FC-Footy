#!/bin/bash

# Remove Duplicate Teams Script
# Uses curl and jq to identify and remove duplicate teams via API

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

# Function to get all teams
get_all_teams() {
    echo -e "${YELLOW}📊 Fetching all teams...${NC}"
    local response=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams")
    echo "$response" | jq -r '.[] | @base64'
}

# Function to decode base64 team data
decode_team() {
    local encoded="$1"
    echo "$encoded" | base64 -d | jq -r .
}

# Function to find duplicates
find_duplicates() {
    local teams_json="$1"
    local criteria="$2"
    
    case "$criteria" in
        "name")
            echo "$teams_json" | jq -r 'group_by(.name | ascii_downcase | gsub("\\s+"; "")) | .[] | select(length > 1) | .[] | @base64'
            ;;
        "abbreviation")
            echo "$teams_json" | jq -r 'group_by(.abbreviation | ascii_downcase) | .[] | select(length > 1) | .[] | @base64'
            ;;
        "nameAndCountry")
            echo "$teams_json" | jq -r 'group_by("\(.name | ascii_downcase | gsub("\\s+"; ""))-\(.country | ascii_downcase)") | .[] | select(length > 1) | .[] | @base64'
            ;;
        *)
            echo "$teams_json" | jq -r 'group_by(.name | ascii_downcase | gsub("\\s+"; "")) | .[] | select(length > 1) | .[] | @base64'
            ;;
    esac
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

# Function to compare creation dates
compare_dates() {
    local date1="$1"
    local date2="$2"
    
    # Convert to timestamp for comparison
    local timestamp1=$(date -d "$date1" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S.%NZ" "$date1" +%s 2>/dev/null || echo "0")
    local timestamp2=$(date -d "$date2" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S.%NZ" "$date2" +%s 2>/dev/null || echo "0")
    
    if [ "$timestamp1" -lt "$timestamp2" ]; then
        echo "first"
    else
        echo "second"
    fi
}

# Main execution
main() {
    # Get all teams
    local teams_base64=$(get_all_teams)
    local teams_count=$(echo "$teams_base64" | wc -l)
    
    echo -e "${GREEN}Found $teams_count total teams${NC}\n"
    
    if [ "$teams_count" -eq 0 ]; then
        echo -e "${YELLOW}No teams found. Exiting...${NC}"
        exit 0
    fi
    
    # Convert to JSON array for processing
    local teams_json="["
    local first=true
    while IFS= read -r team_base64; do
        if [ -n "$team_base64" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                teams_json="$teams_json,"
            fi
            teams_json="$teams_json$(echo "$team_base64" | base64 -d)"
        fi
    done <<< "$teams_base64"
    teams_json="$teams_json]"
    
    # Find duplicates by different criteria
    local duplicate_criteria=("name" "abbreviation" "nameAndCountry")
    local all_duplicates=""
    local total_duplicates=0
    
    for criteria in "${duplicate_criteria[@]}"; do
        echo -e "${BLUE}🔍 Checking for duplicates by $criteria...${NC}"
        
        local duplicates=$(find_duplicates "$teams_json" "$criteria")
        local duplicate_count=$(echo "$duplicates" | wc -l)
        
        if [ "$duplicate_count" -gt 0 ]; then
            echo -e "${YELLOW}Found $duplicate_count potential duplicates by $criteria${NC}"
            
            # Group duplicates by their key
            local grouped_duplicates=$(echo "$teams_json" | jq -r --arg criteria "$criteria" '
                if $criteria == "name" then
                    group_by(.name | ascii_downcase | gsub("\\s+"; ""))
                elif $criteria == "abbreviation" then
                    group_by(.abbreviation | ascii_downcase)
                elif $criteria == "nameAndCountry" then
                    group_by("\(.name | ascii_downcase | gsub("\\s+"; ""))-\(.country | ascii_downcase)")
                else
                    group_by(.name | ascii_downcase | gsub("\\s+"; ""))
                end | .[] | select(length > 1) | @base64
            ')
            
            echo "$grouped_duplicates" >> /tmp/duplicates_$criteria.txt
            total_duplicates=$((total_duplicates + duplicate_count))
        else
            echo -e "${GREEN}No duplicates found by $criteria${NC}"
        fi
        echo
    done
    
    if [ "$total_duplicates" -eq 0 ]; then
        echo -e "${GREEN}🎉 No duplicates found! All teams are unique.${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}🗑️  Found $total_duplicates potential duplicates to review${NC}"
    echo -e "${YELLOW}Would you like to proceed with removal? (y/N)${NC}"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled.${NC}"
        exit 0
    fi
    
    # Process duplicates
    local removed_count=0
    
    for criteria in "${duplicate_criteria[@]}"; do
        if [ -f "/tmp/duplicates_$criteria.txt" ]; then
            echo -e "${BLUE}Processing duplicates by $criteria...${NC}"
            
            while IFS= read -r group_base64; do
                if [ -n "$group_base64" ]; then
                    local group_json=$(echo "$group_base64" | base64 -d)
                    local group_size=$(echo "$group_json" | jq length)
                    
                    if [ "$group_size" -gt 1 ]; then
                        echo -e "${YELLOW}Found group of $group_size duplicates:${NC}"
                        
                        # Get the first two teams in the group
                        local team1=$(echo "$group_json" | jq '.[0]')
                        local team2=$(echo "$group_json" | jq '.[1]')
                        
                        local name1=$(echo "$team1" | jq -r '.name')
                        local id1=$(echo "$team1" | jq -r '.id')
                        local created1=$(echo "$team1" | jq -r '.createdAt')
                        
                        local name2=$(echo "$team2" | jq -r '.name')
                        local id2=$(echo "$team2" | jq -r '.id')
                        local created2=$(echo "$team2" | jq -r '.createdAt')
                        
                        echo "  Team 1: $name1 ($id1) - Created: $created1"
                        echo "  Team 2: $name2 ($id2) - Created: $created2"
                        
                        # Determine which to keep (earlier creation date)
                        local keep_first=$(compare_dates "$created1" "$created2")
                        
                        if [ "$keep_first" = "first" ]; then
                            echo -e "${GREEN}  Keeping: $name1 (earlier creation date)${NC}"
                            if delete_team "$id2" "$name2"; then
                                removed_count=$((removed_count + 1))
                            fi
                        else
                            echo -e "${GREEN}  Keeping: $name2 (earlier creation date)${NC}"
                            if delete_team "$id1" "$name1"; then
                                removed_count=$((removed_count + 1))
                            fi
                        fi
                        echo
                    fi
                fi
            done < "/tmp/duplicates_$criteria.txt"
            
            # Clean up temp file
            rm -f "/tmp/duplicates_$criteria.txt"
        fi
    done
    
    echo -e "${GREEN}✅ Successfully removed $removed_count duplicate teams!${NC}"
    
    # Show final count
    local final_teams=$(curl -s -H "x-api-key: $API_KEY" "$API_BASE/teams" | jq length)
    echo -e "${BLUE}📊 Remaining teams: $final_teams${NC}"
}

# Run main function
main "$@" 