// lib/agents.ts
// NOTE: I am providing the full, complete code for this file.

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs/promises';
import path from 'path';

// Groq REST API Helper Function (Unchanged)
async function callGroqApi(
  messages: { role: 'user' | 'system', content: string }[],
  model: string,
  response_format?: { type: 'json_object' }
): Promise<string> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");
  if (response_format?.type === 'json_object' && !messages.some(m => /json/i.test(m.content))) {
    throw new Error("Prompt must contain 'json' when using Groq's JSON mode.");
  }
  const body = { messages, model, ...(response_format && { response_format }) };
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Groq API request failed: ${await response.text()}`);
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// TrendFetcherAgent (Unchanged)
export class TrendFetcherAgent {
  private serperApiKey: string;
  private braveApiKey: string;
  constructor() {
    this.serperApiKey = process.env.SERPER_API_KEY!;
    this.braveApiKey = process.env.BRAVE_API_KEY!;
  }
  private async searchSerper(query: string): Promise<string[]> {
    const response = await fetch('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ q: query }), });
    const data = await response.json();
    return (data.organic || []).slice(0, 5).map((item: any) => item.snippet);
  }
  private async getBraveTrends(keyword: string): Promise<string[]> {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword + ' trends')}&count=5`, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': this.braveApiKey }, });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.web?.results || []).map((item: any) => item.title);
  }
  async run(idea: string): Promise<{ summary: string, rawData: { snippets: any[], trends: any[] } }> {
    // Fetch raw data
    const searchResults = await this.searchSerper(`What are people saying about ${idea}?`);
    const broadKeyword = idea.split(' ').pop()!;
    const trends = await this.getBraveTrends(broadKeyword);
    // [NEW] Fetch more structured data (e.g., top headlines, direct links, etc.)
    // For now, we use the snippet and title arrays, but you could expand this with more APIs.
    const rawData = {
      snippets: searchResults,
      trends: trends
    };
    // [NEW] Synthesis prompt with explicit instruction for citations and no invention
    const synthesisPrompt = `You're a viral content strategist. Analyze ONLY the research below to uncover the most emotionally charged, highly shareable, and curiosity-driven content angles. Identify the top 3 hooks or perspectives that are likely to spark engagement online, especially on short-form platforms.\n\nOriginal Idea: "${idea}"\n\nGoogle Search Snippets (quote or cite as needed):\n- ${searchResults.join("\n- ")}\n\nTrending Related Keywords from Brave Search (quote or cite as needed):\n- ${trends.join("\n- ")}\n\nExtract key themes, emotional triggers, and top keywords.\n\nIMPORTANT: Only use the information above. Do NOT invent facts. If you cite, use phrases like 'According to the search result...' or 'Trending keyword: ...'.\n\nSummarize for a content creator aiming to go viral, and include references to the original snippets or keywords where possible.`;
    const summary = await callGroqApi(
        [{ role: 'user', content: synthesisPrompt }],
        'llama-3.3-70b-versatile'
    );
    return { summary, rawData };
  }
}

// ContentCreatorAgent (MODIFIED)
export class ContentCreatorAgent {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  // [NEW] Method to automatically select the best theme
  async selectBestTheme(trendsSummary: string): Promise<string> {
    const themeSelectionPrompt = `From the trend analysis below, pick the single most **viral-worthy**, emotionally resonant theme or angle for a short-form social media post. Focus on what would stop someone from scrolling. Return only that **short, actionable theme** — no explanations, formatting, or quotes.

Trend Analysis:
---
${trendsSummary}
---

The single best viral theme is:`;
    const bestTheme = await callGroqApi(
        [{ role: 'user', content: themeSelectionPrompt }],
        'llama-3.3-70b-versatile'
    );
    return bestTheme.trim();
  }

  private getPromptForPlatform(platform: string, idea: string, trendsSummary: string, style: string = 'default'): string {
    // Twitter/X prompt styles
    const twitterPrompts: { [key: string]: string } = {
      informative: `You are an AI writing expert creating an **informative tweet** based on the trend summary below. Your job is to pack **maximum insight into 280 characters**. Use stats, definitions, or a breakdown. Avoid fluff or questions. Just provide clear value.\n\nIdea: ${idea}\nTrend Summary: ${trendsSummary}\n\nWrite an informative post:`,
      'short-hook': `You are crafting a **scroll-stopping, emotionally charged tweet**. Use a bold statement, challenge, or hot take — under 180 characters. It must evoke emotion or FOMO.\n\nIdea: ${idea}\nTrend Summary: ${trendsSummary}\n\nWrite a punchy hook tweet:`,
      educational: `You’re an expert educator on Twitter. Based on this trend, write a short educational post that teaches something useful in **2-3 sentences**. Clarity > complexity.\n\nIdea: ${idea}\nTrend Summary: ${trendsSummary}\n\nWrite a short educational post:`,
      controversial: `You’re writing a controversial or thought-provoking tweet that challenges mainstream opinions. Be respectful but assertive. Add 1–2 relevant hashtags.\n\nIdea: ${idea}\nTrend Summary: ${trendsSummary}\n\nWrite a bold, debate-worthy tweet:`,
      thread: `You’re crafting the first tweet of a **highly engaging thread**. It should make people want to click 'Show More'. Use a curiosity hook + brief value preview.\n\nIdea: ${idea}\nTrend Summary: ${trendsSummary}\n\nWrite the first tweet of a thread:`,
      longform: `You are a knowledgeable and engaging AI writer.\n\nYour task is to create a long-form social media post (or Twitter thread) based on the following idea and trend analysis. The post should:\n- Begin with a strong hook that grabs attention\n- Provide deep insights, real examples, or step-by-step ideas\n- Be written in a clear, conversational tone\n- End with a takeaway, prediction, or a call to action\n\nDo **not** exceed the platform's character limits per post, but feel free to break it into **thread format** if needed (for Twitter). Make it **feel valuable** — like something worth saving or sharing.\n\nOriginal Idea: "${idea}"\nTrend Summary: "${trendsSummary}"\n\nNow write a detailed, insightful post:`,
      default: `You are a sharp, witty social media copywriter for Twitter.\nOriginal Idea: "${idea}"\nTrend Analysis Summary: "${trendsSummary}"\nWrite a compelling and concise Twitter post (under 280 characters). Use an engaging hook and include 2-3 relevant hashtags.`
    };
    // Add more platforms as needed
    if (platform === 'twitter' || platform === 'x') {
      return twitterPrompts[style] || twitterPrompts['default'];
    }
    // LinkedIn (can add styles similarly)
    if (platform === 'linkedin') {
      return `You are a professional thought leader writing for LinkedIn.\nOriginal Idea: "${idea}"\nTrend Analysis Summary: "${trendsSummary}"\nWrite a professional, insightful LinkedIn post. Start with a strong hook, use 3-4 paragraphs to elaborate on the idea, and end with a question to encourage discussion. Use 3-4 professional hashtags.`;
    }
    // Default fallback
    return twitterPrompts['default'];
  }

  async run(idea: string, trendsSummary: string, platform: string, style: string = 'default'): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = this.getPromptForPlatform(platform, idea, trendsSummary, style);
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // [IMPROVED] For longform, show as a single, well-formatted tweet (not a thread)
    if (style === 'longform') {
      // Remove thread markers and join all parts into a single tweet
      text = text.replace(/\*\*\(Tweet \d+\/\d+\)\*\*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      // Optionally, truncate to 500 characters for a long tweet (Twitter X limit is 280, but for other platforms you may want longer)
      if (text.length > 500) text = text.slice(0, 497) + '...';
    }
    return text;
  }
}

// ImageGeneratorAgent (Unchanged)
export class ImageGeneratorAgent {
  private async createImagePrompt(content: string): Promise<string> {
    const promptCreationTask = `You're a creative director designing visuals for high-performing social media content.

Given this post:
"${content}"

Describe a single, clear visual scene that would **visually stop someone from scrolling**. Focus on **style, emotion, and clarity**. Use a format like:

"[Scene Description], [Style Type], [Mood or Lighting]"

Examples:
- "young entrepreneur walking alone on rainy street, cinematic lighting, dark blue tones"
- "vector flat illustration of a rocket launch, clean lines, optimistic colors"

Now, generate a visually engaging image prompt:`;
    const imagePrompt = await callGroqApi([{ role: 'user', content: promptCreationTask }], 'llama-3.3-70b-versatile');
    return imagePrompt.trim() || 'abstract art';
  }
  async run(content: string, imagePromptMode: 'auto' | 'manual', customImagePrompt: string | null, outputPath: string): Promise<string | null> {
    const imagePrompt = imagePromptMode === 'manual' && customImagePrompt ? customImagePrompt : await this.createImagePrompt(content);
    const promptEncoded = encodeURIComponent(imagePrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=1024&height=1024&enhance=true&nologo=true&model=flux`;
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    return outputPath;
  }
}

// TwitterPosterAgent (Unchanged)
export class TwitterPosterAgent {
  private client: TwitterApi;
  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!, appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!, accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    });
  }
  async run(content: string, imagePath: string): Promise<string> {
    const mediaId = await this.client.v1.uploadMedia(imagePath);
    const { data: tweet } = await this.client.v2.tweet(content, { media: { media_ids: [mediaId] } });
    return `https://twitter.com/user/status/${tweet.id}`;
  }
}