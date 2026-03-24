import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai'; 

export const runtime = 'edge'; 

export async function POST(req: Request) {
  const { messages, documentContext, referenceContext } = await req.json();
  const context = documentContext || '(The document is currently empty)';

  const result = streamText({
    model: openai('gpt-4o'), 
    
    system: `You are an expert AI writing assistant operating alongside a text editor canvas.
    
    CURRENT DOCUMENT STATE:
   
    ${context}
    

    USER'S ATTACHED REFERENCE MATERIAL:
  
    ${referenceContext || '(No reference material attached for this turn)'}
    
    
    CRITICAL RULES FOR OUTPUTTING TEXT:
    You have TWO output channels: The Chat Sidebar, and the Document Canvas. You can only stream one linear response, so you must use tags to route your text.
    
    1. THE CHAT CHANNEL: Anything you type normally goes to the Chat Sidebar. Use this to acknowledge the user. IF THE USER ASKS A QUESTION ABOUT THE REFERENCE MATERIAL, answer them here in the chat channel.
    2. THE DOCUMENT CANVAS CHANNEL: To physically edit or write to the canvas, you MUST wrap the new document content in exactly <DOC> and </DOC> tags. Only do this if they explicitly ask you to write, draft, or edit the document.
    3. FULL REWRITE: If the user asks you to edit the document (like removing a paragraph), you must rewrite the ENTIRE necessary document inside the <DOC> tags. 
    4. USING REFERENCE MATERIAL: If the user uploaded reference material, use it as your absolute source of truth.
    5. MULTI-TURN: If you ask a clarifying question and the user answers, your next response MUST execute the action inside the <DOC> tags.
    6. STRICT FORMATTING: Output clean Markdown. You are STRICTLY FORBIDDEN from outputting raw HTML tags.,
    7. STRUCTURED DATA (TABLES): If the user asks for comparisons, data, or structured layouts, you MUST use standard Markdown Tables (e.g., | Header | Header |) inside your <DOC> tags.`,
    
    messages: await convertToModelMessages(messages), 
  });

  return result.toUIMessageStreamResponse();
}