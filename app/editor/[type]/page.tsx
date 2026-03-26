import { ContentRegistry } from '@/lib/core/content-types';
import { notFound } from 'next/navigation';
import Editor from '@/components/editor/Editor';

// 🚨 1. Make the component async and type params as a Promise
export default async function DynamicEditorRoute({ 
  params 
}: { 
  params: Promise<{ type: string }> 
}) {
  // 🚨 2. Await the params before trying to read 'type'
  const resolvedParams = await params;
  
  // 3. Look up the configuration based on the URL parameter
  const config = ContentRegistry[resolvedParams.type];

  // 4. If the user types a random URL, throw a 404
  if (!config) {
    notFound();
  }

  // 5. Pass the configuration down into our Editor canvas
  return <Editor config={config} />;
}