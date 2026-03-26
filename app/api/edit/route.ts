import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  // 🚨 Extract the dynamic system instruction sent from Editor.tsx
  const { prompt, selectedText, systemInstruction } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    
    // 🚨 Dynamically apply the rules based on the content type!
    system: systemInstruction || `You are an expert copy editor. Revise the text according to the instruction. Output ONLY the revised text. PURE HTML ONLY.`,
    
    prompt: `Instruction: ${prompt}\n\nSelected Text to Rewrite:\n"${selectedText}"`,
  });

  return result.toTextStreamResponse();
}