// lib/core/llm-provider.ts

// 1. The Interface
export interface ILLMProvider {
    generateStream(prompt: string, context: string, systemInstruction: string): Promise<ReadableStream>;
    editInline(selectedText: string, instruction: string): Promise<string>;
  }
  
  // 2. The Implementation (Example: What your Gemini class would look like)
  export class GeminiProvider implements ILLMProvider {
    async generateStream(prompt: string, context: string, systemInstruction: string) {
      // Google AI SDK logic goes here...
      return new ReadableStream(); 
    }
  
    async editInline(selectedText: string, instruction: string) {
      // Google AI SDK edit logic...
      return "edited text";
    }
  }
  
  // If they asked for OpenAI tomorrow, you just write:
  // export class OpenAIProvider implements ILLMProvider { ... }