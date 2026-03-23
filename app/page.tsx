'use client';

import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/editor/Editor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[500px] text-gray-400">
      Initializing editor canvas...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Simple Header/Toolbar Area */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 px-8 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">AI Content Editor</h1>
          <span className="text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
            Blog Post Mode
          </span>
        </div>

        {/* Editor Canvas */}
        <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm overflow-hidden min-h-[600px]">
          <Editor />
        </div>
      </div>
    </main>
  );
}