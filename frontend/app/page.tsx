'use client';

import { useState, useRef, useEffect } from 'react';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import BrainNode from '@/components/3d/BrainNode';
import { Search, Terminal, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

// Custom Markdown stylings to perfectly match our premium dark theme
const MarkdownComponents: any = {
  h1: (props: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-blue-400" {...props} />,
  p: (props: any) => <p className="mb-4 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-white" {...props} />,
  table: (props: any) => <div className="overflow-x-auto mb-4 w-full"><table className="w-full text-left border-collapse" {...props} /></div>,
  th: (props: any) => <th className="border-b border-white/20 py-2 pr-4 font-semibold text-white whitespace-nowrap" {...props} />,
  td: (props: any) => <td className="border-b border-white/5 py-2 pr-4" {...props} />,
  hr: (props: any) => <hr className="border-white/10 my-6" {...props} />,
  a: (props: any) => <a className="text-blue-400 hover:underline" {...props} />,
  code: ({ className, ...props }: any) => {
    // react-markdown v9 doesn't pass 'inline' anymore. We check for a language class to detect code blocks.
    const isBlock = /language-(\w+)/.exec(className || '');
    return isBlock ? (
      <code className={`${className} text-blue-300 font-mono text-sm`} {...props} />
    ) : (
      <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[0.85em]" {...props} />
    );
  },
  pre: (props: any) => (
    <pre className="bg-black/50 p-4 rounded-xl overflow-x-auto border border-white/10 mb-4 mt-2 shadow-inner" {...props} />
  ),
};

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [overview, setOverview] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, overview]);

  const handleIngest = async () => {
    if (!repoUrl.trim()) return;
    setIsIngesting(true);
    setOverview(null);
    setChatHistory([]);

    try {
      const ingestRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      if (!ingestRes.ok) throw new Error('Ingestion failed');

      const overviewRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/overview`);
      const overviewData = await overviewRes.json();
      setOverview(overviewData.overview);
    } catch (error) {
      console.error(error);
      setOverview("Error: Could not ingest repository. Ensure the backend is running and the URL is public.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    setIsChatting(true);

    try {
      const chatRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await chatRes.json();
      setChatHistory(prev => [...prev, { role: 'agent', content: data.answer }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'agent', content: "Error communicating with the backend." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const isThinking = isIngesting || isChatting;

  return (
    <main className="flex h-screen w-full bg-black text-white overflow-hidden">
      <BackgroundGlow />
      
      <section className="relative w-1/2 h-full hidden lg:block">
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 pointer-events-none">
          <h1 className="text-5xl font-bold tracking-tighter mb-2 font-heading">Onboarding Agent</h1>
          <p className="text-gray-400 max-w-md text-lg">
            Paste a repository URL and watch the AI instantly vectorize your architecture.
          </p>
        </div>
        <BrainNode isThinking={isThinking} />
      </section>

      <section className="relative z-30 w-full lg:w-1/2 h-full p-4 lg:p-8 flex flex-col">
        <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-2xl p-6 lg:p-8 flex flex-col shadow-2xl overflow-hidden">
          
          <div className="relative mb-6 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
              disabled={isIngesting}
              placeholder="https://github.com/username/repository"
              className="w-full bg-black/40 border border-white/[0.1] rounded-xl py-4 pl-12 pr-24 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner font-mono text-sm"
            />
            <button 
              onClick={handleIngest}
              disabled={isIngesting || !repoUrl}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ingest'}
            </button>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-6 flex flex-col gap-6 pr-2">
            {!overview && !isIngesting && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <Terminal className="w-12 h-12 mb-4 opacity-50" />
                <h2 className="text-xl font-medium">Waiting for repository...</h2>
              </div>
            )}
            
            {isIngesting && (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Vectorizing architecture...</p>
              </div>
            )}

            {overview && (
              <div className="bg-blue-950/10 border border-blue-500/20 rounded-xl p-6 text-sm text-gray-300 leading-relaxed shadow-inner">
                <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-base">
                  <Terminal className="w-4 h-4" /> Architectural Overview
                </h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {overview}
                </ReactMarkdown>
              </div>
            )}

            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl p-5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/[0.05] border border-white/[0.1] text-gray-300 shadow-md'}`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 flex gap-1 shadow-md">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
          </div>

          <div className="relative mt-auto flex-shrink-0">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              disabled={!overview || isThinking}
              placeholder={overview ? "Ask a question about the code..." : "Ingest a repo to enable chat"}
              className="w-full bg-black/40 border border-white/[0.1] rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 shadow-inner"
            />
            <button 
              onClick={handleChat}
              disabled={!overview || isThinking || !chatInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>
    </main>
  );
}
