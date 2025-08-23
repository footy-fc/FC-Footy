# 🎤 Peter Drury Commentary AI

Experience the magic of Peter Drury's legendary commentary style, powered by AI and trained on his most iconic moments.

## 🚀 Quick Start

### 1. **Demo Page** (Easiest way to test)
Visit: `http://localhost:3000/peter-drury-demo`

This interactive demo lets you:
- Select from 6 different match scenarios
- Generate Peter Drury commentary for each
- See the commentary in real-time
- Compose Farcaster casts with the generated commentary

### 2. **CLI Testing**
```bash
# Test all scenarios
yarn drury:test

# Test specific scenario
yarn drury:test --scenario=messi
yarn drury:test --scenario=roma
yarn drury:test --scenario=morocco

# See all available scenarios
yarn drury:test --help
```

### 3. **API Integration**
```bash
# GET request
curl "http://localhost:3000/api/peter-drury-commentary?eventId=wc22-arg-fra-01&homeTeam=Argentina&awayTeam=France&competition=FIFA%20World%20Cup%202022&eventType=goal&player=Lionel%20Messi&minute=23&score=1-0"

# POST request
curl -X POST http://localhost:3000/api/peter-drury-commentary \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "wc22-arg-fra-01",
    "homeTeam": "Argentina",
    "awayTeam": "France", 
    "competition": "FIFA World Cup 2022",
    "eventType": "goal",
    "player": "Lionel Messi",
    "minute": 23,
    "score": "1-0"
  }'
```

## 🎭 How It Works

### **RAG-Powered System**
1. **Dataset**: 15+ iconic Peter Drury quotes with rich metadata
2. **Embeddings**: OpenAI embeddings for semantic search
3. **Retrieval**: Find most relevant quotes for match context
4. **Generation**: GPT-4o creates authentic Drury-style commentary

### **Peter Drury Style Characteristics**
- Poetic and dramatic language
- Mythology and cultural references
- Emotional crescendos and dramatic pauses
- Alliteration and rhythmic patterns
- National and continental pride
- Historical context and legacy references

## 📁 File Structure

```
src/
├── data/
│   └── peter-drury-commentary.json    # Drury quotes dataset
├── components/
│   ├── ai/
│   │   └── PeterDruryRAG.ts          # Core RAG system
│   └── PeterDruryComposeCast.tsx     # React component
├── app/
│   ├── api/
│   │   └── peter-drury-commentary/   # API endpoint
│   └── peter-drury-demo/             # Demo page
└── scripts/
    └── peter-drury-test.mjs          # CLI test script
```

## 🔧 Integration

### **React Component**
```typescript
import PeterDruryComposeCast from '~/components/PeterDruryComposeCast';

<PeterDruryComposeCast
  eventId="match-123"
  homeTeam="Arsenal"
  awayTeam="Chelsea"
  competition="Premier League"
  eventType="goal"
  player="Bukayo Saka"
  minute={67}
  score="2-1"
  context="Late winner in London derby"
/>
```

### **Direct API Call**
```typescript
import { generatePeterDruryCommentary, createMatchEvent } from '~/components/ai/PeterDruryRAG';

const matchEvent = createMatchEvent(
  "match-123",
  "Arsenal",
  "Chelsea", 
  "Premier League",
  "goal",
  {
    player: "Bukayo Saka",
    minute: 67,
    score: "2-1",
    context: "Late winner in London derby"
  }
);

const commentary = await generatePeterDruryCommentary(matchEvent);
```

## 🎯 Supported Event Types

- `goal` - Goals scored
- `assist` - Assists provided
- `red_card` - Red cards
- `yellow_card` - Yellow cards
- `substitution` - Player substitutions
- `final_whistle` - End of match
- `penalty` - Penalty kicks
- `free_kick` - Free kicks

## 💰 Cost

- **Embeddings**: ~$0.0001 per 1K tokens
- **Text generation**: ~$0.01-0.03 per commentary
- **Total per commentary**: Usually under $0.05

## 🔑 API Keys Required

Only **`NEXT_PUBLIC_OPENAIKEY`** is needed - no additional keys required!

## 🎭 Example Outputs

- *"Lionel Messi has conquered his final peak. Lionel Messi has shaken hands with paradise."*
- *"Roma have risen from their ruins! Manolas, the Greek God in Rome!"*
- *"Moroccan mayhem. Drink it in, Casablanca, relish it, Rabat! This is your night!"*
- *"The little boy from Rosario, Santa Fe, has just pitched up in heaven. He climbs into a galaxy of his own."*

## 🚀 Next Steps

1. **Try the demo page** - `http://localhost:3000/peter-drury-demo`
2. **Test with CLI** - `yarn drury:test`
3. **Integrate into your match events** - Use the API or React component
4. **Add more scenarios** - Extend the dataset with more Drury quotes

---

🎤 **Bringing the magic of football's greatest commentator to your fingertips!**
