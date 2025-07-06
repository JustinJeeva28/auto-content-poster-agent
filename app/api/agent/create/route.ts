// app/api/agent/create/route.ts
import { NextResponse } from 'next/server';
import { ContentCreatorAgent, ImageGeneratorAgent } from '@/lib/agents';
import { getWorkflow, updateWorkflow } from '@/lib/workflow-store';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { 
        workflowId, 
        themeMode, 
        manualTheme, 
        imagePromptMode, 
        customImagePrompt, 
        postStyle, // <-- receive postStyle from frontend
        selectedSnippets = [],
        selectedTrends = []
    } = await req.json();

    // Add 'await' here
    const workflow = await getWorkflow(workflowId);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found or has expired.' }, { status: 404 });

    const contentCreator = new ContentCreatorAgent();

    // [NEW] Compose a trendsSummary using only selected snippets/trends if provided
    let trendsSummaryToUse = workflow.trendsSummary;
    if (selectedSnippets.length > 0 || selectedTrends.length > 0) {
      trendsSummaryToUse = `Google Search Snippets:\n- ${selectedSnippets.join("\n- ")}\n\nTrending Related Keywords from Brave Search:\n- ${selectedTrends.join("\n- ")}`;
    }

    let themeToUse: string;
    if (themeMode === 'auto') {
      themeToUse = await contentCreator.selectBestTheme(trendsSummaryToUse);
    } else {
      themeToUse = manualTheme;
    }
    if (!themeToUse) {
        return NextResponse.json({ error: "Could not determine a theme to proceed." }, { status: 400 });
    }

    // Pass postStyle to contentCreator.run, use trendsSummaryToUse
    const finalContent = await contentCreator.run(themeToUse, trendsSummaryToUse, 'twitter', postStyle || 'default');
    
    const imageGenerator = new ImageGeneratorAgent();
    const publicDir = path.join(process.cwd(), 'public');
    const imageFilename = `generated_image_${Date.now()}.png`;
    const imagePath = path.join(publicDir, imageFilename);
    const imageUrl = `/${imageFilename}`;

    await imageGenerator.run(finalContent, imagePromptMode, customImagePrompt, imagePath);

    // Add 'await' here
    await updateWorkflow(workflowId, { finalContent, imagePath, imageUrl });

    return NextResponse.json({ finalContent, imageUrl, usedTheme: themeToUse });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}