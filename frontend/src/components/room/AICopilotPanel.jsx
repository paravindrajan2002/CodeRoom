import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../services/api.js';
import useRoomStore from '../../store/roomStore.js';

const QUICK_ACTIONS = [
    { label: '🔍 Evaluate Code',      message: 'Evaluate the candidate\'s current code. Is it correct? What is the time and space complexity?' },
    { label: '⚡ Optimal Approach?',   message: 'Is this the optimal approach? Are there better solutions available?' },
    { label: '🐛 Find Bugs',          message: 'Find any bugs, edge cases, or issues in the current code.' },
    { label: '💡 Suggest a Hint',     message: 'Suggest a non-spoiler hint I can give the candidate to nudge them in the right direction.' },
    { label: '📊 Rate Code 1-10',     message: 'Rate the code quality from 1-10 considering correctness, readability, and efficiency.' },
    { label: '❓ Follow-up Question', message: 'Generate a good follow-up question based on the candidate\'s current solution.' },
    { label: '📝 Pre-fill Scorecard', message: 'Based on what you have seen, pre-fill a scorecard with scores for problem solving, code quality, and communication. Give an overall hire/no-hire recommendation.' },
];

const AICopilotPanel = () => {
    const { currentCode, language, question } = useRoomStore();

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your AI copilot. I can see the candidate's code and the current question in real time. Use the quick actions or ask me anything.",
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (messageText) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        const userMessage = { role: 'user', content: text };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Build history — skip greeting, skip current message
            const history = newMessages
                .slice(1)
                .slice(0, -1)
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                }));

            const response = await aiAPI.chat({
                question: question?.questionTitle || null,
                code: currentCode || '',
                language: language || 'JAVASCRIPT',
                message: text,
                history,
            });

            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: response.data.response }
            ]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: '❌ Failed to get AI response. Please try again.' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="cr-ai">

            {/* Header */}
            <div className="cr-ai-head">
                <span>🤖</span>
                <span className="cr-ai-head-title">AI Copilot</span>
                <span className="cr-ai-badge">Gemini</span>
            </div>

            {/* Quick actions */}
            <div className="cr-ai-actions">
                {QUICK_ACTIONS.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        disabled={isLoading}
                        className="cr-ai-action"
                    >
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div className="cr-ai-msgs">
                {messages.map((msg, i) => (
                    <div key={i} className={`cr-ai-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                        <div className={`cr-ai-msg ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                            <MarkdownText text={msg.content} />
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="cr-ai-row assistant">
                        <div className="cr-ai-typing">
                            <span style={{ animationDelay: '0ms' }} />
                            <span style={{ animationDelay: '150ms' }} />
                            <span style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="cr-ai-input-wrap">
                <div className="cr-ai-input-row">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI about the interview..."
                        rows={2}
                        disabled={isLoading}
                        className="cr-ai-textarea"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="cr-ai-send"
                    >
                        Send
                    </button>
                </div>
                <p className="cr-ai-hint">
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
};

// ─── Simple markdown renderer ─────────────────────────────────────────────────
const MarkdownText = ({ text }) => {
    if (!text) return null;

    const lines = text.split('\n');

    return (
        <div className="cr-ai-md">
            {lines.map((line, i) => {
                if (line.startsWith('```')) return null;

                if (line.startsWith('### '))
                    return <p key={i} className="cr-ai-md-h">{line.slice(4)}</p>;
                if (line.startsWith('## '))
                    return <p key={i} className="cr-ai-md-h">{line.slice(3)}</p>;
                if (line.startsWith('# '))
                    return <p key={i} className="cr-ai-md-h">{line.slice(2)}</p>;

                if (line.startsWith('- ') || line.startsWith('* '))
                    return <p key={i} style={{ paddingLeft: '8px' }}>• {formatInline(line.slice(2))}</p>;

                if (/^\d+\. /.test(line))
                    return <p key={i} style={{ paddingLeft: '8px' }}>{formatInline(line)}</p>;

                if (!line.trim()) return <br key={i} />;

                return <p key={i}>{formatInline(line)}</p>;
            })}
        </div>
    );
};

const formatInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

export default AICopilotPanel;