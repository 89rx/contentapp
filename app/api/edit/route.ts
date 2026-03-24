import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { prompt, selectedText } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: `You are an expert copy editor. The user has selected a specific portion of text from their document and given you an instruction.
    
    CRITICAL RULES:
    1. Revise, rewrite, or refine the text EXACTLY according to the instruction.
    2. OUTPUT ONLY THE REVISED TEXT. 
    3. Do not include conversational filler (e.g., "Here is the rewritten text:").
    4. Do not wrap the text in markdown code blocks or any XML tags. Just return the raw, formatted replacement text.`,
    
    prompt: `Instruction: ${prompt}\n\nSelected Text to Rewrite:\n"${selectedText}"`,
  });

  return result.toTextStreamResponse();
}