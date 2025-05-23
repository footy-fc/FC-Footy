import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Define types
interface PlayerData {
  position: "GKP" | "DEF" | "MID" | "FWD";
  name: string;
  points: number;
  team: string;
}

interface FPLData {
  gameweek?: number;
  totalPoints?: number;
  averageScore?: number;
  players: PlayerData[];
}

// Initialize Gemini AI with the new model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    const mimeType = file.type;

    // Process with Gemini - USING THE NEW MODEL
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      [SYSTEM INSTRUCTION] You are a Fantasy Premier League data extraction assistant.
      Extract ONLY Fantasy Premier League data from this image and return STRICTLY as JSON.
      
      Required JSON format:
      {
        "gameweek": number,
        "totalPoints": number,
        "averageScore": number,
        "players": [
          {
            "position": "GKP|DEF|MID|FWD",
            "name": string,
            "points": number,
            "team": string
          },
          ...
        ]
      }
      
      Rules:
      1. Determine position based on standard FPL positions
      2. Include the player's team (e.g., "Arsenal", "Liverpool")
      3. If team isn't visible, infer from player name or use "Unknown"
      4. Return ONLY the JSON with no additional text or markdown
    `;

    const result = await model.generateContent([
      {
        text: prompt,
      },
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean the response to extract just the JSON
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    
    const data: FPLData = JSON.parse(jsonString);

    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { 
        error: "Failed to process image",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}