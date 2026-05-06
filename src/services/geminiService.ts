import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzePosture = async (angle: number, history: number[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The patient's current posture angle is ${angle.toFixed(1)} degrees. 
History of last 10 readings: ${history.slice(0, 10).map(n => n.toFixed(1)).join(', ')}.
Provide a crisp, 1-sentence medical insight for spinal alignment.`,
      config: {
        systemInstruction: "You are a professional Physiotherapist. Be extremely concise. Avoid fluff. Focus on immediate biomechanical correction.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Keep your chin tucked and shoulders relaxed.";
  }
};

export const generatePostureSummary = async (history: number[], score: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Give me a friendly and simple summary of how I sat today.
Data for you:
- My Score: ${score}%
- My Recent Moves (Last 50): ${history.join(', ')}

Please:
1. Start with a 1-sentence supportive opening (e.g., "You're doing great!" or "Let's focus a bit more on sitting tall").
2. Give 3 simple bullet points:
   - Notice any patterns (e.g., "You tend to lean forward after about 15 minutes").
   - Mention when I started getting tired (e.g., "Your posture dipped a bit towards the end").
   - Give one easy-to-do tip for tomorrow.
Keep the language warm, simple, and very easy to understand. No medical jargon.`,
      config: {
        systemInstruction: "You are a friendly, encouraging personal Posture Coach. Use simple, everyday language. Be supportive and focus on small, easy improvements rather than clinical/medical terms.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "I couldn't put your summary together right now. Let's keep working on that posture!";
  }
};

export const chatWithAssistant = async (message: string, context: any) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User message: ${message}
Current Context: ${JSON.stringify(context)}
Provide a crisp, clear, and professional medical answer. If providing a summary, use bullet points. Otherwise, keep it short.`,
      config: {
        systemInstruction: "You are PostureCare AI. Give crisp, clear answers. Use bullet points for summaries. Avoid long paragraphs. Be a clinical but friendly guide.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini chat error:", error);
    return "I'm having trouble connecting to my medical database. Try again in a moment.";
  }
};
