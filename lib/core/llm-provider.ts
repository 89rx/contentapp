
export interface ILLMProvider {
    generateStream(prompt: string, context: string, systemInstruction: string): Promise<ReadableStream>;
    editInline(selectedText: string, instruction: string): Promise<string>;
  }
  
  export class GeminiProvider implements ILLMProvider {
    async generateStream(prompt: string, context: string, systemInstruction: string) {
      return new ReadableStream(); 
    }
  
    async editInline(selectedText: string, instruction: string) {
      return "edited text";
    }
  }
  
  // export class OpenAIProvider implements ILLMProvider { ... }