import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getFinancialInsights(data: any) {
  const prompt = `Analyze the following financial data for a user and provide 3-4 premium, concise insights. 
  Focus on trends, red flags, and positive improvements.
  
  Data:
  ${JSON.stringify(data)}
  
  Return the insights as a JSON array of objects with 'type' (positive, warning, neutral), 'title', and 'description'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting insights:", error);
    return [];
  }
}
