const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "functions", ".env") });

const Anthropic = (() => {
  try {
    const mod = require("@anthropic-ai/sdk");
    return mod.default || mod;
  } catch {
    console.error("\x1b[31m✗ Missing dependency. Run: npm install\x1b[0m");
    process.exit(1);
  }
})();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ── Anthropic client ──
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-new-key-here") {
  console.error("\x1b[31m✗ Set your ANTHROPIC_API_KEY in functions/.env\x1b[0m");
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Cloud Function logic (same as functions/index.js) ──
async function explainAnswer(data) {
  const { question, options, correct } = data;

  if (!question || typeof question !== "string" || question.length > 500)
    throw new Error("Invalid request: question is required");
  if (!Array.isArray(options) || options.length !== 4)
    throw new Error("Invalid request: exactly 4 options required");
  if (typeof correct !== "number" || correct < 0 || correct > 3)
    throw new Error("Invalid request: correct must be 0-3");

  const letters = ["a", "b", "c", "d"];
  const optionsList = options.map((o, i) => `${letters[i]}) ${o}`).join("\n");
  const userMessage = `Question: ${question}\n\nOptions:\n${optionsList}\n\nMarked correct answer: ${letters[correct]}) ${options[correct]}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system:
      "You are a Turkish language tutor. Given a quiz question, explain in 1-2 sentences in English why the correct answer is correct. Reference the relevant Turkish grammar rule, vocabulary meaning, or usage pattern. If you believe the marked correct answer is actually wrong, start your response with 'NOTE:' followed by your correction reasoning, then provide the explanation for what you believe is the correct answer.",
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0].text.trim();
  return { explanation: text, hasWarning: text.startsWith("NOTE:") };
}

// ── Server ──
const server = http.createServer(async (req, res) => {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // API endpoint — mimics Firebase callable function
  if (req.method === "POST" && req.url === "/api/explainAnswer") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { data } = JSON.parse(body);
        const result = await explainAnswer(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: { data: result } }));
      } catch (err) {
        console.error("API error:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  // Static files
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  filePath = path.join(ROOT, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  \x1b[32m✓\x1b[0m Turkish Quiz Game dev server");
  console.log("");
  console.log("  \x1b[36m➜\x1b[0m  http://localhost:" + PORT);
  console.log("  \x1b[36m➜\x1b[0m  API: /api/explainAnswer");
  console.log("");
  console.log("  \x1b[2mPress Ctrl+C to stop\x1b[0m");
  console.log("");
});
