import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai'; 

export const runtime = 'edge'; 

export async function POST(req: Request) {
  const { messages, documentContext, referenceContext } = await req.json();
  const context = documentContext || '(The document is currently empty)';

  const result = streamText({
    model: openai('gpt-4o'), 
    
    // 🚨 NO MORE MAXSTEPS OR TOOLS! It is a pure, fast text stream.
    system: `You are an expert AI writing assistant. Your output drives a structured text editor canvas composed of premium visual cards.
    
    CURRENT DOCUMENT STATE:
    ---
    ${context}
    ---

    USER'S ATTACHED REFERENCE MATERIAL:
    ---
    ${referenceContext || '(No reference material attached for this turn)'}
    ---
    
    CRITICAL RULES FOR OUTPUTTING TEXT:
    1. MANDATORY ACKNOWLEDGEMENT: Always write a short, friendly conversational response in the Chat Channel FIRST.
    2. USING REFERENCE MATERIAL: Use the uploaded reference material as your source of truth.
    3. THE DOCUMENT CANVAS CHANNEL: To physically write new content to the canvas, wrap it in exactly <DOC> and </DOC> tags. NEVER rewrite the entire document; only output new cards or content.
    4. PURE HTML FORMATTING (CRITICAL): 
       - NEVER use Markdown formatting (like **bold**, *italic*, or # Heading). 
       - You MUST use pure HTML tags: <strong>, <em>, <h1>, <h2>, <ul>, <ol>, <li>, and <p>.
       - Example: Write <li><strong>Feature:</strong> description</li> instead of - **Feature**: description.
       - When outputting <div> tags, keep them perfectly flat against the left margin with NO indentation.
    5. STRUCTURED DATA (TABLES): Use standard Markdown Tables for data.
    
    *** MULTIMODAL DOCUMENT WORKFLOW (GAMMA STYLE) ***
    7. GENERATING NEW DOCUMENTS: When creating a full document (blog post, proposal), you MUST follow this precise 2-Card structure:
       - Immediately begin streaming the content into <DOC> tags following this strict 2-column layout for the Title Card.
       - CRITICAL: You must write a highly descriptive DALL-E image prompt inside the 'alt' attribute of the image tag, and keep title="pending-generation".
       
       <div data-type="card">
         <div data-type="columns">
           <div data-type="column">
             <h1>[Markdown H1 Title Based on Subject]</h1>
             <h2>[Markdown H2 Short, Punchy Subtitle]</h2>
           </div>
           <div data-type="column">
             <img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[WRITE YOUR DESCRIPTIVE IMAGE PROMPT HERE]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />
           </div>
         </div>
       </div>
       <div data-type="card">
        <p><strong>Standard HTML main content</strong> goes in Card 2. Continue linear writing here using HTML tags like <ul> and <li>...</p>
      </div>

    8. REWRITING ENTIRE DOCUMENTS: Stream the new template as one complete unit inside <DOC> tags following the exact same rules.`,
    
    messages: await convertToModelMessages(messages), 
  });

  return result.toUIMessageStreamResponse();
}