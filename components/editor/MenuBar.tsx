import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { menuBarStateSelector } from './menuBarState';

export const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const editorState = useEditorState({
    editor: editor as Editor, // Type cast to satisfy strict mode
    selector: menuBarStateSelector,
  });

  if (!editor) return null;

  const btn = (isActive: boolean, isDisabled: boolean = false) =>
    `px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isDisabled ? 'opacity-30 cursor-not-allowed text-gray-500' :
      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

    // The Image Prompt Function
    const addImage = () => {
        const url = window.prompt('Enter the image URL:');
        
        if (url && editor) {
          
          (editor.commands as any).setImage({ src: url });
        }
      };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-200 shadow-sm z-20">
      <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editorState.canBold} className={btn(editorState.isBold, !editorState.canBold)}><b>B</b></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editorState.canItalic} className={btn(editorState.isItalic, !editorState.canItalic)}><i>I</i></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editorState.canStrike} className={btn(editorState.isStrike, !editorState.canStrike)}><s>S</s></button>
      
            <button 
            onClick={() => editor.chain().focus().toggleHighlight().run()} 
            disabled={!editorState.canHighlight} 
            className={btn(editorState.isHighlight, !editorState.canHighlight)}
            >
            <span className="bg-yellow-200 px-1 rounded">Mark</span>
            </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editorState.canCode} className={btn(editorState.isCode, !editorState.canCode)}>{`</>`}</button>
      
      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button onClick={() => editor.chain().focus().setParagraph().run()} className={btn(editorState.isParagraph)}>P</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editorState.isHeading1)}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editorState.isHeading2)}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editorState.isHeading3)}>H3</button>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editorState.isBulletList)}>• List</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editorState.isOrderedList)}>1. List</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editorState.isBlockquote)}>Quote</button>
      
      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button onClick={addImage} className={btn(false)}>
        🖼️ Image
      </button>

      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} className="px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">Clear</button>
      
      <div className="flex-1" /> {/* Spacer */}

      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo} className={btn(false, !editorState.canUndo)}>Undo</button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo} className={btn(false, !editorState.canRedo)}>Redo</button>
    </div>
  );
};