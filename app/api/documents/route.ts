import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: Request) {
  try {
    const { id, content_html, title } = await req.json(); 
    
    const updateData: any = { updated_at: new Date() };
    if (content_html) updateData.content_html = content_html;
    if (title) updateData.title = title;

    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Patch Error:", error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}