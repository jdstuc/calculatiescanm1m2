import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CalculationResult {
  wallsM2: number;
  ceilingsM2: number;
  cornerProtectorsM1: number;
  revealsM1: number;
  details: {
    label: string;
    value: string;
    description: string;
  }[];
  explanation: string;
}

export interface RoomDetail {
  name: string;
  wallsM2: number;
  ceilingsM2: number;
  cornerProtectorsM1: number;
  revealsM1: number;
  notes: string;
}

export interface CalculationResult {
  projectName: string;
  workType: string;
  totalWallsM2: number;
  totalCeilingsM2: number;
  totalCornerProtectorsM1: number;
  totalRevealsM1: number;
  rooms: RoomDetail[];
  explanation: string;
  scaleFound: string;
}

export interface DrawingData {
  mimeType: string;
  data: string;
}

export async function analyzeDrawings(
  drawings: DrawingData[],
  projectName: string,
  workType: string
): Promise<CalculationResult> {
  const model = "gemini-3.1-pro-preview";

  const prompt = `
    Analyseer deze bouwtekeningen voor een professioneel calculatiebureau (${projectName}).
    Type werkzaamheden: ${workType}.

    Taken:
    1. Identificeer de plattegrond(en) en doorsnede(s)/gevel(s).
    2. Bepaal de exacte schaal (bijv. 1:50 of 1:100) op basis van schaalbalken of bekende maten (deuren, trappen).
    3. Maak een gedetailleerde berekening per ruimte/kamer die zichtbaar is op de plattegrond.
    4. Bereken voor elke ruimte: m2 wanden, m2 plafond, m1 hoekbeschermers en m1 dagkanten.
    5. Houd rekening met de hoogtes uit de doorsnedetekening.

    Geef het antwoord strikt in JSON formaat:
    {
      "projectName": "${projectName}",
      "workType": "${workType}",
      "totalWallsM2": getal,
      "totalCeilingsM2": getal,
      "totalCornerProtectorsM1": getal,
      "totalRevealsM1": getal,
      "scaleFound": "bijv. 1:50",
      "rooms": [
        {
          "name": "bijv. Woonkamer",
          "wallsM2": getal,
          "ceilingsM2": getal,
          "cornerProtectorsM1": getal,
          "revealsM1": getal,
          "notes": "Uitleg van de berekening voor deze specifieke ruimte"
        }
      ],
      "explanation": "Algemene samenvatting van de analyse en aannames"
    }

    Wees zo nauwkeurig mogelijk. Als een maat niet leesbaar is, gebruik dan de schaal om deze te herleiden.
  `;

  const drawingParts = drawings.map((d) => ({
    inlineData: {
      mimeType: d.mimeType,
      data: d.data,
    },
  }));

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          ...drawingParts,
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const text = response.text || "{}";
    // Remove potential markdown code blocks if AI included them
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response", e, response.text);
    throw new Error("De AI kon de tekeningen niet in het gewenste detailniveau verwerken. Probeer duidelijkere afbeeldingen.");
  }
}
