# AgriInsight AI

An AI assistant for farmers covering crop health, weather-aware planning, and market guidance.

## Features
- Disease detection from images with treatment guidance
- Soil analysis inputs with suitability and improvement tips
- Irrigation scheduling with multi-crop inputs
- Market prices with custom region and crop filters
- Weather overview with alerts
- Crop calendar generator (supports custom crops)
- Fertilizer guide by crop with safety and cost notes
- Multi-location dashboard support
- Yield prediction with configurable conditions
- Bilingual UI (English/Hindi) and chat/voice assistant via Gemini

## Run locally
Prerequisite: Node.js 18+

1) Install deps: `npm install`
2) Create `.env.local` with your Gemini key:
```
API_KEY=your_gemini_key_here
```
3) Start dev server: `npm run dev`

## Deploy to Vercel
1) Push this repo to GitHub/GitLab/Bitbucket.
2) In Vercel: New Project → Import the repo.
3) Framework: Vite. Build command: `npm run build`. Output: `dist`.
4) Set env var `API_KEY` in Vercel Project Settings (Production + Preview).
5) Deploy. Use Preview URLs to test; redeploy when env vars change.

