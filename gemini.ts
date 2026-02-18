
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const askBloodAssistant = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    // Initializing Gemini client right before making the API call as per strict guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents = [
      ...history,
      { role: 'user' as const, parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction: `You are a professional medical assistant for "Blood Donor Connect". 
        Your goal is to provide helpful, concise information about blood donation.
        
        DYNAMIC ELIGIBILITY CHECK:
        If a user expresses interest in an eligibility check or asks if they can donate, start a proactive, interactive screening. 
        Instead of listing all requirements at once, ask ONE question at a time (e.g., "First, how old are you?", "Great. And do you weigh at least 50kg?").
        Cover: Age (18-65), Weight (50kg+), Recent illness, Travel to malaria-risk areas, Medications, and Recent tattoos/piercings.
        
        Tone: Friendly, professional, and encouraging.
        Constraint: Keep responses under 60 words per turn. 
        Safety: Always remind users that final eligibility is determined by the medical staff at the collection center.`,
      },
    });
    
    // Using the .text property directly instead of calling it as a method
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my knowledge base. Please try again later.";
  }
};
