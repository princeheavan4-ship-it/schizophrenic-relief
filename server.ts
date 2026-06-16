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

  // Initialize Gemini Client
  // Always use process.env.GEMINI_API_KEY
  // MUST set User-Agent header to 'aistudio-build' in httpOptions for telemetry
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const systemInstruction = `You are "Beacon Companion", a highly supportive, grounding, and compassionate AI assistant for the Beacon Support Tracker—an offline-first schizophrenia support tool.
Your goal is to help the user track, manage, and understand their mood fluctuations and psychiatric symptoms (like sensory anomalies, hallucinations, anxious thoughts, disorganization, sleep issues, or social withdrawal) in a safe, non-diagnostic, and deeply validating way.

Core Guidelines:
1. Compassionate Validation: Be warm, calm, clear, and reassuring. Always validate the user's feelings and experience, never argue about reality.
2. Grounding Assistance: If the user is feeling overwhelmed, anxious, or experiencing active symptoms like hallucinations/unusual thoughts, offer simple grounding techniques (e.g., 5-4-3-2-1 sensory exercises, calm box-breathing, or directing attention to a physical anchor).
3. Non-Diagnostic Safety: NEVER prescribe medications, diagnose new conditions, or override clinical advice. Remind the user gently that you are an AI companion, and support them in connecting with their emergency contact or clinical team if they are in distress.
4. Tone: Grounded, serene, simple, warm, and structured. Use clear spacing and bullet points for ease of reading. Avoid overly clinical/cold language or dramatic/hyperbolic phrases. Avoid any "AI" jargon.
5. Contextual Integration: Encourage journaling symptoms or tracking moods in the app. Offer to suggest phrasing they can write in their symptom logs or bring to their clinic visits.
Keep answers concise (around 1-3 short paragraphs max) so they are easy to digest.`;

      // Format contents for generateContent.
      // Each message has role 'user' or 'model', and 'parts: [{ text: "..." }]'
      const contents = [];
      
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
      
      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || "I am here for you, but I couldn't process that response. Let's take a deep breath.";
      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ 
        error: "Failed to generate AI response. Please make sure GEMINI_API_KEY is configured in your secrets." 
      });
    }
  });

  // Vite middleware for development or serving compiled files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
