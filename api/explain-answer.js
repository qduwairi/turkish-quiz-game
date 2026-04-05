const Anthropic = require("@anthropic-ai/sdk").default || require("@anthropic-ai/sdk");

const ALLOWED_ORIGINS = [
  "https://turkish-quiz-game.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin && origin.startsWith("http://localhost:")) return origin;
  return null;
}

function setCorsHeaders(res, origin) {
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  const origin = getCorsOrigin(req);
  setCorsHeaders(res, origin);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, options, correct } = req.body;

  // Validate input
  if (!question || typeof question !== "string" || question.length > 500) {
    return res.status(400).json({ error: "Invalid request: question is required (max 500 chars)" });
  }
  if (!Array.isArray(options) || options.length !== 4) {
    return res.status(400).json({ error: "Invalid request: exactly 4 options required" });
  }
  for (const opt of options) {
    if (!opt || typeof opt !== "string" || opt.length > 200) {
      return res.status(400).json({ error: "Invalid request: each option must be a non-empty string (max 200 chars)" });
    }
  }
  if (typeof correct !== "number" || correct < 0 || correct > 3 || !Number.isInteger(correct)) {
    return res.status(400).json({ error: "Invalid request: correct must be an integer 0-3" });
  }

  // Build prompt
  const letters = ["a", "b", "c", "d"];
  const optionsList = options.map((opt, i) => `${letters[i]}) ${opt}`).join("\n");
  const userMessage = `Question: ${question}\n\nOptions:\n${optionsList}\n\nMarked correct answer: ${letters[correct]}) ${options[correct]}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "You are a Turkish language tutor. Given a quiz question, explain in 1-2 sentences in English why the correct answer is correct. Reference the relevant Turkish grammar rule, vocabulary meaning, or usage pattern. If you believe the marked correct answer is actually wrong, start your response with 'NOTE:' followed by your correction reasoning, then provide the explanation for what you believe is the correct answer.",
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].text.trim();
    const hasWarning = text.startsWith("NOTE:");

    return res.status(200).json({ explanation: text, hasWarning });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return res.status(500).json({ error: "Failed to generate explanation. Please try again." });
  }
};
