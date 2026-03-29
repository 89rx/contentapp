'use client';

import { useState } from 'react';
import { ContentTypeDefinition } from '@/lib/core/content-types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  editor: any; 
  config: ContentTypeDefinition;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen, onClose, documentTitle = 'Document', editor, config,
}) => {
  const [exportingType, setExportingType] = useState<'pdf' | 'png' | null>(null);

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!editor) return;
    setExportingType(format);
    
    try {
      const html = editor.getHTML();
      const endpoint = format === 'pdf' ? '/api/export-pdf' : '/api/export-png';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html,
          width: config.canvasConstraints.width,
          height: config.canvasConstraints.minHeight,
          typeId: config.id
        }),
      });
      
      if (!response.ok) throw new Error(`${format.toUpperCase()} Export failed`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle.replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Export failed. Please try again.');
    } finally {
      setExportingType(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Count how many cards exist in the current document
  const html = editor?.getHTML() || '';
  const cardCount = (html.match(/data-type="card"/g) || []).length;

  // UNIVERSAL DYNAMIC VISIBILITY
  let canExportPng = config.allowedExports.includes('png');
  let canExportPdf = config.allowedExports.includes('pdf');

  if (cardCount > 1) {
    canExportPng = false; 
    canExportPdf = true;  
  } else if (config.id === 'social') {
    canExportPdf = false; // If it's a single social post, force them to use PNG
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-[450px] p-6 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Export {config.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Download a high-quality copy of <strong>{documentTitle}</strong>.</p>
          
          {/* Universal feedback message for multi-card layouts */}
          {cardCount > 1 && (
            <p className="text-xs font-semibold text-purple-600 mt-3 bg-purple-50 p-2 rounded-lg border border-purple-100">
              Multiple cards detected. Exporting as a multi-page PDF.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} disabled={exportingType !== null} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
            Cancel
          </button>
          
          {canExportPng && (
            <button onClick={() => handleExport('png')} disabled={exportingType !== null} className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-70 transition-colors shadow-sm flex items-center gap-2">
              {exportingType === 'png' ? 'Processing...' : 'Export High-Res PNG'}
            </button>
          )}

          {canExportPdf && (
            <button onClick={() => handleExport('pdf')} disabled={exportingType !== null} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 transition-colors shadow-sm flex items-center gap-2">
              {exportingType === 'pdf' ? 'Processing...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};