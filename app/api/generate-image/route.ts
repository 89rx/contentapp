import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    // 1. Enable streaming and request 2 partial frames before the final image
    const stream = await openai.images.generate({
      model: "gpt-image-1-mini", 
      prompt: finalPrompt,
      stream: true,
      partial_images: 3,
      n: 1,
      size: "1024x1024",
      quality: "low"
    });

    // 2. Convert OpenAI's AsyncIterable into a Web ReadableStream for the frontend
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          // Catch both the partial frames and the final completed image
          if (event.type === "image_generation.partial_image" || event.type === "image_generation.completed") {
            console.log(`🖼️ [Backend] Emitting image chunk: ${event.type}`);
            
            const imageUrl = `data:image/png;base64,${event.b64_json}`;
            
            // Format as a standard Server-Sent Event (SSE)
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ url: imageUrl })}\n\n`));
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
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("❌ [Backend] OpenAI API Exception:", error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}