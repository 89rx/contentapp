import { openai } from '@ai-sdk/openai';
import { streamText, tool, convertToModelMessages } from 'ai'; 
import { z } from 'zod';

export const runtime = 'edge'; 

export async function POST(req: Request) {
  // EXTRACT V5 BODY: We grab the custom context passed alongside the messages
  const { messages, documentContext } = await req.json();
  const context = documentContext || '(The document is currently empty)';

  const result = streamText({
    model: openai('gpt-4o'), 
    
    system: `You are an expert AI writing assistant operating alongside a text editor canvas.
    
    CURRENT DOCUMENT STATE:
    ---
    ${context}
    ---
    
    CRITICAL RULES FOR OUTPUTTING TEXT:
    You have TWO output channels: The Chat Sidebar, and the Document Canvas. You can only stream one linear response, so you must use tags to route your text.
    
    1. THE CHAT CHANNEL: Anything you type normally goes to the Chat Sidebar. Use this to acknowledge the user (e.g., "I'll remove the last paragraph for you!").
    2. THE DOCUMENT CANVAS CHANNEL: To physically edit or write to the canvas, you MUST wrap the new document content in exactly <DOC> and </DOC> tags.
    3. FULL REWRITE: If the user asks you to edit the document (like removing a paragraph), you must rewrite the ENTIRE necessary document inside the <DOC> tags based on the CURRENT DOCUMENT STATE. 
    
    CRITICAL MULTI-TURN CONVERSATION PROTOCOL:
    4. HANDLING USER ANSWERS: If you have asked the user a clarifying question (e.g., "Which gadgets? Smartphones?"), and they answer it (e.g., "smartphones"), your VERY NEXT response MUST be to execute the intended action (e.g., using the <DOC> tags to write the content).
    5. PRIORITIZE ACTION, AVOID UNRELATED TOOLS: After a clarifying question is answered, do NOT call an unrelated tool (like the image generation tool) unless the user's answer explicitly requested a new tool. Stick to the intended writing/editing thread.
    
    CRITICAL FORMATTING (NO HTML):
    6. You must output clean Markdown. You are STRICTLY FORBIDDEN from outputting raw HTML tags (like <h1>, <p>, or <br>). Stick to Markdown format (# for headings, ** for bold). Do not use markdown code blocks (\`\`\`) around the <DOC> tags.`,
    
    messages: await convertToModelMessages(messages), 
    
    tools: {
      insertImage: tool({
        description: 'Insert a contextual image placeholder into the blog post.',
        inputSchema: z.object({
          altText: z.string().describe('A highly descriptive prompt of what the image shows'),
          caption: z.string().optional().describe('A short, engaging caption to display below the image'),
          layout: z.enum(['full-width', 'float-left', 'float-right']).default('full-width')
        }),
        execute: async ({ altText }) => {
          return { status: 'success', note: `Image placeholder for "${altText}" was successfully inserted.` };
        }
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}