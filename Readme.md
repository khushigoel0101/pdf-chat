# Document RAG Assistant

A production-ready, asynchronous Retrieval-Augmented Generation (RAG) backend. This system ingests PDF documents, processes them in the background using a message queue, generates local vector embeddings, and provides a conversational interface powered by Google Gemini to query the document context.

## 🏗 Architecture

The application is split into two primary phases:
1. **Ingestion Phase (Asynchronous):** File uploads are offloaded to a BullMQ worker backed by Valkey (Redis). The worker parses the PDF, chunks the text (size 300, overlap 50), generates local HuggingFace embeddings (`Xenova/all-MiniLM-L6-v2`), and upserts them into a Qdrant Cloud vector database.
2. **Retrieval Phase (Synchronous):** User queries are embedded and compared against the Qdrant database using cosine similarity. The top 3 matching document chunks are injected into a strict system prompt and sent to Google Gemini Flash for grounded answers.

## 🚀 Tech Stack

* **Core:** Node.js, Express.js
* **AI Framework:** LangChain.js
* **LLM:** Google Gemini 1.5 Flash
* **Embeddings:** HuggingFace (`Xenova/all-MiniLM-L6-v2` running locally)
* **Vector Database:** Qdrant Cloud
* **Message Queue:** BullMQ, Valkey (Redis fork)
* **Document Processing:** Multer, `pdf-parse`, `RecursiveCharacterTextSplitter`
