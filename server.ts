import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for WebViews and local development origins
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Lazy initialize GoogleGenAI inside route handlers or a helper
  let aiClient: GoogleGenAI | null = null;
  const getAI = () => {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  // API Routes
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { angle, history } = req.body;
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `The patient's current posture angle is ${(angle || 0).toFixed(0)} degrees. 
History of last 10 readings: ${(history || []).slice(0, 10).map((n: number) => n.toFixed(0)).join(', ')}.
Provide a crisp, 1-sentence medical insight for spinal alignment.`,
        config: {
          systemInstruction: "You are a professional Physiotherapist. Be extremely concise. Avoid fluff. Focus on immediate biomechanical correction.",
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server analyze error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze posture" });
    }
  });

  app.post("/api/gemini/summary", async (req, res) => {
    try {
      const { history, score, sessions } = req.body;
      const ai = getAI();

      // Formulate a structured sessions context for the AI
      let sessionsContext = "No prior session history recorded for today yet.";
      if (sessions && Array.isArray(sessions) && sessions.length > 0) {
        sessionsContext = sessions.map((session, index) => {
          // Format times nicely
          let sTime = "Unknown Start";
          let eTime = "Unknown End";
          try {
            if (session.startTime) {
              sTime = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            if (session.endTime) {
              eTime = new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }
          const dateStr = session.date ? new Date(session.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Today";
          const minDuration = Math.max(1, Math.round(session.duration / 60));
          return `Session #${index + 1} (${dateStr} at ${sTime} - ${eTime}):
- Duration: ${minDuration} mins
- Score: ${session.score}% (${session.status || 'Active'})
- Slouches: ${session.slouches || 0} times
- Max Focus Streak: ${Math.round((session.maxFocusStreak || 0) / 60)} mins`;
        }).join("\n\n");
      }

      const prompt = `Perform a highly personalized, smart postural review and pattern analysis.
Here is the data recorded for today:
- Real-time Current Integrity Score: ${score}%
- Live Posture Angle Stream (Latest 50 readings, newer to older): ${(history || []).join(', ')}

--- SESSIONS OF THE USER ---
${sessionsContext}

Please analyze this structured session list and generate a professional, encouraging report with the following:
1. **Introduction**: A supportive opening greeting acknowledging their posture journey today.
2. **Session-by-Session Analysis**: Group/refer to sessions chronologically (e.g., "In your 1st session from 9:00 AM to 11:00 AM...", "In your 2nd session in the afternoon..."). Contrast morning vs. afternoon performance.
3. **Pattern Recognition & Fatigue Detection**: Point out the EXACT times of the day where fatigue risk is highest and slouching incidents occur most frequently. Explain the potential biomechanical reasons (e.g., fatigue of deep stabilizing core muscles or loss of concentration).
4. **Actionable, Tailored Advice**: 2 or 3 hyper-personalized tips for tomorrow based on these specific time patterns to help the user avoid slouching habits.

Make sure the output is written in standard, clean Markdown format with elegant structure. Use a friendly, professional, supportive, and clinical voice.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional, warm, and highly analytical Physiotherapist and Posture Coach. You analyze daily session times, durations, scores, and slouch patterns to give precise, time-sensitive advice without medical jargon.",
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server summary error:", error);
      res.status(500).json({ error: error.message || "Failed to generate summary" });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `User message: ${message}
Current Context: ${JSON.stringify(context || {})}
Provide a crisp, clear, and professional medical answer. If providing a summary, use bullet points. Otherwise, keep it short.`,
        config: {
          systemInstruction: "You are PostureCare AI. Give crisp, clear answers. Use bullet points for summaries. Avoid long paragraphs. Be a clinical but friendly guide.",
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server chat error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server boot crash:", err);
});
