import { useRef, useEffect } from 'react';
import { TeamDisplay } from './TeamDisplay';

interface ChatInterfaceProps {
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>;
  loading: boolean;
  userPrompt: string;
  onPromptSubmit: (e: React.FormEvent) => void;
  onPromptChange: (value: string) => void;
}

export const ChatInterface = ({
  chatHistory,
  loading,
  userPrompt,
  onPromptSubmit,
  onPromptChange,
}: ChatInterfaceProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-lg text-notWhite font-semibold mb-3">Extracting your team:</h3>
      
      <div className="bg-white/5 rounded-lg p-3">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`mb-3 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              {message.role === 'assistant' && message.content.includes('Starting XI:') ? (
                <TeamDisplay content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-center py-3">
            <p className="text-base">Processing...</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={onPromptSubmit} className="flex gap-2">
        <input
          type="text"
          value={userPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Ask a follow-up question or refine the extraction..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={loading || !userPrompt.trim()}
          className="px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}; 