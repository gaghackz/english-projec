import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

const TUTOR_PROMPT = `
  You are 'Peak', an interactive writing tutor for an English class. Your goal is to not just correct, but to teach.
  When a user provides text, you must analyze it and return a highly structured JSON response.

  You must strictly adhere to this JSON structure:
  {
    "grammarScore": 8, // A number from 1 to 10 evaluating the raw grammar and syntax quality.
    "errors": [
      {
        "phrase": "The specific incorrect text",
        "explanation": "A one-sentence explanation of why it is wrong."
      }
    ],
    "showDontTell": [
      {
        "telling": "The weak telling sentence",
        "suggestions": ["Alternative showing sentence 1", "Alternative showing sentence 2"]
      }
    ],
    "varianceSummary": "A brief summary analyzing if their sentence lengths are varied or monotonous.",
    "correctedParagraph": "The full original text rewritten to fix all grammatical errors and improve overall flow, while maintaining the user's original voice."
  }

  **Crucial Rule:** Your primary output must highlight the original text for specific critique. Respond ONLY with valid JSON.
`;

export async function POST(req: Request) {
  try {
    const { text, context } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite", // or gemini-2.5-pro
      contents: `Here is the user's text for review (Context: ${context || "None"}):\n"${text}"`,
      config: {
        systemInstruction: TUTOR_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error("No text returned from Gemini");
    }

    const tutorAnalysis = JSON.parse(response.text);
    return NextResponse.json(tutorAnalysis);
  } catch (error) {
    console.error("Peak AI Error:", error);
    return NextResponse.json(
      { error: "The AI could not check your writing right now." },
      { status: 500 },
    );
  }
}
