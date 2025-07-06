// app/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Bot, Image as ImageIcon, Twitter, Send, RefreshCw, ThumbsUp, Edit, XCircle } from 'lucide-react';

// --- Types ---
type WorkflowStage = 'idle' | 'fetchingTrends' | 'awaitingTheme' | 'creating' | 'awaitingConfirmation' | 'revising' | 'posting' | 'done' | 'error';
// [BUG FIX] Changed `content` to `finalContent` to match the API response
type Result = { finalContent: string; imageUrl: string; tweetUrl?: string; };

// --- Main Component ---
export default function GeneratorPage() {
  // State Management
  const [stage, setStage] = useState<WorkflowStage>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Workflow Config
  const [idea, setIdea] = useState('');
  const [themeMode, setThemeMode] = useState<'auto' | 'manual'>('auto');
  const [imagePromptMode, setImagePromptMode] = useState<'auto' | 'manual'>('auto');
  const [postingMode, setPostingMode] = useState<'auto' | 'manual'>('manual');

  // Workflow Data
  const [workflowId, setWorkflowId] = useState<string>('');
  const [trendsSummary, setTrendsSummary] = useState('');
  // [NEW] State for handling multiple selected themes as an array
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  
  // Revision State
  const [textFeedback, setTextFeedback] = useState('');
  const [imageFeedback, setImageFeedback] = useState('');

  // --- Post Style Selection ---
  const [postStyle, setPostStyle] = useState<string>('default');
  const postStyleOptions = [
    { value: 'default', label: 'Default' },
    { value: 'informative', label: 'Informative' },
    { value: 'short-hook', label: 'Punchy Hook' },
    { value: 'educational', label: 'Educational' },
    { value: 'controversial', label: 'Controversial' },
    { value: 'thread', label: 'Thread Opener' },
    { value: 'longform', label: 'Long Form / Thread' }, // <-- Add this line
  ];

  // [NEW] State for rawData and user selection
  const [rawData, setRawData] = useState<{ snippets: string[]; trends: string[] }>({ snippets: [], trends: [] });
  const [selectedSnippets, setSelectedSnippets] = useState<string[]>([]);
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);

  // --- API Handlers ---
  const addLog = (log: string) => setLogs(prev => [...prev, log]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage('fetchingTrends');
    addLog('Starting workflow...');
    try {
      const res = await fetch('/api/agent/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWorkflowId(data.workflowId);
      setTrendsSummary(data.trendsSummary);
      // [NEW] Store rawData for user selection
      setRawData(data.rawData || { snippets: [], trends: [] });
      // [NEW] Pre-select all snippets and trends by default
      setSelectedSnippets(data.rawData?.snippets || []);
      setSelectedTrends(data.rawData?.trends || []);
      setStage('awaitingTheme');
      addLog('Trend analysis complete. Please provide a theme or use auto-selection.');
    } catch (err) { setError((err as Error).message); setStage('error'); }
  };

  const handleCreateContent = async () => {
    setStage('creating');
    addLog(`Creating content... Theme mode: ${themeMode}, Image mode: ${imagePromptMode}, Post style: ${postStyle}`);
    try {
      // [MODIFIED] Join the array of selected themes into a single string for the API
      const manualTheme = selectedThemes.join(', ');
      const res = await fetch('/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, themeMode, manualTheme, imagePromptMode, customImagePrompt, postStyle, selectedSnippets, selectedTrends })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      addLog(`Agent used theme: "${data.usedTheme}"`);
      setResult(data);
      if (postingMode === 'auto') {
        handlePost(true);
      } else {
        setStage('awaitingConfirmation');
        addLog('Content and image created. Please review for posting.');
      }
    } catch (err) { setError((err as Error).message); setStage('error'); }
  };
  
  const handleRevise = async () => {
    setStage('revising');
    addLog(`Revising content based on feedback...`);
    try {
        const res = await fetch('/api/agent/revise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId, textFeedback, imageFeedback }) });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResult(data);
        setTextFeedback('');
        setImageFeedback('');
        setStage('awaitingConfirmation');
        addLog('Revision complete. Please review again.');
    } catch (err) { setError((err as Error).message); setStage('error'); }
  };

  const handlePost = async (isAuto: boolean = false) => {
    if (!isAuto) {
      setTextFeedback('');
      setImageFeedback('');
    }
    setStage('posting');
    addLog('Posting to Twitter...');
    try {
      const res = await fetch('/api/agent/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(prev => prev ? { ...prev, tweetUrl: data.tweetUrl } : null);
      setStage('done');
      addLog(`Successfully posted! URL: ${data.tweetUrl}`);
    } catch (err) { setError((err as Error).message); setStage('error'); }
  };
  
  const resetWorkflow = () => {
    setStage('idle');
    setIdea('');
    setLogs([]);
    setError(null);
    setWorkflowId('');
    setTrendsSummary('');
    setSelectedThemes([]);
    setCustomImagePrompt('');
    setResult(null);
  };

  // [NEW] Memoized parsed themes to avoid re-calculating on every render
  const parsedThemes = useMemo(() => {
    return trendsSummary
      .split('\n')
      .map(line => line.replace(/^- /g, '').trim()) // Clean up lines
      .filter(line => line.length > 0); // Remove empty lines
  }, [trendsSummary]);

  // [NEW] Handler for checkbox changes
  const handleThemeSelectionChange = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) 
        ? prev.filter(t => t !== theme) // Uncheck: remove from array
        : [...prev, theme] // Check: add to array
    );
  };

  // [NEW] Handler for snippet/trend selection
  const handleSnippetSelection = (snippet: string) => {
    setSelectedSnippets(prev => prev.includes(snippet) ? prev.filter(s => s !== snippet) : [...prev, snippet]);
  };
  const handleTrendSelection = (trend: string) => {
    setSelectedTrends(prev => prev.includes(trend) ? prev.filter(t => t !== trend) : [...prev, trend]);
  };

  // --- Render Functions for Stages ---
  const renderIdleForm = () => (
    <form onSubmit={handleStart} className="space-y-6">
      <div>
        <label htmlFor="idea" className="block text-sm font-medium text-gray-300 mb-1">Your Core Idea</label>
        <textarea id="idea" rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3" placeholder="e.g., The benefits of a 4-day work week" value={idea} onChange={(e) => setIdea(e.target.value)} required />
      </div>
      <div className="space-y-4">
        <div className="p-4 border border-gray-600 rounded-lg">
          <h4 className="font-semibold mb-2">Configuration</h4>
          <div className="space-y-3 text-sm">
            <p>Theme Selection: <label className="ml-2"><input type="radio" name="themeMode" value="auto" checked={themeMode === 'auto'} onChange={e => setThemeMode(e.target.value as any)} /> Auto</label> <label className="ml-2"><input type="radio" name="themeMode" value="manual" checked={themeMode === 'manual'} onChange={e => setThemeMode(e.target.value as any)} /> Manual</label></p>
            <p>Image Prompt: <label className="ml-2"><input type="radio" name="imageMode" value="auto" checked={imagePromptMode === 'auto'} onChange={e => setImagePromptMode(e.target.value as any)} /> Auto</label> <label className="ml-2"><input type="radio" name="imageMode" value="manual" checked={imagePromptMode === 'manual'} onChange={e => setImagePromptMode(e.target.value as any)} /> Manual</label></p>
            <p>Final Action: <label className="ml-2"><input type="radio" name="postingMode" value="manual" checked={postingMode === 'manual'} onChange={e => setPostingMode(e.target.value as any)} /> Request Approval</label> <label className="ml-2"><input type="radio" name="postingMode" value="auto" checked={postingMode === 'auto'} onChange={e => setPostingMode(e.target.value as any)} /> Post Automatically</label></p>
          </div>
        </div>
      </div>
      <button type="submit" disabled={stage !== 'idle'} className="w-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 font-bold py-3 rounded-md disabled:opacity-50">
        <Sparkles className="mr-2" /> Start Analysis
      </button>
    </form>
  );

  const renderThemeSelection = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Select a Theme</h3>
      {themeMode === 'manual' ? (
        <div className="space-y-2 p-3 bg-gray-900 rounded-md border border-gray-600">
          <p className="text-sm text-gray-400 mb-2">Select one or more themes from the trend analysis:</p>
          {parsedThemes.map(theme => (
            <label key={theme} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedThemes.includes(theme)}
                onChange={() => handleThemeSelectionChange(theme)}
                className="form-checkbox h-4 w-4 text-blue-500 bg-gray-800 border-gray-600"
              />
              <span className="text-sm">{theme}</span>
            </label>
          ))}
          {/* [NEW] In renderThemeSelection, show snippet/trend selection */}
          <div className="space-y-2 p-3 bg-gray-900 rounded-md border border-gray-600">
            <p className="text-sm text-gray-400 mb-2">Select which Google Search Snippets to use:</p>
            {rawData.snippets.map(snippet => (
              <label key={snippet} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={selectedSnippets.includes(snippet)} onChange={() => handleSnippetSelection(snippet)} className="form-checkbox h-4 w-4 text-blue-500 bg-gray-800 border-gray-600" />
                <span className="text-xs">{snippet}</span>
              </label>
            ))}
            <p className="text-sm text-gray-400 mt-2 mb-2">Select which Trending Keywords to use:</p>
            {rawData.trends.map(trend => (
              <label key={trend} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={selectedTrends.includes(trend)} onChange={() => handleTrendSelection(trend)} className="form-checkbox h-4 w-4 text-blue-500 bg-gray-800 border-gray-600" />
                <span className="text-xs">{trend}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-green-400 p-3 bg-green-900/50 rounded-md">Using auto-selection. The best theme will be picked by the AI.</p>
      )}
      {/* Post Style Selector */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Post Style</label>
        <select value={postStyle} onChange={e => setPostStyle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2">
          {postStyleOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {imagePromptMode === 'manual' && (
        <input type="text" placeholder="Enter custom image prompt..." value={customImagePrompt} onChange={e => setCustomImagePrompt(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md" />
      )}
      <button 
        onClick={handleCreateContent} 
        disabled={themeMode === 'manual' && selectedThemes.length === 0}
        className="w-full flex items-center justify-center bg-blue-600 font-bold py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="mr-2" /> Create Content
      </button>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
        <h3 className="font-bold text-lg text-center">Final Review & Approval</h3>
        {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Generated Text</h4>
                    {/* [BUG FIX] Changed result.content to result.finalContent */}
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.finalContent}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Generated Image</h4>
                    <img src={result.imageUrl} alt="Generated by AI" className="rounded-md w-full" />
                </div>
            </div>
        )}
        <div className="space-y-4">
             <h4 className="font-semibold">Request Modifications (Optional)</h4>
             <input type="text" placeholder="Enter feedback for TEXT..." value={textFeedback} onChange={e => setTextFeedback(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md" />
             <input type="text" placeholder="Enter feedback for IMAGE..." value={imageFeedback} onChange={e => setImageFeedback(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md" />
             <button onClick={handleRevise} disabled={!textFeedback && !imageFeedback} className="w-full flex items-center justify-center bg-yellow-600 text-white font-bold py-2 rounded-md disabled:opacity-50"><Edit className="mr-2" /> Revise</button>
        </div>
        <div className="flex gap-4">
            <button onClick={() => handlePost()} className="w-full flex items-center justify-center bg-green-600 font-bold py-3 rounded-md"><ThumbsUp className="mr-2" /> Approve & Post</button>
            <button onClick={resetWorkflow} className="w-full flex items-center justify-center bg-red-600 font-bold py-3 rounded-md"><XCircle className="mr-2" /> Stop</button>
        </div>
    </div>
  );

  const renderFinalResult = () => (
    <div className="text-center space-y-4">
        <h3 className="font-bold text-lg text-green-400">Workflow Complete!</h3>
        {result?.tweetUrl && <a href={result.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline block">View your Tweet</a>}
        <button onClick={resetWorkflow} className="w-full bg-gray-600 py-2 rounded-md">Start New Workflow</button>
    </div>
  );

  const renderLoading = (text: string) => <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin mr-3" /> {text}...</div>;

  // --- Main Render ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Workflow */}
      <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-xl self-start">
        <h2 className="text-2xl font-bold mb-4">Content Generator</h2>
        {stage === 'idle' && renderIdleForm()}
        {stage === 'fetchingTrends' && renderLoading('Analyzing Trends')}
        {stage === 'awaitingTheme' && renderThemeSelection()}
        {stage === 'creating' && renderLoading('Creating Content & Image')}
        {stage === 'awaitingConfirmation' && renderConfirmation()}
        {stage === 'revising' && renderLoading('Revising')}
        {stage === 'posting' && renderLoading('Posting to Twitter')}
        {stage === 'done' && renderFinalResult()}
        {stage === 'error' && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error} <button onClick={resetWorkflow} className="font-bold underline mt-2">Try Again</button></div>}
      </div>
      {/* Right Column: Logs */}
      <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg shadow-xl self-start">
        {(logs.length > 0) && (
            <div>
                <h3 className="font-semibold text-lg mb-2">Logs</h3>
                <div className="bg-black p-3 rounded-md h-96 overflow-y-auto font-mono text-xs space-y-1">
                    {logs.map((log, i) => <p key={i}>- {log}</p>)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}