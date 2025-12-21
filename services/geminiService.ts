import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Source, WeatherData } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

export const getWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `Get the current weather for latitude ${lat}, longitude ${lon}.
    You rely on Google Search to find this information.
    
    CRITICAL OUTPUT RULE: Return ONLY a raw JSON object. Do not include Markdown formatting like \`\`\`json or \`\`\`. Do not include any introductory text.
    
    JSON Schema:
    {
      "temp": "Temperature in Celsius (e.g. 24)",
      "humidity": "Humidity percentage (e.g. 65)",
      "wind": "Wind speed in km/h (e.g. 15)",
      "condition": "Short condition (e.g. Sunny)",
      "location": "City/Region name"
    }`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // Check if response has text
    if (!response.text) {
      console.warn("Weather API returned no text content");
      return {
        temp: "--",
        humidity: "--",
        wind: "--",
        condition: "Unavailable",
        location: "Unknown Location"
      };
    }

    let text = response.text;
    
    // Aggressive cleanup to find the JSON object
    // Remove markdown code blocks if present
    text = text.replace(/```json/gi, '').replace(/```/g, '');
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      try {
        const jsonStr = text.substring(start, end + 1);
        const json = JSON.parse(jsonStr);
        return {
          temp: json.temp?.toString() || "--",
          humidity: json.humidity?.toString() || "--",
          wind: json.wind?.toString() || "--",
          condition: json.condition || "Unknown",
          location: json.location || "Unknown Location"
        };
      } catch (e) {
        console.error("JSON Parse error:", e, "Text was:", text);
      }
    }
    
    console.warn("Weather data format invalid. Text received:", response.text);
    return {
      temp: "--",
      humidity: "--",
      wind: "--",
      condition: "Unavailable",
      location: "Unknown Location"
    };

  } catch (error) {
    console.error("Weather fetch error:", error);
    return {
      temp: "--",
      humidity: "--",
      wind: "--",
      condition: "Unavailable",
      location: "Location Error"
    };
  }
};

export const generateResponse = async (
  currentPrompt: string,
  history: Message[],
  imageBase64?: string,
  language: string = 'en-US'
): Promise<{ text: string; sources: Source[] }> => {
  try {
    const modelId = "gemini-2.5-flash"; 

    const parts: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      
      parts.push({
        inlineData: {
          mimeType: "image/jpeg", 
          data: cleanBase64,
        },
      });
      
      if (currentPrompt.length < 5) {
        parts.push({ text: "Analyze this image related to agriculture. Identify any plants, diseases, pests, or deficiencies and recommend treatments." });
      } else {
        parts.push({ text: currentPrompt });
      }
    } else {
      parts.push({ text: currentPrompt });
    }

    // Add language context if Hindi is selected and prompt is short/ambiguous, 
    // otherwise Gemini detects it. We add a nudge in system instruction.
    const systemInstruction = `You are AgriInsight, an expert agricultural consultant. 
    Your goal is to help farmers with crop management, disease identification, pest control, weather interpretation, and soil health. 
    Provide practical, scientific, yet easy-to-understand advice. 
    
    Language Instruction: The user is currently operating in ${language === 'hi-IN' ? 'Hindi' : 'English'} mode. 
    If the user writes or speaks in Hindi, you MUST reply in Hindi (Devanagari script). 
    If the user writes in English, reply in English.
    
    Special Service - YouTube Analysis:
    If the user provides a YouTube video link, use the 'googleSearch' tool to find information about the video (title, description, key topics, transcript summaries). 
    Extract the specific farming advice, techniques, or product recommendations from the video content.
    Even if the video is in English, if the user's language mode is Hindi, translate the insights into Hindi.

    Special Service - Translator:
    If the user asks to translate text, provide a direct and accurate translation preserving agricultural terminology. 
    Do not add conversational filler. Just provide the translation.

    When analyzing plant images, be specific about diagnosis and suggest both organic and chemical remedies. 
    Format your responses with Markdown.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "I couldn't generate a response. Please try again.";
    
    const sources: Source[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Source",
            uri: chunk.web.uri
          });
        }
      });
    }

    return { text, sources };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to get response from AgriInsight.");
  }
};