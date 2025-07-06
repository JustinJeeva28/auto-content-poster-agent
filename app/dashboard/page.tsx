// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, MessageSquare, Repeat, RefreshCw } from 'lucide-react';

const COOLDOWN_SECONDS = 60;

type Tweet = { id: string; text: string; createdAt: string; metrics: { like_count: number; reply_count: number; retweet_count: number; }; imageUrl?: string; };

export default function DashboardPage() {
    const [tweets, setTweets] = useState<Tweet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    const fetchTweets = async () => {
        if (cooldown > 0) return;

        setIsLoading(true);
        setError(null);
        setCooldown(COOLDOWN_SECONDS);

        try {
            const res = await fetch('/api/tweets');
            const data = await res.json();
            if(res.ok) {
                setTweets(data);
            } else {
                throw new Error(data.error || "An unknown error occurred.");
            }
        } catch (err) {
            console.error("Failed to fetch tweets:", err);
            setError(`Could not load Twitter dashboard. Check API keys. Error: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTweets(); // Initial fetch
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Posted Tweets Dashboard</h2>
                <button 
                    onClick={fetchTweets} 
                    disabled={isLoading || cooldown > 0} 
                    className="bg-gray-700 p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <RefreshCw className={isLoading ? 'animate-spin' : ''} />
                    <span className="ml-2 text-sm">
                        {cooldown > 0 ? `Update in ${cooldown}s` : 'Update'}
                    </span>
                </button>
             </div>
             {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
             {isLoading && tweets.length === 0 ? <p>Loading tweets...</p> : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {tweets.length > 0 ? tweets.map(tweet => (
                        <div key={tweet.id} className="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row gap-4">
                            {tweet.imageUrl && <img src={tweet.imageUrl} alt="Tweet media" className="w-full md:w-28 h-auto md:h-28 object-cover rounded-md" />}
                            <div className="flex-1">
                                <p className="text-sm text-gray-300 mb-2">{tweet.text}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center"><ThumbsUp className="w-4 h-4 mr-1"/> {tweet.metrics.like_count}</span>
                                    <span className="flex items-center"><Repeat className="w-4 h-4 mr-1"/> {tweet.metrics.retweet_count}</span>
                                    <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-1"/> {tweet.metrics.reply_count}</span>
                                    <span className="ml-auto">{new Date(tweet.createdAt!).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    )) : <p>No tweets found or unable to load dashboard.</p>}
                </div>
             )}
        </div>
    );
}