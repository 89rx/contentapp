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
    4. PURE HTML ONLY (NO MARKDOWN): 
       - You MUST return valid HTML tags (like <h1>, <p>, <strong>, <img>).
       - NEVER use Markdown formatting (no asterisks, no hashes).
       - CRITICAL: NEVER wrap your response in markdown code blocks. Do NOT use \`\`\`html or \`\`\`. Output the raw HTML directly starting with the first tag.
    
    *** MULTIMODAL IMAGE REPLACEMENT ***
    5. IF THE USER ASKS TO CHANGE, ADD, OR GENERATE AN IMAGE:
       You MUST output an HTML <img> tag exactly like this, replacing the alt text with a highly descriptive DALL-E prompt based on their request:
       
       <img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[WRITE YOUR DESCRIPTIVE IMAGE PROMPT HERE]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />
       
       If replacing an existing image, just output this new <img> tag in its place.`,
    
    prompt: `Instruction: ${prompt}\n\nSelected Text to Rewrite:\n"${selectedText}"`,
  });

  return result.toTextStreamResponse();
}