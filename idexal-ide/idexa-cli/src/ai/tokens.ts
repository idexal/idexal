import { ChatMessage } from './provider';

export class TokenCounter {
  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly MAX_TOKENS = 128000;

  static count(messages: ChatMessage[]): number {
    let total = 0;
    
    for (const message of messages) {
      total += this.estimateTokens(message.content);
      total += 4;
    }
    
    total += 2;
    
    return total;
  }

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  static remaining(messages: ChatMessage[]): number {
    return Math.max(0, this.MAX_TOKENS - this.count(messages));
  }

  static canFit(messages: ChatMessage[], additionalText: string): boolean {
    const currentTokens = this.count(messages);
    const additionalTokens = this.estimateTokens(additionalText);
    return (currentTokens + additionalTokens) <= this.MAX_TOKENS;
  }

  static truncateToFit(messages: ChatMessage[], maxTokens: number = 100000): ChatMessage[] {
    let totalTokens = this.count(messages);
    
    if (totalTokens <= maxTokens) {
      return messages;
    }

    const truncated = [...messages];
    
    while (truncated.length > 1 && totalTokens > maxTokens) {
      const removed = truncated.shift();
      if (removed) {
        totalTokens -= this.estimateTokens(removed.content) + 4;
      }
    }
    
    return truncated;
  }
}
