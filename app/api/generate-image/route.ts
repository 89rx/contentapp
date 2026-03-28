import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const openai = new OpenAI();
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key missing.' }, { status: 500 });
  }

  const body = await req.json();
  const finalPrompt = body.prompt || "A minimalist aesthetic blog cover image";

  try {
    console.log(`\n🌊 [Backend] Initiating Streaming Image Generation: "${finalPrompt}"`);

    // 1. Enable streaming and request partial frames
    const stream = await openai.images.generate({
      model: "gpt-image-1-mini", 
      prompt: finalPrompt,
      stream: true,
      partial_images: 3,
      n: 1,
      size: "1024x1024",
      quality: "low"
    });

    // 2. Convert to Web ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          
          // 🚨 SCENARIO A: Streaming Partial Frames (Temporary Visuals)
          if (event.type === "image_generation.partial_image") {
            console.log(`🖼️ [Backend] Emitting partial image chunk`);
            const imageUrl = `data:image/png;base64,${event.b64_json}`;
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ url: imageUrl })}\n\n`));
          } 
          
          // 🚨 SCENARIO B: The Final Image (Upload to Supabase for Permanent Storage)
          else if (event.type === "image_generation.completed") {
            console.log(`✅ [Backend] Final image received. Uploading to Supabase...`);
            
            try {
              // Convert the base64 string into a Node.js Buffer
              const imageBuffer = Buffer.from(event.b64_json, 'base64');
              
              // Generate a unique filename
              const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
              
              // Upload the buffer directly to your 'images' bucket
              const { error: uploadError } = await supabase
                .storage
                .from('images')
                .upload(filename, imageBuffer, {
                  contentType: 'image/png',
                  upsert: false
                });

              if (uploadError) throw uploadError;

              // Grab the permanent Public URL
              const { data: { publicUrl } } = supabase
                .storage
                .from('images')
                .getPublicUrl(filename);

              console.log(`🔗 [Backend] Permanent URL generated: ${publicUrl}`);
              
              // Send the permanent Supabase URL to the frontend!
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ url: publicUrl })}\n\n`));
              
            } catch (err) {
              console.error("❌ [Backend] Supabase upload failed:", err);
              // Fallback: If Supabase goes down, at least send the final base64 so the UI doesn't break
              const fallbackUrl = `data:image/png;base64,${event.b64_json}`;
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ url: fallbackUrl })}\n\n`));
            }
          }
        }
        controller.close();
        console.log(`✅ [Backend] Image stream completed.\n`);
      }
    });

    // 3. Return the stream with keep-alive headers
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        // 🚨 FIX 2: THE SILVER BULLET. This explicitly tells Vercel's Nginx proxy to STOP buffering your chunks!
        'X-Accel-Buffering': 'no', 
      },
    });

  } catch (error: any) {
    console.error("❌ [Backend] OpenAI API Exception:", error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}