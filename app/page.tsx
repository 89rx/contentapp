'use client';

import Editor from '@/components/editor/Editor';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-100">
      <Editor />
    </main>
  );
}