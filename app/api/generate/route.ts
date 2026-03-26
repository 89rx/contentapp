import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai'; 

export const runtime = 'edge'; 

export async function POST(req: Request) {
  const { messages, documentContext, referenceContext, systemInstruction } = await req.json();
  const context = documentContext || '(The document is currently empty)';

  const result = streamText({
    model: openai('gpt-4o'), 
    system: `
    CURRENT DOCUMENT STATE:
    ---
    ${context}
    ---
    USER'S ATTACHED REFERENCE MATERIAL:
    ---
    ${referenceContext || '(No reference material attached for this turn)'}
    ---
    
    ${systemInstruction}
    `,
    messages: await convertToModelMessages(messages), 
  });

  return result.toUIMessageStreamResponse();
}