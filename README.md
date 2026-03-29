# Magi Content Editor 🪄

An AI-native, multi-format content editor built for the MAGI Engineering Intern Assignment. 

This project solves the "loading spinner" problem of AI content generation by utilizing progressive HTML streaming, parallel image generation, and dynamic TipTap rendering to create a fluid, real-time WYSIWYG experience.

## ✨ Features

* **Progressive Streaming:** Content appears instantly as the AI writes. Bypasses the traditional "wait for massive JSON" bottleneck.
* **Format-Aware Canvas:** The editor dynamically adjusts its UI, AI instructions, and export dimensions based on the chosen format (Presentation Document, Social Media Carousel, Cinematic Landing Page).
* **Multi-Modal Generation:** As the AI streams text, it can inject image placeholders with embedded DALL-E prompts. The editor detects these and generates high-res artwork concurrently without blocking the text stream.
* **Context-Aware AI Editing:** Highlight any text on the canvas and ask the AI to rewrite, shorten, or format it inline.
* **Export Engine:** Serverless PDF and high-res PNG exporting via Puppeteer, respecting the specific dimensions of each content type.
* **Auto-Save:** Real-time persistence to Supabase.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 15 (App Router), React 19
* **Editor:** TipTap (ProseMirror) with custom Nodes (Cards, Columns, Images)
* **AI & LLMs:** OpenAI (`gpt-4o` for logic/text, `gpt-image-1-mini` for images), Vercel AI SDK
* **Database & Storage:** Supabase (PostgreSQL for documents, Buckets for images)
* **Styling:** Tailwind CSS, `@tailwindcss/typography`
* **Exporting:** Puppeteer Core & Sparticuz Chromium

---

## 🚀 Getting Started (Local Setup)

Follow these steps to run the editor locally.

### 1. Prerequisites
Ensure you are on a **Windows OS** machine and have **Node.js 18+** as well as **JDK 19.0.2** installed. You will also need accounts for [OpenAI](https://platform.openai.com/) and [Supabase](https://supabase.com/) to get the required API keys.

### 2. Clone and Install
Open your command prompt and run:
```cmd
git clone <your-repo-url>
cd magi-editor
npm install
```

### 3. Add Environment Variables
Create a file named `.env.local` in the root of the project folder and add your API keys:
```env
# .env.local

# OpenAI - Used for text streaming and DALL-E image generation
OPENAI_API_KEY=your_openai_api_key_here

# Supabase - Used for document auto-saving and image uploads
# Ensure you have a 'documents' table and an 'images' storage bucket created.
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server
```cmd
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the format selection screen.

---

# 🏗️ Architecture & Systems Thinking

This system is built with a heavy emphasis on **Systems Thinking** and the **Separation of Concerns**. The goal was to create a codebase that is modular, readable, and highly extensible, ensuring that the AI orchestration doesn't become tightly coupled with the UI rendering.

---

## 🏛️ Layered Abstractions
To prevent the "monolith component" trap, the system is broken down into three distinct layers:

* **The Editor Engine:** Custom TipTap extensions and Node Views dedicated solely to rendering the canvas state.
* **The Orchestration Layer:** Custom library cores that act as the "brain," bridging the UI with backend services.
* **The API & Export Layer:** Serverless Next.js route handlers (`/api/generate`, `/api/export-pdf`, `/api/export-png`, `/api/upload`, `/api/generate-image`, `/api/edit`, `/api/documents`, ) decoupled from the frontend to handle secure LLM orchestration and heavy compute operations.

---

## 🛠️ Key Technical Decisions

### 1. HTML Streaming over JSON
Streaming massive, nested JSON objects to a rich-text editor is inherently brittle. A single missing bracket breaks `JSON.parse()`, requiring complex AST-reconciliation.
* **The Solution:** The AI outputs pure HTML wrapped in `<DOC>` tags. 
* **The Result:** Since TipTap’s underlying **ProseMirror** engine is incredibly resilient at parsing partial HTML, we can inject raw sanitized strings directly as they stream. This allows for zero-latency, progressive rendering of complex layouts (like 2-column grids) without the risk of a crash.

### 2. The "Universal Image Scanner" (Parallelism)
Standard sequential generation (Text → Image → Display) creates significant bottlenecks.
* **The Solution:** The LLM is instructed to output an `<img>` tag with a descriptive DALL-E prompt in the `alt` attribute and a `title="pending-generation"` flag. 
* **The Result:** A React `useEffect` scans the DOM in real-time. When a "pending" image is detected, it replaces it with a loading placeholder and fires a non-blocking API call. The text continues streaming effortlessly while images generate in the background.

### 3. The Content Registry Pattern (Scalability)
To ensure the architecture scales to "5 more content types" without a refactor, I implemented a **Centralized Content Registry** (`lib/core/content-types.ts`).
* **The Benefit:** Adding a new format requires **zero UI code changes**. You simply define a new object with its TipTap constraints, system prompt, and allowed exports. The UI and AI logic adapt dynamically based on this configuration.

### 4. Serverless Export Compatibility
Standard Puppeteer bundles a Chromium binary exceeding Vercel's 50MB limit. 
* **The Solution:** Utilized `puppeteer-core` paired with `@sparticuz/chromium-min`.
* **The Result:** Binaries are fetched dynamically at runtime, ensuring the heavy export engine deploys flawlessly in a serverless environment without hitting deployment size caps.

---

## 🔮 Future Roadmap & Improvements

While the current architecture is robust, I would prioritize the following for a production-scale rollout:

* **Granular Canvas Controls:** Implement native drag-and-drop handles for image and column resizing directly within TipTap node views for better manual UX.
* **Industrial-Grade Exporting:** Transition from serverless Puppeteer to an asynchronous job queue (e.g., Celery/Redis) with a dedicated headless browser microservice to avoid serverless memory/timeout limits.
* **Flexible Framing:** Add UI toggles for aspect ratios (4:5, 16:9) rather than the current 1:1 lock for social media carousels.
* **AI Output Validation:** Implement a lightweight streaming parser to sanitize chunks before they hit the editor to further prevent LLM hallucinations.
* **Real-time Collaboration:** Introduce **Yjs** with WebSockets to enable true "multiplayer" editing on the canvas.

---