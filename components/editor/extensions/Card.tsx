import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState } from 'react';
import { ContentRegistry } from '@/lib/core/content-types';

const CardComponent = (props: any) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAIEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isStreaming) return;

    setIsStreaming(true);
    
    const selectedText = props.node.textContent;
    const initialFrom = props.getPos() + 1;
    const initialTo = props.getPos() + props.node.nodeSize - 1;
    
    props.editor.chain()
      .deleteRange({ from: initialFrom, to: initialTo })
      .insertContentAt(initialFrom, '<p class="text-purple-600 animate-pulse font-medium">✨ AI is rewriting this card...</p>')
      .run();

    try {
      // 🚨 1. dynamically grab the correct instructions based on the URL
      const typeMatch = window.location.pathname.match(/\/editor\/([^/]+)/);
      const type = typeMatch ? typeMatch[1] : 'document';
      const config = ContentRegistry[type];
      const systemInstruction = config?.aiBehavior.inlineEditPrompt || '';

      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🚨 2. We are now actually sending the instructions!
        body: JSON.stringify({ prompt: promptInput, selectedText, systemInstruction })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const cleanedText = fullText
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const pos = props.getPos();
        const currentNode = props.editor.state.doc.nodeAt(pos);

        if (currentNode && currentNode.type.name === 'documentCard') {
          const currentFrom = pos + 1;
          const currentTo = pos + currentNode.nodeSize - 1;

          // 🚨 3. The Try/Catch shield: Ignores TipTap errors when HTML tags are half-streamed
          try {
            props.editor.chain()
              .deleteRange({ from: currentFrom, to: currentTo })
              .insertContentAt(currentFrom, cleanedText)
              .run();
          } catch (error) {
            // Silently skip this tick. It will succeed on the next tick once the AI closes the HTML tag!
          }
        }
      }
      
      // 🚨 4. Wake up the image scanner!
      window.dispatchEvent(new CustomEvent('editor:trigger-image-scan'));

    } catch (error) {
      console.error("Card AI Edit failed:", error);
    } finally {
      setIsStreaming(false);
      setShowPrompt(false);
      setPromptInput('');
    }
  };

  return (
    <NodeViewWrapper 
      data-type="card" // 🚨 CRITICAL: This lets Editor.tsx target it dynamically!
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 mx-auto transition-all hover:border-blue-300 hover:shadow-md overflow-hidden flex flex-col"
    >
      
      {/* 🚨 Removed 'min-h-[2rem]' so it respects our dynamic aspect-ratio */}
      <NodeViewContent className="focus:outline-none flex-1 flex flex-col" />

      {/* --- FLOATING HOVER CONTROLS (Keep these exactly the same) --- */}
      <div 
        contentEditable={false}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex! flex-row! items-center gap-1 bg-white border border-gray-200 shadow-sm rounded-lg p-1 z-50 w-max"
      >
        {/* The New Ask AI Button */}
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="px-2 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex items-center gap-1"
          title="Edit this card with AI"
        >
          ✨ Ask AI
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <button
          onClick={() => props.editor.commands.insertContentAt(props.getPos() + props.node.nodeSize, '<div data-type="card"><p></p></div>')}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-bold"
          title="Add Card Below"
        >
          +
        </button>
        <button
          onClick={() => props.deleteNode()}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete Card"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>

        {/* --- INLINE AI PROMPT INPUT --- */}
        {showPrompt && (
          <form onSubmit={handleAIEdit} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-purple-200 shadow-xl rounded-xl p-2 flex items-center gap-2 w-72">
            <input
              type="text"
              placeholder="What should the AI change?"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isStreaming}
              autoFocus
              // VERY IMPORTANT: Stops TipTap from hijacking the Enter key and Spacebar!
              onKeyDown={(e) => e.stopPropagation()} 
              className="flex-1 text-sm border-none focus:ring-0 outline-none bg-transparent placeholder-gray-400 px-1"
            />
            <button 
              type="submit" 
              disabled={!promptInput.trim() || isStreaming}
              className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              ↑
            </button>
          </form>
        )}
      </div>

    </NodeViewWrapper>
  );
};

export const DocumentCard = Node.create({
  name: 'documentCard',
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [{ tag: 'div[data-type="card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'card' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardComponent);
  },
});