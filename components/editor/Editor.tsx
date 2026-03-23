'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown'; 
import Highlight from '@tiptap/extension-highlight'; // <-- NEW
import Typography from '@tiptap/extension-typography'; // <-- NEW
import { ImageBlock } from './extensions/ImageBlock';
import { MenuBar } from './MenuBar'; 
import { useEffect, useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  
  const processedToolCalls = useRef(new Set<string>());
  const isWritingDoc = useRef(false);

  const editor = useEditor({
    // ADD THE NEW EXTENSIONS HERE
    extensions: [StarterKit, ImageBlock, Markdown, Highlight, Typography], 
    content: '<h1>Your blog post will appear here...</h1>',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose prose-lg focus:outline-none max-w-3xl mx-auto py-10 px-8 h-full min-h-[800px]' },
    },
  });

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/generate',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!editor || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage.role === 'assistant') {
      setTimeout(() => {
        
        latestMessage.parts.forEach(part => {
          if (part.type === 'text') {
            const fullText = part.text || '';
            const docStartIndex = fullText.indexOf('<DOC>');

            if (docStartIndex !== -1) {
              if (!isWritingDoc.current) {
                isWritingDoc.current = true;
              }

              let docContent = fullText.slice(docStartIndex + 5);
              docContent = docContent.replace('</DOC>', ''); 

              // 4. THE MAGIC FIX: We set the entire Markdown string.
              // The Markdown extension will parse **bold** and # Headings automatically!
              editor.commands.setContent(docContent);
            }
          }

          if (part.type === 'tool-insertImage') {
             if (!processedToolCalls.current.has(part.toolCallId) && (part.state === 'input-available' || part.state === 'output-available')) {
                const input = part.input as any;
                editor.commands.insertContent({
                  type: 'imageBlock',
                  attrs: { altText: input.altText, caption: input.caption, layout: input.layout }
                });
                processedToolCalls.current.add(part.toolCallId);
             }
          }
        });
      }, 0); 
    }
  }, [messages, editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading || !editor) return;

    isWritingDoc.current = false; 

    // We send editor.getText() so the AI reads clean text, not HTML
    sendMessage(
      { text: promptInput },
      { body: { documentContext: editor.getText() } }
    ); 
    
    setPromptInput('');
  };

  const renderChatMessage = (text: string) => {
    const docIndex = text.indexOf('<DOC>');
    if (docIndex !== -1) {
      return text.slice(0, docIndex).trim();
    }
    return text;
  };

  if (!isMounted || !editor) {
    return <div className="flex items-center justify-center h-screen w-screen bg-gray-100 text-gray-400">Initializing workspace...</div>;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      
      {/* LEFT COLUMN: THE CANVAS (70%) */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 shadow-sm z-10">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">AI Content Editor</h1>
          <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            Context-Aware Mode
          </span>
        </div>
        
        {/* 5. INJECT THE MENUBAR HERE */}
        <MenuBar editor={editor} />
        
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      {/* RIGHT COLUMN: THE CHAT SIDEBAR (30%) */}
      <div className="w-[400px] flex flex-col bg-gray-50 shrink-0">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6 shrink-0 shadow-sm z-10">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">AI Assistant</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <p className="text-sm text-center">I'm ready to help you write.<br/>What are we working on today?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}>
                  
                  {message.parts.map((part, index) => {
                     if (part.type === 'text') {
                       return (
                         <span key={index} className="whitespace-pre-wrap leading-relaxed">
                           {renderChatMessage(part.text)}
                         </span>
                       );
                     }
                     if (part.type === 'tool-insertImage') {
                        return (
                          <div key={index} className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500 font-mono flex items-center gap-2">
                            <span className="text-lg">🛠️</span>
                            <div>
                              <span className="font-semibold block text-gray-700">Action Executed</span>
                              Inserted image block into canvas
                            </div>
                          </div>
                        );
                     }
                     return null;
                  })}

                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask the AI to write or edit..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:opacity-60 bg-gray-50 focus:bg-white text-sm"
            />
            <button 
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              ↑
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}