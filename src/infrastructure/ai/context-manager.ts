export class ContextManager {
  /**
   * Structure system and prompt context cleanly to facilitate Gemini implicit prompt caching.
   * Common static guidelines and system context are placed first.
   */
  public prepareStructuredPrompt(
    systemPrompt: string | undefined,
    userPrompt: string,
    commonProjectContext?: string
  ): { systemInstruction?: string; userPrompt: string } {
    let systemInstruction = systemPrompt || 'You are an expert AI Software Engineering Assistant.';

    if (commonProjectContext && commonProjectContext.trim().length > 0) {
      systemInstruction = `${systemInstruction}\n\n=== COMMON PROJECT CONTEXT ===\n${commonProjectContext.trim()}`;
    }

    return {
      systemInstruction,
      userPrompt,
    };
  }
}
