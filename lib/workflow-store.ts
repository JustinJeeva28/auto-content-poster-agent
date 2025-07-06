// lib/workflow-store.ts
import fs from 'fs/promises';
import path from 'path';

// Define the shape of our workflow data
export interface WorkflowData {
  id: string;
  idea: string;
  trendsSummary: string;
  finalContent?: string;
  imagePath?: string; // Local path on the server
  imageUrl?: string;  // Public URL for the client
  rawData?: { snippets: any[]; trends: any[] }; // Add rawData for user selection
}

// Define the path for our temporary storage
const tmpDir = path.join(process.cwd(), '.tmp', 'workflows');

// Helper function to ensure the directory exists
const ensureDir = async () => {
  await fs.mkdir(tmpDir, { recursive: true });
};

// --- New File-Based Store Functions ---

export const createWorkflow = async (idea: string): Promise<string> => {
  await ensureDir();
  const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const workflowData: WorkflowData = { id, idea, trendsSummary: '' };
  const filePath = path.join(tmpDir, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2));
  return id;
};

export const getWorkflow = async (id: string): Promise<WorkflowData | undefined> => {
  await ensureDir();
  const filePath = path.join(tmpDir, `${id}.json`);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file doesn't exist, it's a valid case of not found.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    // For other errors, re-throw them.
    throw error;
  }
};

export const updateWorkflow = async (id: string, data: Partial<WorkflowData>): Promise<void> => {
  const existing = await getWorkflow(id);
  if (existing) {
    const updatedData = { ...existing, ...data };
    const filePath = path.join(tmpDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
  }
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  const filePath = path.join(tmpDir, `${id}.json`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // It's okay if the file is already gone.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error deleting workflow file ${id}:`, error);
    }
  }
};