import { openai } from '@ai-sdk/openai';
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'; // <-- FIX 1: Import stepCountIs
import { z } from 'zod';

export const runtime = 'edge'; 

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'), 
    system: `You are an expert tech blogger writing directly into a rich-text editor. 
    Write the blog post in clean Markdown. 
    Whenever a visual aid or layout element is appropriate, you MUST use the provided tools to insert it. Do not use raw markdown for images.`,
    
    messages: await convertToModelMessages(messages), 
    
    // FIX 2: Vercel v5 completely replaced maxSteps with stopWhen
    stopWhen: stepCountIs(5), 
    
    tools: {
      insertImage: tool({
        description: 'Insert a contextual image placeholder into the blog post.',
        inputSchema: z.object({
          altText: z.string().describe('A highly descriptive prompt of what the image shows'),
          caption: z.string().optional().describe('A short, engaging caption to display below the image'),
          layout: z.enum(['full-width', 'float-left', 'float-right']).default('full-width')
        }),
        // FIX 3: You MUST include this. It fakes a successful server response so the LLM resumes typing.
        execute: async ({ altText }) => {
          return { 
            status: 'success', 
            note: `Image placeholder for "${altText}" was successfully inserted. Continue writing the rest of the blog post now.` 
          };
        }
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}