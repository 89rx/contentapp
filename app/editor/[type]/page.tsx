// app/editor/[type]/page.tsx
import { ContentRegistry } from '@/lib/core/content-types';
import { notFound, redirect } from 'next/navigation';
import Editor from '@/components/editor/Editor';
import { supabase } from '@/lib/supabase';

export default async function DynamicEditorRoute({ 
  params,
  searchParams
}: { 
  params: Promise<{ type: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const config = ContentRegistry[resolvedParams.type];

  if (!config) notFound();

  if (!resolvedSearch.id) {
    const { data, error } = await supabase
      .from('documents')
      .insert([{ type_id: resolvedParams.type }])
      .select('id')
      .single();

    if (!error && data) {
      redirect(`/editor/${resolvedParams.type}?id=${data.id}`);
    }
  }

  let initialContent = null;
  let initialTitle = null; // 🚨 New variable

  if (resolvedSearch.id) {
    const { data } = await supabase
      .from('documents')
      .select('content_html, title') // 🚨 Fetch title
      .eq('id', resolvedSearch.id)
      .single();
      
    initialContent = data?.content_html;
    initialTitle = data?.title; // 🚨 Store title
  }

  // 🚨 Pass initialTitle to the Editor
  return (
    <Editor 
      config={config} 
      initialContent={initialContent} 
      initialTitle={initialTitle} 
      documentId={resolvedSearch.id} 
    />
  );
}