import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const app = express();
app.use(cors());
app.use(express.json());

const queue = new Queue("file-upload-queue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File Upload Config
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Initialize local embeddings
const embeddings = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

const qdrantUrl = process.env.QDRANT_URL ?? process.env.QUAD_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY ?? process.env.QUAD_API_KEY;

const llm = new ChatGoogleGenerativeAI({
  model: "models/gemini-3.6-flash",
  temperature: 0.2,
});

// Upload PDF Endpoint
app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    await queue.add("file-ready", {
      filename: req.file.originalname,
      path: req.file.path,
      destination: req.file.destination,
    });
    return res.json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ message: "Error uploading file" });
  }
});

// Similarity Search Chat Endpoint
// Similarity Search + Gemini RAG Chat Endpoint
app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.q || "hello";

    if (!qdrantUrl || !qdrantApiKey) {
      return res.status(500).json({ error: "Qdrant credentials missing in .env" });
    }

    // 1. Connect to Qdrant collection
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: qdrantUrl,
      apiKey: qdrantApiKey,
      collectionName: "langchainjs-testing",
      checkCompatibility: false,
    });

    // 2. Retrieve top-3 matching chunks
    let contextText = "No relevant document context found.";
    let sources = [];

    try {
      const resultsWithScore = await vectorStore.similaritySearchWithScore(userQuery, 3);

      if (resultsWithScore && resultsWithScore.length > 0) {
        contextText = resultsWithScore.map(([doc]) => doc.pageContent).join("\n\n");
        sources = resultsWithScore.map(([doc]) => ({
          content: doc.pageContent,
          pageNumber: doc.metadata.loc?.pageNumber || "N/A",
        }));
      }
    } catch (err) {
      console.warn("Vector search fallback:", err.message);
    }

    // 3. Define the Prompt (Uses strict variable names for LangChain)
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are Gloria from mordern family.\n" +
        "Your goal is to assist the user like Gloria from the show Modern Family, use the accent she has.\n\n" +
        "GUIDELINES:\n" +
        "1. If the user's query relates to the provided document context, answer clearly using that context.\n" +
        "2. If the user asks a general, random, or conversational question NOT covered in the context, answer it using your general knowledge in Gloria's style.\n" +
        "3. Keep formatting clean with bullet points or spacing when helpful.\n\n" +
        "Document Context:\n{context}"
      ],
      ["human", "{question}"],
    ]);

    // 4. Call Gemini Model
    const chain = prompt.pipe(llm);
    const response = await chain.invoke({
      context: contextText,
      question: userQuery,
    });

    // Safely extract answer string
    let extractedAnswer = "";
    if (typeof response.content === "string") {
      extractedAnswer = response.content;
    } else if (Array.isArray(response.content)) {
      extractedAnswer = response.content
        .map((part) => (typeof part === "string" ? part : part.text || ""))
        .join("");
    }

    const finalAnswer =
      extractedAnswer.trim() ||
      "Hey! How can I help you with your documents today? 😊";

    // 5. Send JSON with 'answer' key expected by Frontend
    return res.json({
      query: userQuery,
      answer: finalAnswer,
      sources: sources,
    });
  } catch (error) {
    console.error("Error generating RAG response:", error);
    return res.status(500).json({ error: "Failed to generate answer" });
  }
});

app.listen(8000, () => {
  console.log("Express API server started on http://localhost:8000");
});