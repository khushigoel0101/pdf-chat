import "dotenv/config";
import { Worker } from "bullmq";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import fs from "fs";

const qdrantUrl = process.env.QDRANT_URL ?? process.env.QUAD_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY ?? process.env.QUAD_API_KEY;

if (!qdrantUrl || !qdrantApiKey) {
  console.error(
    "Missing Qdrant credentials. Set QDRANT_URL and QDRANT_API_KEY in .env"
  );
}

const embeddings = new HuggingFaceTransformersEmbeddings({
  model: "Xenova/all-MiniLM-L6-v2",
});

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    const { filename, path } = job.data;

    if (job.name === "file-ready") {
      console.log(`Processing file: ${filename}`);
    }

    try {
      // 1. Parse PDF pages
      const loader = new PDFLoader(path);
      const docs = await loader.load();
      console.log(`Successfully parsed ${docs.length} pages for ${filename}.`);

      // 2. Chunk documents
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 300,
        chunkOverlap: 50,
      });
      const splitDocs = await splitter.splitDocuments(docs);
      console.log(`Successfully chunked ${filename} into ${splitDocs.length} pieces.`);

      // 3. Upsert to Qdrant Cloud
      console.log("Generating local embeddings and upserting into Qdrant Cloud...");

      if (!qdrantUrl || !qdrantApiKey) {
        throw new Error("Qdrant is not configured. Missing URL or API key.");
      }

      await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
        url: qdrantUrl,
        apiKey: qdrantApiKey,
        collectionName: "langchainjs-testing",
        checkCompatibility: false,
      });

      console.log(`Successfully stored ${filename} in Qdrant!`);
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      throw error;
    } finally {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    }
  },
  {
    concurrency: 10,
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  }
);

console.log("Worker started and listening for jobs...");