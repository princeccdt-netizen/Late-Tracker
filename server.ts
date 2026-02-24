
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
