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

  // 1. IF NO ID: Create a blank document in the DB and redirect to its new URL
  if (!resolvedSearch.id) {
    const { data, error } = await supabase
      .from('documents')
      .insert([{ type_id: resolvedParams.type }])
      .select('id')
      .single();

    if (!error && data) {
      redirect(`/editor/${resolvedParams.type}?id=${data.id}`);
    } else {
      console.error("Supabase Insert Error:", error);
    }
  }

  // 2. IF ID EXISTS: Fetch the saved HTML from the database
  let initialContent = null;
  if (resolvedSearch.id) {
    const { data } = await supabase
      .from('documents')
      .select('content_html')
      .eq('id', resolvedSearch.id)
      .single();
      
    initialContent = data?.content_html;
  }

  return <Editor config={config} initialContent={initialContent} documentId={resolvedSearch.id} />;
}