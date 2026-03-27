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
import { ColumnBlock, Column } from './extensions/Columns';
import { DocumentCard } from './extensions/Card'; 
import { ExportDialog } from './ExportDialog';
import Document from '@tiptap/extension-document';

import { ContentTypeDefinition } from '@/lib/core/content-types';

// --- TABLE IMPORTS ---
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

const CustomDocument = Document.extend({
  content: 'documentCard+',
});

export default function Editor({ config }: { config: ContentTypeDefinition }) {
  const [isMounted, setIsMounted] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingSelection, setIsEditingSelection] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [attachment, setAttachment] = useState<{name: string, content: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const isWritingDoc = useRef(false);
  
  // 🚨 THE DOUBLE-FETCH SHIELD: React Strict Mode persists this across mounts
  const isProcessingImg = useRef(false); 

  const editor = useEditor({
    extensions: [
      CustomDocument, 
      StarterKit.configure({ document: false }),
      Markdown.configure({ html: true }), 
      Highlight, 
      Typography, 
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
      ColumnBlock, 
      Column,      
      DocumentCard, 
    ], 
    content: `<div data-type="card"><h1>Untitled ${config.name}</h1><p>Ask the AI to generate your ${config.name.toLowerCase()} or start typing...</p></div>`,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: { 
        class: 'prose prose-lg focus:outline-none max-w-none min-h-[800px] pb-32',
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
  const isInputDisabled = isLoading || isGeneratingImg;
  const isGlobalLock = isInputDisabled || isEditingSelection;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && editor.isEditable === isGlobalLock) {
      editor.setEditable(!isGlobalLock);
    }
  }, [isGlobalLock, editor]);

  // --- 1. THE MESSAGE LISTENER (PURE HTML STREAMING) ---
  useEffect(() => {
    if (!editor || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role === 'assistant') {
      setTimeout(() => {
        latestMessage.parts.forEach((part) => {
          if (part.type === 'text') {
            const fullText = part.text || '';
            const docStartIndex = fullText.indexOf('<DOC>');
            
            if (docStartIndex !== -1) {
              if (!isWritingDoc.current) isWritingDoc.current = true;
              
              let docContent = fullText.slice(docStartIndex + 5);
              docContent = docContent.replace('</DOC>', ''); 

              // Anti-hallucination markdown stripper
              docContent = docContent.replace(/^```html\s*/i, '');
              docContent = docContent.replace(/```$/i, '');
              docContent = docContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              
              editor.commands.setContent(docContent.trim());
            }
          }
        });
      }, 0); 
    }
  }, [messages, editor]);

  // --- 2. THE UNIVERSAL MULTI-IMAGE SCANNER ---
  useEffect(() => {
    if (!editor || isLoading) return; 

    // 🚨 FIX: We use a local mutable object to track the lock. 
    // This perfectly bypasses stale closures in the event listener below 
    // without violating React's Hook rules!
    const processingState = { isWorking: false };

    const processImages = async () => {
      if (processingState.isWorking) return;
      processingState.isWorking = true;

      let targetPos: number | null = null;
      let promptToGenerate: string | null = null;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') {
          const title = node.attrs.title || '';
          
          if (title === 'pending-generation') {
            targetPos = pos;
            promptToGenerate = node.attrs.alt || "A beautiful highly detailed illustration"; 
            return false; 
          }
        }
      });

      if (targetPos === null || !promptToGenerate) {
        setIsGeneratingImg(false);
        processingState.isWorking = false;
        return;
      }

      console.log(`🎯 [UNIVERSAL SCANNER] Processing image prompt: "${promptToGenerate}"`);
      setIsGeneratingImg(true); 

      editor.commands.command(({ tr, dispatch }) => {
        if (dispatch) {
          const node = editor.state.doc.nodeAt(targetPos!);
          if (node) tr.setNodeMarkup(targetPos!, null, { ...node.attrs, title: 'generating' });
        }
        return true;
      });

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptToGenerate })
        });

        if (!res.ok) throw new Error("API returned an error response");
        if (!res.body) throw new Error("No response body");
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');

          while (boundary !== -1) {
            const msg = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            if (msg.startsWith('data: ')) {
              try {
                const data = JSON.parse(msg.slice(6));
                
                if (data.url && editor) {
                  editor.commands.command(({ tr, dispatch }) => {
                    let found = false;
                    editor.state.doc.descendants((node, pos) => {
                      if (node.type.name === 'image' && node.attrs.title === 'generating') {
                        if (dispatch) tr.setNodeMarkup(pos, null, { ...node.attrs, src: data.url });
                        found = true;
                        return false; 
                      }
                    });
                    return found;
                  });
                }
              } catch (e) { }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (err) {
        console.error("🚨 [FETCH ERROR]:", err);
        
        editor.commands.command(({ tr, dispatch }) => {
          let found = false;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.title === 'generating') {
              if (dispatch) {
                const errorSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='100%25' height='100%25' fill='%23fee2e2'/%3E%3Ctext x='50%25' y='50%25' font-family='system-ui, sans-serif' font-size='20' font-weight='600' fill='%23991b1b' text-anchor='middle'%3EImage Generation Failed %E2%9A%A0%EF%B8%8F%3C/text%3E%3C/svg%3E`;
                tr.setNodeMarkup(pos, null, { ...node.attrs, src: errorSvg, title: null });
              }
              found = true;
              return false; 
            }
          });
          return found;
        });
      } finally {
        editor.commands.command(({ tr, dispatch }) => {
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.title === 'generating') {
              if (dispatch) tr.setNodeMarkup(pos, null, { ...node.attrs, title: null });
              return false; 
            }
          });
          return true;
        });

        // 🚨 Unlock the processor
        processingState.isWorking = false;
        
        // Recursively trigger to catch any additional queued images
        processImages();
      }
    };

    // 1. Runs initially AND perfectly triggers when the main standard generation finishes (isLoading turns false)
    processImages();

    // 🚨 2. We now ONLY listen for the manual triggers from our Edit routes.
    const handleCustomTrigger = () => {
      // 🚨 Safely checks our mutable state object
      if (!processingState.isWorking && !isLoading) {
        processImages();
      }
    };
    
    window.addEventListener('editor:trigger-image-scan', handleCustomTrigger);

    return () => {
      window.removeEventListener('editor:trigger-image-scan', handleCustomTrigger);
    };

  }, [editor, isLoading]);

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

  const getStructuredContext = () => {
    let contextString = '';
    let cardIndex = 0;
    editor?.state.doc.forEach((node) => {
      if (node.type.name === 'documentCard') {
        contextString += `--- CARD INDEX: ${cardIndex} ---\n${node.textContent}\n\n`;
        cardIndex++;
      }
    });
    return contextString || editor?.getText();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isGlobalLock || !editor) return;
    isWritingDoc.current = false; 
    
    sendMessage(
      { text: promptInput }, 
      { body: { 
          documentContext: getStructuredContext(), 
          referenceContext: attachment?.content || '',
          systemInstruction: config.aiBehavior.systemPrompt,
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

  // --- 🚨 FIXED INLINE EDIT HANDLER ---
  const handleInlineEdit = async (actionPrompt: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    if (!selectedText) return;

    setIsEditingSelection(true);
    setEditPrompt('');

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: actionPrompt, 
          selectedText,
          systemInstruction: config.aiBehavior.inlineEditPrompt 
        })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';
      let currentEndPos = to; // Keep track of the expanding text boundary

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        const cleanedText = fullText
          .replace(/^```html\s*/i, '') 
          .replace(/^```\s*/i, '')     
          .replace(/\s*```$/i, '')     
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
          .trim();

        // 🚨 Safe Streaming Replacement (Try/Catch prevents TipTap from crashing on partial HTML)
        try {
          editor.chain()
            .setTextSelection({ from, to: currentEndPos })
            .insertContent(cleanedText)
            .run();
            
          // Update the boundary to the end of the newly inserted text
          currentEndPos = editor.state.selection.to; 
        } catch (error) {
          // Ignore incomplete HTML parse errors during the stream
        }
      }
      
      // 🚨 Trigger the image scanner in case the AI added a new image tag!
      window.dispatchEvent(new CustomEvent('editor:trigger-image-scan'));

    } catch (error) {
      console.error("Inline edit failed:", error);
    } finally {
      setIsEditingSelection(false); 
    }
  };

  if (!isMounted || !editor) {
    return <div className="flex items-center justify-center h-screen w-screen bg-gray-100 text-gray-400">Initializing workspace...</div>;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        documentTitle={`Untitled ${config.name}`}
        editor={editor}
        config={config} 
      />
      
      <style>{`
        ${isGlobalLock ? `.group:hover .group-hover\\:opacity-100 { opacity: 0 !important; pointer-events: none !important; }` : ''}

        /* 1. Base Card Shape (Applies to both) */
        .ProseMirror [data-node-view-wrapper][data-type="card"] {
          width: 100%;
          max-width: ${config.canvasConstraints.uiMaxWidth};
          min-height: ${config.canvasConstraints.uiMinHeight};
          height: auto; 
          padding: ${config.canvasConstraints.padding};
          margin-left: auto;
          margin-right: auto;
          overflow: hidden; 
          background: white;
          transition: max-width 0.3s ease, min-height 0.3s ease; 
          position: relative;
        }

        ${config.id === 'social' ? `
          /* 🚨 2. SOCIAL MEDIA STRICT SPLIT LAYOUT */
          
          /* Force Social card to act as a strict vertical flex container */
          .ProseMirror [data-node-view-wrapper][data-type="card"] {
            display: flex;
            flex-direction: column;
            padding: 0 !important; 
          }
          
          /* 🚨 FIX: Only target the content wrapper, ignore our absolute UI menus! */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div:not([contenteditable="false"]) {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          /* 🚨 THE FIX: Kill ALL stray paragraphs injected by TipTap outside the columns */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div > p {
            display: none !important;
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"] {
            flex: 1;
            display: flex;
            gap: 0 !important; 
            margin: 0 !important;
            align-items: stretch; 
            height: 100%;
          }

          /* Left Column (Text) */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:first-child {
            flex: 2 !important; 
            padding: 3.5rem !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          /* 🚨 BOMB-PROOF SELECTOR: Any column that isn't the first one becomes the image container */
          /* Right Column (Image container) */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:not(:first-child) {
            flex: 1 !important; 
            padding: 0 !important;
            margin: 0 !important;
            position: relative !important; 
            min-height: 100% !important; 
          }

          /* 🚨 NEUTRALIZE TIPTAP'S INVISIBLE WRAPPERS: Forces any <p> tag around the image to vanish */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:not(:first-child) p {
            display: contents !important;
          }

          /* 🚨 THE BR KILLER: Obliterate the invisible <br> TipTap injects during the edit stream! */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:not(:first-child) br {
            display: none !important;
          }
            
          /* Absolute Image positioning for full bleed */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:not(:first-child) img {
            position: absolute !important; 
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            display: block !important;
          }

          /* 🚨 Style the new AI-generated Quote */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"]:first-child blockquote {
            margin-top: 1.5rem !important;
            border-left: 4px solid #8b5cf6 !important; 
            padding-left: 1.25rem !important;
            font-style: italic !important;
            color: #4b5563 !important;
            font-size: 1.1rem !important;
            line-height: 1.6 !important;
          }
        ` : config.id === 'landing' ? `
          /* 🚨 3. LANDING PAGE HERO LAYOUT */
          
          /* The outer card */
          .ProseMirror [data-node-view-wrapper][data-type="card"] {
            padding: 0 !important;
            border-radius: 1.5rem !important; 
            overflow: hidden !important;
            min-height: 700px !important;
            height: auto !important; /* 🚨 Allows infinite expansion */
            background-color: #0f172a !important; 
            position: relative !important; 
          }
          
          /* The TipTap content wrapper */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div:not([contenteditable="false"]) {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            min-height: 700px !important;
            height: auto !important; 
            position: static !important; 
            flex: 1 0 auto !important; /* 🚨 FIX 1: Overrides Tailwind's .flex-1 from Card.tsx */
          }

          /* 🍰 LAYER 1: THE BACKGROUND IMAGE WRAPPER */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div:not([contenteditable="false"]) > p:has(img),
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div:not([contenteditable="false"]) > *:first-child:has(img) {
             position: absolute !important;
             top: 0 !important;
             left: 0 !important;
             right: 0 !important;
             bottom: 0 !important;
             margin: 0 !important;
             padding: 0 !important;
             z-index: 1 !important;
             pointer-events: none !important; 
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] img {
             position: absolute !important;
             top: 0 !important;
             left: 0 !important;
             width: 100% !important;
             height: 100% !important;
             object-fit: cover !important;
             border-radius: 1.5rem !important;
             filter: brightness(0.35) saturate(1.2) !important; 
             margin: 0 !important;
             padding: 0 !important;
          }

          /* 🍰 LAYER 2: THE NAVBAR */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(1) {
             position: relative !important;
             z-index: 10 !important;
             display: flex !important;
             flex-direction: row !important;
             justify-content: space-between !important;
             align-items: center !important;
             padding: 2.5rem 4rem 0 4rem !important;
             width: 100% !important;
             margin: 0 !important;
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(1) div[data-type="column"] {
             flex: unset !important;
             padding: 0 !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(1) h3 {
             font-size: 1.75rem !important;
             font-weight: 800 !important;
             color: white !important;
             margin: 0 !important;
             letter-spacing: -0.025em !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(1) p {
             font-size: 1rem !important;
             font-weight: 600 !important;
             color: rgba(255, 255, 255, 0.8) !important;
             margin: 0 !important;
          }

          /* 🍰 LAYER 3: THE HERO CONTENT */
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) {
             position: relative !important;
             z-index: 10 !important;
             flex: 1 0 auto !important; 
             
             display: flex !important;
             flex-direction: column !important;
             justify-content: flex-start !important; /* 🚨 FIX: Kills the flexbox centering clipping bug */
             align-items: center !important;
             
             width: 100% !important;
             margin: 0 !important;
             padding: 4rem 2rem 8rem 2rem !important;
             height: auto !important; 
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) div[data-type="column"] {
             display: flex !important;
             flex-direction: column !important;
             justify-content: flex-start !important; /* 🚨 FIX: Kills the flexbox centering clipping bug */
             align-items: center !important;
             text-align: center !important;
             
             width: 100% !important;
             padding: 0 !important;
             height: auto !important; 
             flex: 1 0 auto !important; 
             margin: auto 0 !important; /* 🚨 FIX: Safely centers content vertically without restricting height! */
          }

          /* 🌟 PROTECT MANUALLY TYPED PARAGRAPHS (THE EXPAND FIX) */
          /* 🚨 FIX 1: Reduced padding and added min-height so hitting 'Enter' adds visible space! */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div:not([contenteditable="false"]) > p:not(:has(img)) {
             position: relative !important;
             z-index: 10 !important;
             color: white !important;
             text-align: center !important;
             padding: 0.5rem 4rem !important; 
             font-size: 1.25rem !important;
             min-height: 2rem !important; /* Forces empty lines to stretch the canvas */
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) code {
            display: inline-block !important;
            padding: 0.4rem 1.25rem !important;
            border-radius: 9999px !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            font-family: inherit !important; 
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
            margin-bottom: 1.5rem !important;
            backdrop-filter: blur(8px) !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) h1 {
            font-size: 4.5rem !important;
            font-weight: 800 !important;
            line-height: 1.1 !important;
            color: white !important;
            margin: 0 0 1.5rem 0 !important;
            max-width: 900px !important;
            text-wrap: balance !important;
            letter-spacing: -0.03em !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) p:not(:has(strong)):not(:has(code)):not(:has(s)) {
            font-size: 1.35rem !important;
            color: rgba(255, 255, 255, 0.85) !important;
            max-width: 650px !important;
            margin: 0 0 3.5rem 0 !important;
            line-height: 1.6 !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) p:has(strong) {
            display: flex !important;
            flex-direction: row !important;
            gap: 1.25rem !important;
            justify-content: center !important;
            align-items: center !important;
            margin-bottom: 2rem !important;
            width: 100% !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) strong {
            display: inline-block !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            padding: 1.1rem 2.5rem !important;
            border-radius: 9999px !important;
            font-size: 1.125rem !important;
            font-weight: 700 !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
            cursor: pointer !important;
            transition: transform 0.2s !important;
          }

          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) em {
            display: inline-block !important;
            font-style: normal !important; 
            background-color: transparent !important;
            color: #ffffff !important;
            border: 2px solid rgba(255, 255, 255, 0.5) !important;
            padding: 1.1rem 2.5rem !important;
            border-radius: 9999px !important;
            font-size: 1.125rem !important;
            font-weight: 700 !important;
            cursor: pointer !important;
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"]:nth-of-type(2) s {
            display: block !important;
            text-decoration: none !important; 
            font-size: 0.95rem !important;
            color: rgba(255, 255, 255, 0.5) !important;
            font-weight: 500 !important;
          }
          
          /* 🚨 FIX 2: DELETED the "display: none !important" rule for <br> tags entirely! */
        ` : `
        
          /* 🚨 3. STANDARD DOCUMENT LAYOUT (RESTORED) */
          
          /* Let the document flow naturally */
          .ProseMirror [data-node-view-wrapper][data-type="card"] > div {
            display: block; 
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="columns"] {
            display: flex;
            gap: 3rem; 
            align-items: center; /* Centers title vertically alongside image */
          }
          
          .ProseMirror [data-node-view-wrapper][data-type="card"] div[data-type="column"] {
            flex: 1;
            min-width: 0;
          }
          
          /* Gives the image that beautiful rounded "Gamma" presentation look */
          .ProseMirror [data-node-view-wrapper][data-type="card"] img {
            width: 100%;
            height: auto;
            border-radius: 0.75rem; 
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); 
            object-fit: cover;
            margin: 0 auto;
          }
        `}
      `}</style>

      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 shadow-sm z-10 relative">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">{config.icon}</span> 
              {config.name} Editor
            </h1>
            <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
              Context-Aware Mode
            </span>
          </div>
          <button 
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors shadow-sm"
          >
            Export
          </button>
        </div>
        
        <MenuBar editor={editor} />
        
        <div className="flex-1 overflow-y-auto relative bg-gray-50 pt-8 pb-32 px-4">
          {editor && (
            <BubbleMenu 
              editor={editor} 
              shouldShow={({ state, from, to }) => !state.selection.empty && from !== to && !isGlobalLock}
              className="flex items-center gap-1 p-1.5 bg-white border border-gray-200 rounded-xl shadow-xl transition-all"
            >
              <button 
                onClick={() => handleInlineEdit('Rewrite to sound more professional and polished.')}
                className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                ✨ Improve
              </button>
              <button 
                onClick={() => handleInlineEdit('Make this significantly shorter and more concise.')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-56 px-2 py-1 text-sm border-none focus:ring-0 outline-none bg-transparent placeholder-gray-400"
                />
                <button 
                  type="submit" 
                  disabled={!editPrompt.trim()} 
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
            <>
              {messages.map((message) => (
                <div key={message.id} className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {message.parts.map((part, index) => {
                     if (part.type === 'text') {
                       const textContent = renderChatMessage(part.text);
                       if (!textContent) return null; 
                       
                       return (
                          <div key={index} className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                            message.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-tr-sm' 
                              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                          }`}>
                            <span className="whitespace-pre-wrap leading-relaxed">{textContent}</span>
                          </div>
                       );
                     }
                     return null;
                  })}
                </div>
              ))}
              
              {isGeneratingImg && (
                <div className="flex flex-col gap-2 items-start mt-4">
                  <div className="px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm bg-purple-50 border border-purple-100 text-purple-800">
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-lg animate-pulse">🎨</span>
                      <span>
                        <strong className="block text-purple-900">Cover Artwork Queued</strong>
                        Painting your high-res asset...
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
              disabled={isGlobalLock}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGlobalLock}
              className={`p-2 rounded-xl transition-colors shrink-0 ${
                isGlobalLock 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="Attach context file (Max 2MB)"
            >
              📎
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isGlobalLock}
                placeholder={isGlobalLock ? "Waiting for tasks to finish..." : `Ask the AI to write a ${config.name.toLowerCase()}...`}
                className={`w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 outline-none transition-all text-sm ${
                  isGlobalLock ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <button 
                type="submit"
                disabled={isGlobalLock || !promptInput.trim()}
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