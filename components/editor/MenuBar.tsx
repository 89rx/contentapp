import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { menuBarStateSelector } from './menuBarState';
import { useRef, useState } from 'react';

export const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editorState = useEditorState({
    editor: editor as Editor, 
    selector: menuBarStateSelector,
  });

  if (!editor) return null;

  const btn = (isActive: boolean, isDisabled: boolean = false) =>
    `px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
      isDisabled ? 'opacity-30 cursor-not-allowed text-gray-500' :
      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  // 🚨 NEW: The Native File Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Safety check: keep it under 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload an image smaller than 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      // Push to your backend upload route
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const { url } = await res.json();

      // Inject the permanent Supabase URL into the editor
      if (url && editor) {
        (editor.commands as any).setImage({ src: url });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset the input value so the user can upload the exact same file again if they delete it
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-200 shadow-sm z-20">
      <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editorState.canBold} className={btn(editorState.isBold, !editorState.canBold)}><b>B</b></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editorState.canItalic} className={btn(editorState.isItalic, !editorState.canItalic)}><i>I</i></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editorState.canStrike} className={btn(editorState.isStrike, !editorState.canStrike)}><s>S</s></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editorState.canCode} className={btn(editorState.isCode, !editorState.canCode)}>{`</>`}</button>
      
      <button 
        onClick={() => editor.chain().focus().toggleHighlight().run()} 
        disabled={!editorState.canHighlight} 
        className={btn(editorState.isHighlight, !editorState.canHighlight)}
      >
        <span className="bg-yellow-200 px-1 rounded text-gray-800">Mark</span>
      </button>

      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button onClick={() => editor.chain().focus().setParagraph().run()} className={btn(editorState.isParagraph)}>P</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editorState.isHeading1)}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editorState.isHeading2)}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editorState.isHeading3)}>H3</button>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editorState.isBulletList)}>• List</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editorState.isBlockquote)}>Quote</button>
      
      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      {/* 🚨 THE NEW IMAGE UPLOAD UI */}
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/gif, image/webp" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className={btn(false, isUploading)}
      >
        {isUploading ? '⏳ Uploading...' : '🖼️ Image'}
      </button>

      <button 
        onClick={() => editor.chain().focus().insertContent('<div data-type="columns"><div data-type="column"><p>Left Column</p></div><div data-type="column"><p>Right Column</p></div></div>').run()} 
        className={btn(editorState.isColumns)}
        title="Insert 2 Columns"
      >
        ⏸️ Columns
      </button>

      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button 
        onClick={() => (editor.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
        className={btn(editorState.isTable)}
        title="Insert Table"
      >
        ▦ Table
      </button>

      {editorState.isTable && (
        <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
          <button onClick={() => (editor.chain().focus() as any).addRowAfter().run()} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded">
            + Row
          </button>
          <button onClick={() => (editor.chain().focus() as any).addColumnAfter().run()} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded">
            + Col
          </button>
          <button onClick={() => (editor.chain().focus() as any).deleteTable().run()} className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 rounded">
            Del Table
          </button>
        </div>
      )}

      <div className="w-px h-5 bg-gray-300 mx-1" />
      
      <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} className="px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">Clear</button>
      
      <div className="flex-1" />

      <button onClick={() => editor.chain().focus().undo().run()} disabled={!editorState.canUndo} className={btn(false, !editorState.canUndo)}>Undo</button>
      <button onClick={() => editor.chain().focus().redo().run()} disabled={!editorState.canRedo} className={btn(false, !editorState.canRedo)}>Redo</button>
    </div>
  );
};