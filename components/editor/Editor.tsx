'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus'; 
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown'; 
import Highlight from '@tiptap/extension-highlight'; 
import Typography from '@tiptap/extension-typography'; 
import Image from '@tiptap/extension-image'; 
import { MenuBar } from './MenuBar'; 
import { useEffect, useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingSelection, setIsEditingSelection] = useState(false);

  const [attachment, setAttachment] = useState<{name: string, content: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  
  const isWritingDoc = useRef(false);

  const editor = useEditor({
    // Removed ImageBlock from extensions array
    extensions: [StarterKit, Markdown, Highlight, Typography, Image], 
    content: '<h1>Highlight me and ask the AI to change me!</h1><p>This is some example text to test the bubble menu iteration feature.</p>',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: { 
        class: 'prose prose-lg focus:outline-none max-w-3xl mx-auto py-10 px-8 h-full min-h-[800px]',
        spellcheck: 'false' 
      },
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

  // --- DUAL-STREAM ROUTER LOGIC (NO TOOLS) ---
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
              editor.commands.setContent(docContent);
            }
          }
        });
      }, 0); 
    }
  }, [messages, editor]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File must be under 2MB to prevent token limits.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachment({ name: file.name, content });
    };
    reader.readAsText(file);
    
    e.target.value = ''; 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading || !editor) return;
    isWritingDoc.current = false; 
    
    sendMessage(
      { text: promptInput }, 
      { body: { 
          documentContext: editor.getText(),
          referenceContext: attachment?.content || '' 
        } 
      }
    ); 
    
    setPromptInput('');
  };

  const renderChatMessage = (text: string) => {
    const docIndex = text.indexOf('<DOC>');
    if (docIndex !== -1) return text.slice(0, docIndex).trim();
    return text;
  };

  const handleInlineEdit = async (actionPrompt: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    
    if (!selectedText) return;

    setIsEditingSelection(true);
    editor.setEditable(false);

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: actionPrompt, selectedText })
      });

      if (!response.body) throw new Error('No response body');

      editor.commands.deleteSelection();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        editor.commands.insertContent(chunk);
      }
    } catch (error) {
      console.error("Inline edit failed:", error);
    } finally {
      editor.setEditable(true);
      setIsEditingSelection(false);
      setEditPrompt('');
    }
  };

  if (!isMounted || !editor) {
    return <div className="flex items-center justify-center h-screen w-screen bg-gray-100 text-gray-400">Initializing workspace...</div>;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      
      {/* THE CANVAS */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 shadow-sm z-10 relative">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">AI Content Editor</h1>
          <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            Context-Aware Mode
          </span>
        </div>
        
        <MenuBar editor={editor} />
        
        <div className="flex-1 overflow-y-auto relative">
          
          {editor && (
            <BubbleMenu 
              editor={editor} 
              options={{ placement: 'top' }}
              className="flex items-center gap-1 p-1.5 bg-white border border-gray-200 rounded-xl shadow-xl transition-all"
            >
              <button 
                onClick={() => handleInlineEdit('Rewrite to sound more professional and polished.')}
                disabled={isEditingSelection}
                className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                ✨ Improve
              </button>
              
              <button 
                onClick={() => handleInlineEdit('Make this significantly shorter and more concise.')}
                disabled={isEditingSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
              >
                ✂️ Shorten
              </button>

              <div className="w-px h-5 bg-gray-300 mx-2" />
              
              <form 
                onSubmit={(e) => { e.preventDefault(); handleInlineEdit(editPrompt); }} 
                className="flex items-center"
              >
                <input
                  type="text"
                  placeholder="Ask AI to change this..."
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  disabled={isEditingSelection}
                  className="w-56 px-2 py-1 text-sm border-none focus:ring-0 outline-none bg-transparent placeholder-gray-400"
                />
                <button 
                  type="submit" 
                  disabled={!editPrompt.trim() || isEditingSelection} 
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  Enter ↵
                </button>
              </form>
            </BubbleMenu>
          )}

          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      {/* THE CHAT SIDEBAR */}
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
                       return <span key={index} className="whitespace-pre-wrap leading-relaxed">{renderChatMessage(part.text)}</span>;
                     }
                     return null;
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- CHAT INPUT UI --- */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          
          {attachment && (
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg inline-flex w-fit border border-blue-100 shadow-sm">
              📄 {attachment.name}
              <button 
                type="button"
                onClick={() => setAttachment(null)}
                className="ml-2 text-blue-400 hover:text-blue-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".txt,.md,.csv,.json" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              title="Attach context file (Max 2MB)"
            >
              📎
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isLoading}
                placeholder="Ask the AI to write or edit..."
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:opacity-60 bg-gray-50 focus:bg-white text-sm"
              />
              <button 
                type="submit"
                disabled={isLoading || !promptInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                ↑
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}