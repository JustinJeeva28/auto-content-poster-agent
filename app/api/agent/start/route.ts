// app/api/agent/start/route.ts
import { NextResponse } from 'next/server';
import { TrendFetcherAgent } from '@/lib/agents';
import { createWorkflow, updateWorkflow } from '@/lib/workflow-store';

export async function POST(req: Request) {
  try {
    const { idea } = await req.json();
    if (!idea) return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
    
    // Add 'await' here
    const workflowId = await createWorkflow(idea);
    
    const trendFetcher = new TrendFetcherAgent();
    const { summary: trendsSummary, rawData } = await trendFetcher.run(idea);
    
    // Add 'await' here
    await updateWorkflow(workflowId, { trendsSummary, rawData });

    return NextResponse.json({ workflowId, trendsSummary, rawData });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}