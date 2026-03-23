'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ImageBlock } from './extensions/ImageBlock';
import { useEffect, useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai'; // <--- Required for v5 routing

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const lastProcessedIndex = useRef(0);
  const processedToolCalls = useRef(new Set<string>());

  const editor = useEditor({
    extensions: [StarterKit, ImageBlock],
    content: '<h1>Your blog post will appear here...</h1>',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose prose-lg focus:outline-none max-w-3xl mx-auto py-10' },
    },
  });

  // FIX: Vercel AI SDK v5 Chat Hook syntax
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/generate',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- THE GAMMA SYNC LOGIC ---
  // --- THE GAMMA SYNC LOGIC ---
  useEffect(() => {
    if (!editor || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage.role === 'assistant') {
      
      // FIX: Defer TipTap execution to the next tick to avoid flushSync render collisions
      setTimeout(() => {
        // 1. Stream the Text Delta
        const textParts = latestMessage.parts.filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text');
        const currentText = textParts.map(part => part.text).join('');
        
        const newText = currentText.slice(lastProcessedIndex.current);
        
        if (newText.length > 0) {
          editor.commands.insertContent(newText);
          lastProcessedIndex.current = currentText.length;
        }

        // 2. Intercept and Render Tool Calls (Images)
        latestMessage.parts.forEach(part => {
          if (part.type === 'tool-insertImage') {
            if (!processedToolCalls.current.has(part.toolCallId) && (part.state === 'input-available' || part.state === 'output-available')) {
              
              const input = part.input as any; 
              
              editor.commands.insertContent({
                type: 'imageBlock',
                attrs: {
                  altText: input.altText,
                  caption: input.caption,
                  layout: input.layout
                }
              });
              
              processedToolCalls.current.add(part.toolCallId);
            }
          }
        });
      }, 0); // <-- 0ms timeout pushes this to the end of the execution queue
    }
  }, [messages, editor]);

  // Here is where the prompt is passed!
  const handleGenerate = (prompt: string) => {
    if (!editor) return;
    editor.commands.setContent('');
    editor.setEditable(false);
    lastProcessedIndex.current = 0;
    processedToolCalls.current.clear();
    
    // FIX: v5 uses sendMessage instead of append
    sendMessage({ text: prompt }); 
    
    editor.setEditable(true);
  };

  if (!isMounted || !editor) {
    return <div className="flex items-center justify-center min-h-[500px] text-gray-400">Initializing editor...</div>;
  }

  return (
    <div className="flex flex-col min-h-[600px] bg-white text-gray-900 relative">
      <div className="absolute top-4 right-4 z-10">
        <button 
          /* THIS IS WHERE THE HARDCODED PROMPT LIVES FOR NOW */
          onClick={() => handleGenerate("Write a short, engaging blog post about the future of AI. Include an image of a futuristic server room.")}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Test Generation'}
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}