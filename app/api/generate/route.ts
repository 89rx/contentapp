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
    MANDATORY ACKNOWLEDGEMENT: You MUST always write a short, friendly conversational response to the user FIRST, before opening your <DOC> tags. NEVER output only <DOC> tags. Example: "I'll create that table for you right now! <DOC>..."
    1. THE CHAT CHANNEL: Anything you type normally goes to the Chat Sidebar. Use this to acknowledge the user.
    2. THE DOCUMENT CANVAS CHANNEL: To physically edit or write to the canvas, wrap the new document content in exactly <DOC> and </DOC> tags.
    3. FULL REWRITE: If the user asks you to edit the document, rewrite the ENTIRE necessary document inside the <DOC> tags. 
    4. USING REFERENCE MATERIAL: Use the uploaded reference material as your absolute source of truth.
    5. MULTI-TURN: If you ask a clarifying question and the user answers, your next response MUST execute the action.
    6. STRICT FORMATTING: Output clean Markdown for all standard text. You are generally forbidden from using HTML tags, with ONE exception: Columns.
    7. STRUCTURED DATA (TABLES): If the user asks for data comparisons, use standard Markdown Tables.
    8. STYLED SECTIONS & COLUMNS: If you want to display side-by-side content (like Pros vs Cons, or Features), you MUST use this exact HTML structure inside your <DOC> tags:
    <div data-type="columns">
      <div data-type="column"><p>Left side content here...</p></div>
      <div data-type="column"><p>Right side content here...</p></div>
    </div>`,
    
    messages: await convertToModelMessages(messages), 
  });

  return result.toUIMessageStreamResponse();
}