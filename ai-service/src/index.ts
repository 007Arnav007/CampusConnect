import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";

const localEnv = path.resolve(process.cwd(), process.env.CAMPUSCONNECT_ENV_FILE ?? "../.env");
if (fs.existsSync(localEnv)) {
  try {
    const config = fs.readFileSync(localEnv, "utf8");
    for (const line of config.split(/\r?\n/)) {
      const match = line.match(/^\s*(GEMINI_API_KEY|GEMINI_MODEL)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      const value = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
      if (value) process.env[match[1]] = value;
    }
  } catch {
    // The service can still run with its process environment if local config is unreadable.
  }
}

const port = Number(process.env.AI_SERVICE_PORT ?? 5000);
const app = express();
app.use(cors({
  origin: [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:5175",
    "http://localhost:5175"
  ]
}));
app.use(express.json({ limit: "32kb" }));

type KnowledgeDocument = { id: string; title: string; content: string; academic?: boolean; courseId?: string };
type AssistantMessage = { role: "user" | "model"; content: string };

function loadKnowledgeBase(): KnowledgeDocument[] {
  const root = path.resolve(process.env.KNOWLEDGE_BASE_PATH ?? "../knowledge-base");
  if (!fs.existsSync(root)) return [];
  const documents: KnowledgeDocument[] = [];

  function visit(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
        const id = relativePath.replace(/\.md$/i, "");
        const title = path.basename(entry.name, ".md").replaceAll("-", " ");
        documents.push({ id, title, content: fs.readFileSync(filePath, "utf8").slice(0, 12_000) });
      }
    }
  }

  visit(root);
  return documents.sort((left, right) => left.title.localeCompare(right.title));
}

const knowledgeBase = loadKnowledgeBase();
const stopWords = new Set(["the", "and", "for", "with", "that", "this", "what", "when", "where", "how", "can", "you", "from", "are", "was", "does", "about", "help", "please"]);
const isSetValue = (value: string | undefined): value is string =>
  Boolean(value?.trim() && !/^(replace-with-|your-)/i.test(value.trim()));

function tokenize(value: string) {
  return [...new Set(value.toLowerCase().split(/\W+/).filter((term) => term.length > 2 && !stopWords.has(term)))];
}

function findKnowledge(query: string) {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  return knowledgeBase
    .map((document) => {
      const haystack = `${document.title}\n${document.content}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { document, score };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

async function findAcademicKnowledge(query: string, authorization?: string) {
  const backend = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  if (!authorization) return [];
  try {
    const result = await fetch(`${backend}/api/v1/academics/search?q=${encodeURIComponent(query)}`, {
      headers: { authorization },
      signal: AbortSignal.timeout(2_000)
    });
    if (!result.ok) return [];
    const documents = await result.json() as Array<{ id: string; title: string; content: string; courseId?: string }>;
    return documents.slice(0, 3).map((document) => ({ document: { ...document, academic: true }, score: 1 }));
  } catch {
    return [];
  }
}

function validConversation(input: unknown): AssistantMessage[] | undefined {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return undefined;
  const messages: AssistantMessage[] = [];
  for (const message of input) {
    if (!message || typeof message !== "object") return undefined;
    const candidate = message as Record<string, unknown>;
    if ((candidate.role !== "user" && candidate.role !== "model") || typeof candidate.content !== "string") return undefined;
    const content = candidate.content.trim();
    if (!content || content.length > 2_000) return undefined;
    messages.push({ role: candidate.role, content });
  }
  if (messages.at(-1)?.role !== "user") return undefined;
  return messages;
}

app.get("/health", (_request, response) => {
  const configured = isSetValue(process.env.GEMINI_API_KEY) && isSetValue(process.env.GEMINI_MODEL);
  response.json({
    status: "UP",
    service: "ai-service",
    configured,
    provider: configured ? "gemini" : "retrieval-fallback",
    knowledgeDocuments: knowledgeBase.length
  });
});

app.get("/api/v1/knowledge", (_request, response) => {
  response.json(knowledgeBase.map(({ id, title, content }) => ({
    id,
    title,
    content,
    excerpt: content.replace(/^#+\s.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 220)
  })));
});

app.post("/api/v1/assistant/ask", async (request, response) => {
  const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
  if (!message || message.length > 2_000) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter a question up to 2,000 characters." } });
    return;
  }
  const result = await answerConversation([{ role: "user", content: message }], request.header("authorization"));
  response.json(result);
});

app.post("/api/v1/assistant/chat", async (request, response) => {
  const messages = validConversation(request.body?.messages);
  if (!messages) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide 1–20 valid chat messages ending with a user message." } });
    return;
  }
  response.json(await answerConversation(messages, request.header("authorization")));
});

async function answerConversation(messages: AssistantMessage[], authorization?: string) {
  const latestQuestion = messages.at(-1)?.content ?? "";
  if (/\b(fire|ambulance|medical emergency|attack|danger|threat)\b/i.test(latestQuestion)) {
    return {
      answer: "This may be an emergency. Contact campus security or local emergency services immediately. This assistant is not an emergency-response service.",
      intent: "EMERGENCY",
      sources: [],
      mode: "safety-guidance"
    };
  }

  const matches = [...findKnowledge(latestQuestion), ...(await findAcademicKnowledge(latestQuestion, authorization))];
  const sources = matches.map(({ document }) => document.title);
  const context = matches.map(({ document }) => `SOURCE: ${document.title}${document.academic ? " (approved academic document)" : ""}\n${document.content}`).join("\n\n");
  if (!matches.length) {
    return {
      answer: "I couldn't verify that from the approved campus knowledge currently available. Try a related term or contact the relevant campus office. You can also create a support ticket.",
      intent: "UNKNOWN",
      sources: [],
      mode: "retrieval-fallback",
      fallbackReason: knowledgeBase.length ? "NO_MATCHING_SOURCE" : "KNOWLEDGE_BASE_EMPTY"
    };
  }

  const generated = await generateGeminiAnswer(messages, context);
  return {
    answer: generated.text ?? `Approved campus guidance from ${sources.join(", ")}:\n\n${matches[0].document.content.slice(0, 1_800)}`,
    intent: "CAMPUS_QUERY",
    sources,
    mode: generated.text ? "gemini" : "retrieval-fallback",
    ...(generated.text ? {} : { fallbackReason: generated.reason })
  };
}

async function generateGeminiAnswer(messages: AssistantMessage[], context: string): Promise<{ text?: string; reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!isSetValue(apiKey) || !isSetValue(model)) return { reason: "GEMINI_NOT_CONFIGURED" };

  try {
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(18_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              "You are CampusConnect, a campus support assistant.",
              "Answer campus questions only from the approved context below.",
              "Use the chat history only to understand the user's current question; do not invent campus policy, contacts, deadlines, or outcomes.",
              "If the sources are insufficient, say that you cannot verify the answer and suggest contacting the responsible office.",
              `Approved campus context:\n${context}`
            ].join("\n\n")
          }]
        },
        contents: messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }]
        })),
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
      })
    });
    if (!result.ok) return { reason: `GEMINI_HTTP_${result.status}` };
    const payload = await result.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return text ? { text } : { reason: "GEMINI_EMPTY_RESPONSE" };
  } catch (error) {
    return { reason: error instanceof Error && error.name === "TimeoutError" ? "GEMINI_TIMEOUT" : "GEMINI_UNAVAILABLE" };
  }
}

app.listen(port, process.env.BIND_HOST ?? "127.0.0.1", () => {
  console.log(`CampusConnect AI service listening on ${port}`);
});
