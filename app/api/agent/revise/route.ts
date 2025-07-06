// app/api/agent/revise/route.ts
import { NextResponse } from 'next/server';
import { ContentCreatorAgent, ImageGeneratorAgent } from '@/lib/agents';
import { getWorkflow, updateWorkflow } from '@/lib/workflow-store';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { workflowId, textFeedback, imageFeedback } = await req.json();

    // Add 'await' here
    const workflow = await getWorkflow(workflowId);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found or has expired.' }, { status: 404 });

    let { finalContent, imagePath, imageUrl } = workflow;

    if (textFeedback && finalContent) {
      const contentCreator = new ContentCreatorAgent();
      const revisedIdea = `Original post:\n${finalContent}\n\nPlease revise it based on this feedback: ${textFeedback}`;
      finalContent = await contentCreator.run(revisedIdea, workflow.trendsSummary, 'twitter');
    }

    if (imageFeedback && finalContent) {
      const imageGenerator = new ImageGeneratorAgent();
      const publicDir = path.join(process.cwd(), 'public');
      const imageFilename = `generated_image_${Date.now()}.png`;
      imagePath = path.join(publicDir, imageFilename);
      imageUrl = `/${imageFilename}`;
      await imageGenerator.run(finalContent, 'manual', imageFeedback, imagePath);
    }
    
    // Add 'await' here
    await updateWorkflow(workflowId, { finalContent, imagePath, imageUrl });

    return NextResponse.json({ finalContent, imageUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}