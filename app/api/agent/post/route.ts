// app/api/agent/post/route.ts
import { NextResponse } from 'next/server';
import { TwitterPosterAgent } from '@/lib/agents';
import { getWorkflow, deleteWorkflow } from '@/lib/workflow-store';

export async function POST(req: Request) {
  try {
    const { workflowId } = await req.json();
    
    // Add 'await' here
    const workflow = await getWorkflow(workflowId);
    if (!workflow || !workflow.finalContent || !workflow.imagePath) {
      return NextResponse.json({ error: 'Workflow incomplete or not found.' }, { status: 404 });
    }

    const poster = new TwitterPosterAgent();
    const tweetUrl = await poster.run(workflow.finalContent, workflow.imagePath);

    // Add 'await' here to clean up the completed workflow file
    await deleteWorkflow(workflowId);

    return NextResponse.json({ tweetUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}