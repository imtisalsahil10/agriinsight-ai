import React, { useState } from 'react';
import { Youtube, Search, Play, ArrowRight, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { generateResponse } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface VideoAnalysisProps {
  language: 'en-US' | 'hi-IN';
}

const VideoAnalysis: React.FC<VideoAnalysisProps> = ({ language }) => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isHindi = language === 'hi-IN';

  const handleAnalyze = async (videoUrl: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Construct the specific prompt for video analysis
      const prompt = `Analyze this YouTube video link: ${videoUrl}. Summarize the key farming techniques and advice mentioned in it.`;
      
      // Call the service directly
      // We pass an empty history array as this is a standalone request
      const response = await generateResponse(prompt, [], undefined, language);
      
      setResult(response.text);
    } catch (err) {
      console.error("Video analysis failed:", err);
      setError(isHindi 
        ? "वीडियो का विश्लेषण करने में विफल। कृपया लिंक की जांच करें और पुनः प्रयास करें।" 
        : "Failed to analyze video. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      handleAnalyze(url);
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl('');
    setError(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-900/30 p-8 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-full mb-4">
            <Youtube className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            {isHindi ? "वीडियो विश्लेषण" : "Video Analysis"}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            {isHindi 
              ? "किसी भी खेती से संबंधित YouTube वीडियो का लिंक पेस्ट करें, और मैं आपके लिए उसका सारांश और मुख्य जानकारी निकालूँगा।"
              : "Paste a link to any farming-related YouTube video, and I'll extract the key insights, techniques, and advice for you."}
          </p>
        </div>

        <div className="p-8">
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="block w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
            
            {!result && (
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-rose-200 dark:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    {isHindi ? "विश्लेषण कर रहा है..." : "Analyzing Video..."}
                  </>
                ) : (
                  <>
                    {isHindi ? "विश्लेषण करें" : "Analyze Video"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            )}
          </form>

          {/* Error State */}
          {error && (
            <div className="max-w-xl mx-auto mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-800 dark:to-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center text-rose-700 dark:text-rose-400 font-bold text-lg">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isHindi ? "विश्लेषण परिणाम" : "Analysis Summary"}
                  </div>
                  <button 
                    onClick={handleReset}
                    className="flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {isHindi ? "नया वीडियो" : "New Analysis"}
                  </button>
                </div>
                
                <div className="prose prose-rose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                  <MarkdownRenderer content={result} />
                </div>
              </div>
              
              <div className="mt-6 text-center">
                 <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center py-3 px-6 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all font-medium"
                  >
                    {isHindi ? "दूसरा वीडियो विश्लेषित करें" : "Analyze Another Video"}
                  </button>
              </div>
            </div>
          )}

          {/* Example Section (Only show if no result) */}
          {!result && !isLoading && (
            <div className="mt-12">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">
                {isHindi ? "इन उदाहरणों को आज़माएं" : "Try these examples"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => {
                    const exUrl = 'https://www.youtube.com/watch?v=example1';
                    setUrl(exUrl);
                    handleAnalyze(exUrl);
                  }}
                  className="cursor-pointer group relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                    <Play className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm font-medium">
                    Organic Farming Basics
                  </div>
                </div>
                <div 
                  onClick={() => {
                    const exUrl = 'https://www.youtube.com/watch?v=example2';
                    setUrl(exUrl);
                    handleAnalyze(exUrl);
                  }}
                  className="cursor-pointer group relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                    <Play className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-sm font-medium">
                    Modern Irrigation Systems
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysis;