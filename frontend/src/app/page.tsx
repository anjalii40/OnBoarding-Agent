'use client';

import { useState } from 'react';
import BackgroundGlow from '@/components/ui/BackgroundGlow';
import BrainNode from '@/components/3d/BrainNode';
import { Search, Terminal, Send } from 'lucide-react';

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);
  
  // A temporary button to let you see the 3D animation before we hook up the real API
  const toggleThinking = () => setIsThinking(!isThinking);

  return (
    <main className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      {/* 1. BACKGROUND (CSS Glow + Noise Texture) */}
      <BackgroundGlow />
      
      {/* 2. LEFT PANE: 3D Visualization */}
      <section className="relative w-1/2 h-full hidden lg:block">
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 pointer-events-none">
          <h1 className="text-5xl font-bold tracking-tighter mb-2">Codebase Agent</h1>
          <p className="text-gray-400 max-w-md text-lg">
            Paste a repository URL and watch the AI instantly vectorize your architecture.
          </p>
        </div>
        
        {/* The React Three Fiber Brain */}
        <BrainNode isThinking={isThinking} />
      </section>

      {/* 3. RIGHT PANE: The Interface (Glassmorphism HUD) */}
      <section className="relative z-30 w-full lg:w-1/2 h-full p-4 lg:p-8 flex flex-col">
        <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-2xl p-6 lg:p-8 flex flex-col shadow-2xl">
          
          {/* TOP: GitHub URL Input */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="https://github.com/username/repository"
              className="w-full bg-black/40 border border-white/[0.1] rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600 shadow-inner"
            />
          </div>

          {/* MIDDLE: Content Area (Overview/Chat Window) */}
          <div className="flex-1 overflow-y-auto mb-6 flex flex-col items-center justify-center text-center">
             <Terminal className="w-12 h-12 text-gray-700 mb-4" />
             <h2 className="text-xl text-gray-400 font-medium">Waiting for repository...</h2>
             <p className="text-sm text-gray-600 mt-2">Enter a GitHub URL above to begin.</p>
             
             {/* Temporary debug button to test the 3D spinning animation */}
             <button 
                onClick={toggleThinking}
                className="mt-8 px-6 py-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-600/20 hover:border-blue-500/60 transition-all duration-300"
             >
                Test 3D Animation
             </button>
          </div>

          {/* BOTTOM: Chat Input Box */}
          <div className="relative mt-auto">
            <input 
              type="text" 
              placeholder="Ask a question about the code..."
              className="w-full bg-black/40 border border-white/[0.1] rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-blue-500 transition-colors"
              disabled
            />
            <button disabled className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg text-white opacity-40 cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>
    </main>
  );
}
