export interface ContentTypeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  isDisabled: boolean;
  aiBehavior: {
    systemPrompt: string;
    inlineEditPrompt: string; // 🚨 NEW: Context-aware inline editing!
    temperature: number;
    maxTokens: number;
    autoSuggestImages: boolean;
  };
  canvasConstraints: {
    width: string;
    minHeight: string;
    padding: string; 
    uiMaxWidth: string; 
    uiMinHeight: string; // Will be 'auto' for documents
  };
  allowedExports: ('pdf' | 'png')[];
}

const GLOBAL_AI_RULES = `
CRITICAL COMMUNICATION RULES:
1. MANDATORY ACKNOWLEDGEMENT: You must ALWAYS write a short, friendly conversational response in the Chat Channel FIRST before writing to the canvas.
2. NO MARKDOWN CODE BLOCKS: NEVER wrap your HTML in \`\`\`html code blocks. Output the raw HTML tags directly starting with the first tag.
3. THE CANVAS: Everything meant for the document canvas MUST be wrapped exactly inside <DOC> and </DOC> tags. The editor will only render what is inside these tags.
`;

const INLINE_IMAGE_RULE = `
IMAGE REPLACEMENT: If the user asks to add or change an image, output an HTML tag exactly like this:
<img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[DESCRIPTIVE PROMPT]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />
`;

export const ContentRegistry: Record<string, ContentTypeDefinition> = {
  
  // --- 1. THE PRESENTATION DOCUMENT (RESTORED) ---
  document: {
    id: 'document',
    name: 'Presentation Document',
    description: '16:9 widescreen format, perfect for slides, pitches, and reports.',
    icon: '📄',
    isDisabled: false,
    aiBehavior: {
      temperature: 0.4,
      maxTokens: 2000,
      autoSuggestImages: true,
      // 🚨 RESTORED: Your exact original prompt from the working backend!
      systemPrompt: `You are an expert AI writing assistant. Your output drives a structured text editor canvas composed of premium visual cards.
      
      CRITICAL RULES FOR OUTPUTTING TEXT:
      1. PURE HTML FORMATTING (CRITICAL): 
         - NEVER use Markdown formatting (like **bold**, *italic*, or # Heading). 
         - You MUST use pure HTML tags: <strong>, <em>, <h1>, <h2>, <ul>, <ol>, <li>, and <p>.
         - Example: Write <li><strong>Feature:</strong> description</li> instead of - **Feature**: description.
         - When outputting <div> tags, keep them perfectly flat against the left margin with NO indentation.
      2. STRUCTURED DATA (TABLES): Use standard Markdown Tables for data.
      
      *** MULTIMODAL DOCUMENT WORKFLOW ***
      When creating a full document, you MUST follow this precise 2-Card structure:
      - Immediately begin streaming the content into <DOC> tags following this strict 2-column layout for the Title Card.
      - CRITICAL: You must write a highly descriptive DALL-E image prompt inside the 'alt' attribute of the image tag, and keep title="pending-generation".
      
      <div data-type="card">
        <div data-type="columns">
          <div data-type="column">
            <h1>[H1 Title Based on Subject]</h1>
            <h2>[H2 Short, Punchy Subtitle]</h2>
          </div>
          <div data-type="column">
            <img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[WRITE YOUR DESCRIPTIVE IMAGE PROMPT HERE]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />
          </div>
        </div>
      </div>
      <div data-type="card">
        <p><strong>Standard HTML main content</strong> goes in Card 2. Continue linear writing here using HTML tags like <ul> and <li>...</p>
      </div>
      
      ${GLOBAL_AI_RULES}`,

      inlineEditPrompt: `You are an expert AI copy editor. Your job is to rewrite or modify the specific content of a single document card based on the user's instructions.

      CRITICAL RULES FOR OUTPUTTING TEXT:
      1. PURE HTML FORMATTING: NEVER use Markdown formatting. NO whitespace indentation for tags (TipTap breaks if you indent HTML).
      2. ONLY THE CONTENT: Do NOT output the <DOC> tags or <div data-type="card"> wrapper. ONLY output the inner HTML content.
      3. NO CONVERSATION: Output ONLY the finalized HTML. No conversational filler, no \`\`\`html code blocks.

      DEFAULT FORMATTING (Use this for standard text edits):
      - Use normal HTML tags flowing from top to bottom: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>.
      - Example Output:
      <h1>Main Heading</h1>
      <p>This is a standard paragraph flowing normally.</p>

      CONDITIONAL FORMATTING (Apply ONLY IF specifically requested by the user):

      - IF COLUMNS ARE REQUESTED:
      Use this exact un-indented structure:
<div data-type="columns">
<div data-type="column">
<p>Left side content</p>
</div>
<div data-type="column">
<p>Right side content</p>
</div>
</div>
      
      - IF A TABLE IS REQUESTED:
      Use standard un-indented HTML: <table>, <thead>, <tbody>, <tr>, <th>, and <td>.

      - IF AN IMAGE IS REQUESTED:
      Place the image AT THE VERY END of the card content, strictly below all paragraphs. Use exactly this tag:
<img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[Write a highly descriptive image prompt here]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />`,
    },
    canvasConstraints: { 
      width: '1280px', 
      minHeight: 'auto', 
      padding: '4rem 5rem', // Restored standard padding
      uiMaxWidth: '800px', 
      uiMinHeight: 'auto' // 🚨 FIX: Document cards will now naturally size to their content!
    },
    allowedExports: ['pdf', 'png'],
  },

  // --- 2. THE SOCIAL MEDIA POST ---
  social: {
    id: 'social',
    name: 'Social Media Carousel',
    description: '1:1 square format, optimized for Instagram and LinkedIn.',
    icon: '📱',
    isDisabled: false,
    aiBehavior: {
      temperature: 0.8,
      maxTokens: 500,
      autoSuggestImages: true,
      systemPrompt: `You are a social media copywriter. 
      
      CRITICAL INSTRUCTIONS:
      1. YOU MUST GENERATE EXACTLY ONE (1) CARD. DO NOT create a second card. STOP writing after the first card.
      2. Keep text extremely brief so it fits in a perfect square. Title: Max 8 words. Description: Max 50 words.
      
      You MUST use EXACTLY this HTML template inside the <DOC> tags. Do not add any inline CSS styles. Just fill in the brackets []:
      
      <DOC>
      <div data-type="card">
        <div data-type="columns">
          <div data-type="column">
            <h2>[Your Punchy Title Here]</h2>
            <p>[Your short engaging description or quote (max 50 words) here]</p>
          </div>
          <div data-type="column">
            <img src="https://placehold.co/800x800/f4f4f5/a855f7.png?text=Generating+Artwork...+%E2%9C%A8" alt="[Highly detailed description for the AI image generator]" title="pending-generation" class="w-full h-full object-cover rounded-xl shadow-sm" />
          </div>
        </div>
      </div>
      </DOC>
      
      ${GLOBAL_AI_RULES}`,

      inlineEditPrompt: `You are a viral social media copy editor. 
      CRITICAL RULES:
      1. Revise the text EXACTLY according to the instruction.
      2. Keep it EXTREMELY short and punchy. It must fit in a 1:1 social square.
      3. OUTPUT ONLY THE REVISED TEXT. No conversational filler.
      4. PURE HTML ONLY (NO MARKDOWN). Output valid HTML tags.
      ${INLINE_IMAGE_RULE}`,
    },
    canvasConstraints: { 
      width: '1080px', 
      minHeight: '1080px',
      padding: '0px', 
      uiMaxWidth: '550px', 
      uiMinHeight: '550px' // Social post stays rigidly square
    },
    allowedExports: ['png'], 
  }
};