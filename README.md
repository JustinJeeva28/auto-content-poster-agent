# Auto Content Poster Agent

A Next.js 14 application that automates content generation and posting to Twitter using AI-powered orchestration and prompt chaining.

## Features
- Automated content creation using AI (Google Gemini, Groq, HuggingFace, Brave, Serper)
- Twitter API integration for posting tweets
- Workflow management for content pipelines
- Modern UI with Tailwind CSS and Geist font

## AI with Chain of Prompts
This project uses a chain of specialized AI agents and external APIs to automate the entire content creation and publishing workflow:

- **TrendFetcherAgent**: Gathers trending topics and insights using Serper (Google Search API) and Brave Search API, then synthesizes a trend summary with Groq LLM.
- **ContentCreatorAgent**: Uses Google Gemini to generate engaging social media content based on the trend summary. Supports multiple post styles (informative, hook, educational, controversial, thread, longform).
- **ImageGeneratorAgent**: Crafts a creative visual prompt (using Groq LLM) and generates a unique image for each post using the [Pollinations AI](https://pollinations.ai/) API, ensuring every post is visually appealing and tailored to the content.
- **TwitterPosterAgent**: Publishes the generated content and image to Twitter using the Twitter API.

**External Tools & APIs Used:**
- **Groq LLM**: For trend synthesis and creative prompt generation.
- **Google Gemini**: For advanced content generation.
- **Serper API**: For Google Search data.
- **Brave Search API**: For trending keywords and topics.
- **Pollinations AI**: For AI-powered image generation.
- **Twitter API**: For posting content and images directly to Twitter.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/auto-content-poster-agent.git
   cd auto-content-poster-agent
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or yarn install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your API keys.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables
See `.env.example` for all required keys:
- `GROQ_API_KEY`, `SERPER_API_KEY`, `BRAVE_API_KEY`
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`

## Project Structure
- `app/` — Next.js app directory (API routes, pages, components)
- `lib/` — Agents and workflow logic
- `public/` — Static assets and generated images

## Directory Structure
```
next-env.d.ts
next.config.mjs
package.json
postcss.config.mjs
README.md
tailwind.config.ts
tsconfig.json
app/
  favicon.ico
  globals.css
  layout.tsx
  page.tsx
  api/
    agent/
      create/
        route.ts
      post/
        route.ts
      revise/
        route.ts
      start/
        route.ts
    tweets/
      route.ts
  components/
    Header.tsx
  dashboard/
    page.tsx
  fonts/
    GeistMonoVF.woff
    GeistVF.woff
lib/
  agents.ts
  workflow-store.ts
public/
  generated_image_*.png
```

## Scripts
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm start` — Start production server
- `npm run lint` — Lint code

## Demo Video
Watch locally:
[Watch the Chat Demo](public/automated-content-posting%20agent.mp4)


