import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState } from 'react';

const CardComponent = (props: any) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAIEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isStreaming) return;

    setIsStreaming(true);
    
    // 1. Grab the current text inside this specific card
    const selectedText = props.node.textContent;
    
    // 2. Wipe the card clean safely before streaming begins
    const initialFrom = props.getPos() + 1;
    const initialTo = props.getPos() + props.node.nodeSize - 1;
    props.editor.chain()
      .deleteRange({ from: initialFrom, to: initialTo })
      .insertContentAt(initialFrom, '<p></p>')
      .run();

    try {
      // 3. Hit your existing edit API
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput, selectedText })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // FIX: Accumulate the text instead of pushing raw chunks
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Use stream: true so multi-byte characters don't get split in half
        fullText += decoder.decode(value, { stream: true });

        // Calculate the dynamic position of the card in case it shifted
        const pos = props.getPos();
        const currentNode = props.editor.state.doc.nodeAt(pos);

        if (currentNode && currentNode.type.name === 'documentCard') {
          const from = pos + 1;
          const to = pos + currentNode.nodeSize - 1;

          try {
            // FIX: Replace the inner content with the FULL accumulated string so far.
            // If the markdown is valid, the transaction executes and the UI updates.
            props.editor.chain()
              .deleteRange({ from, to })
              .insertContentAt(from, fullText)
              .run();
          } catch (astError) {
            // THE MAGIC SHIELD: If the AI streams an incomplete tag (like "* "), 
            // TipTap will throw a RangeError schema violation. We catch it silently.
            // The transaction aborts, the UI holds the previous valid frame, 
            // and we just wait for the next chunk to finish the word!
          }
        }
      }
    } catch (error) {
      console.error("Card AI Edit failed:", error);
    } finally {
      setIsStreaming(false);
      setShowPrompt(false);
      setPromptInput('');
    }
  };

  return (
    <NodeViewWrapper className="group relative bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-200 mb-8 w-full max-w-3xl mx-auto transition-all hover:border-blue-300 hover:shadow-md">
      
      {/* The actual editable document text goes here */}
      <NodeViewContent className="min-h-[2rem] focus:outline-none" />

      {/* --- FLOATING HOVER CONTROLS --- */}
      <div 
        contentEditable={false} 
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-gray-200 shadow-sm rounded-lg p-1 z-10"
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