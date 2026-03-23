import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

// 1. The React Component that renders inside the editor
const ImageBlockComponent = ({ node }: any) => {
  return (
    <NodeViewWrapper className="my-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center min-h-[200px]">
      <div className="text-gray-500 font-medium">
        {/* We will populate this via the AI Tool Call */}
        Generating image: <span className="text-blue-600">"{node.attrs.altText}"</span>
      </div>
      {node.attrs.caption && (
        <div className="text-sm text-gray-400 mt-2">{node.attrs.caption}</div>
      )}
    </NodeViewWrapper>
  );
};

// 2. The TipTap Extension Definition
export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true, // Tells TipTap this is a single, indivisible unit

  addAttributes() {
    return {
      altText: { default: 'Placeholder image' },
      caption: { default: '' },
      layout: { default: 'full-width' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockComponent);
  },
});