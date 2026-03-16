
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3001;

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  app.use(express.json());

  // Gemini AI Proxy Routes
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { student } = req.body;
      
      const prompt = `Analyze the following student's late tracking data and predict their punctuality behavior. 
      Student: ${student.name}
      Department: ${student.department}
      Late count this month: ${student.late_count_this_month}
      Current Score: ${student.punctuality_score}
      
      Provide a risk assessment (Low, Medium, High), a one-sentence prediction, and a behavioral recommendation for the lecturer.`;

      const result = await genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING },
              prediction: { type: Type.STRING },
              recommendation: { type: Type.STRING },
            },
            required: ["riskLevel", "prediction", "recommendation"]
          }
        }
      });

      res.json(JSON.parse(result.text || '{}'));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to analyze student patterns" });
    }
  });

  app.post("/api/gemini/student-alert", async (req, res) => {
    try {
      const { student, gate } = req.body;
      
      const prompt = `Write a direct, friendly but firm WhatsApp message to the student ${student.name} about their late arrival at college.
      Arrival Gate: ${gate}
      Time: ${new Date().toLocaleTimeString()}
      Remaining Punctuality Score: ${student.punctuality_score - 5}%
      
      Requirements:
      1. Use direct "You" language.
      2. Keep it punchy and clear.
      3. Mention the score impact.
      4. Use emojis like ⏰ and ⚠️.`;

      const result = await genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      res.json({ text: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate student alert" });
    }
  });

  app.post("/api/gemini/lecturer-alert", async (req, res) => {
    try {
      const { student, lecturerName } = req.body;
      
      const prompt = `Write a high-priority alert message to Lecturer ${lecturerName} about their student ${student.name} who has been late more than 3 times this month.
      Student Name: ${student.name}
      Roll No: ${student.roll_no}
      Late Count: ${student.late_count_this_month + 1}
      Department: ${student.department}
      Stream: ${student.stream}
      Section: ${student.section}
      
      Requirements:
      1. Professional but urgent tone.
      2. Highlight that this is a repeat offense (4th time or more).
      3. Request the lecturer to take disciplinary action or counsel the student.
      4. Use emojis like 🚨 and ⚠️.`;

      const result = await genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      res.json({ text: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to generate lecturer alert" });
    }
  });

  // Twilio Proxy Route
  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, body } = req.body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const sandboxNumber = process.env.TWILIO_SANDBOX_NUMBER || '';

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', `whatsapp:${sandboxNumber}`);
      formData.append('Body', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Twilio Error:', data);
        return res.status(response.status).json(data);
      }

      res.json({ success: true, sid: data.sid });
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Backend running on http://localhost:${PORT}`);
  });
}

startServer();
