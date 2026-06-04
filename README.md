# AI Compiler — AppCompiler

> Natural Language → Intermediate Representation → Architecture → Validated Schemas → Executable Runtime

A 7-stage AI compiler pipeline that transforms natural language app descriptions into complete application configurations, including UI schemas, API endpoints, database schemas, and generated runtime code.

## Features

- **7-Stage Pipeline**: NL → IR → Architecture → Schemas → Validation → Repair → Runtime
- **Automated Repair Engine**: Auto-fixes schema mismatches and inconsistencies
- **Pipeline Visualization**: Interactive flow diagram of the compiler pipeline
- **Evaluation Dashboard**: Benchmark 20 prompts (10 real + 10 edge cases)
- **Runtime Code Generation**: Generates FastAPI routes, SQL schemas, Dockerfiles, and HTML pages

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **AI**: Google Gemini API (free tier)
- **Storage**: Browser localStorage (no backend needed)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- A free Google Gemini API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Shashank696/AI-compiler.git
cd AI-compiler
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no credit card required.

4. Run the app:
```bash
npm run dev
```

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Add `VITE_GEMINI_API_KEY` as an environment variable
4. Deploy 🚀

## License

MIT
