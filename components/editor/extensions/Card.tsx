import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useState } from 'react';
import { ContentRegistry } from '@/lib/core/content-types';

const SYSTEM_COLORS = [
  '#000000', '#4b5563', '#6b7280', '#9ca3af', '#f3f4f6', '#ffffff',
  '#fef08a', '#fdba74', '#fca5a5', '#d8b4fe', '#93c5fd', '#86efac',
  '#facc15', '#f97316', '#ef4444', '#a855f7', '#3b82f6', '#22c55e',
  '#a16207', '#9a3412', '#991b1b', '#6b21a8', '#1d4ed8', '#166534'
];

const CardComponent = (props: any) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Fallback to white if no color is set
  const currentColor = props.node.attrs.backgroundColor || '#ffffff';

  const handleColorChange = (color: string | null) => {
    props.updateAttributes({ backgroundColor: color });
    setShowColorPicker(false);
  };

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
        const typeMatch = window.location.pathname.match(/\/editor\/([^/]+)/);
        const type = typeMatch ? typeMatch[1] : 'document';
        const config = ContentRegistry[type];
        const systemInstruction = config?.aiBehavior.inlineEditPrompt || '';
  
        const response = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

          try {
            props.editor.chain()
              .deleteRange({ from: currentFrom, to: currentTo })
              .insertContentAt(currentFrom, cleanedText)
              .run();
          } catch (error) {
            // Silently skip this tick
          }
        }
      }
      
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
      data-type="card" 
      // 🚨 DYNAMIC INLINE STYLE: This overrides Tailwind and survives PDF exports!
      style={{ backgroundColor: currentColor }}
      className="group relative rounded-2xl shadow-sm border border-gray-200 mb-8 mx-auto transition-all hover:border-blue-300 hover:shadow-md overflow-hidden flex flex-col"
    >
      
      <NodeViewContent className="focus:outline-none flex-1 flex flex-col" />

      {/* --- FLOATING HOVER CONTROLS --- */}
      <div 
        contentEditable={false}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity !flex !flex-row items-center justify-center gap-1 bg-white border border-gray-200 shadow-sm rounded-lg p-1 z-50 w-max !h-auto"
      >
        
        {/* 🚨 THE NEW COLOR PICKER DROPDOWN */}
        <div className="relative flex items-center">
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); setShowPrompt(false); }}
            className="px-2 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
            title="Change Card Color"
          >
            <div 
              className="w-4 h-4 rounded shadow-sm border border-gray-300" 
              style={{ backgroundColor: currentColor }}
            />
            {currentColor === '#ffffff' ? 'Default' : 'Color'}
            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
          </button>

          {showColorPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 shadow-xl rounded-xl p-3 w-[220px] flex flex-col gap-3 z-50 cursor-default">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">System colors</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {SYSTEM_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => handleColorChange(c)}
                      className={`w-6 h-6 rounded-md border ${currentColor === c ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'} transition-all`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div className="h-px w-full bg-gray-100" />
              <button
                onClick={() => handleColorChange(null)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5 py-1.5 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Reset to default
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* The Ask AI Button */}
        <button
          onClick={() => { setShowPrompt(!showPrompt); setShowColorPicker(false); }}
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
          <form onSubmit={handleAIEdit} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-purple-200 shadow-xl rounded-xl p-2 flex items-center gap-2 w-72 z-50">
            <input
              type="text"
              placeholder="What should the AI change?"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isStreaming}
              autoFocus
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
  
  // 🚨 CRITICAL: We added backgroundColor to the TipTap schema!
  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-bg-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-bg-color': attributes.backgroundColor,
            // Automatically translates the attribute into a true CSS inline style when exported
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },

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