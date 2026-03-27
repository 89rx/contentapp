import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    // Clean the filename to prevent URL issues
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error } = await supabase.storage.from('images').upload(filename, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}