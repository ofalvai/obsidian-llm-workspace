# LLM providers

### OpenAI
- ✅ Streaming responses
- ✅ [Prompt caching](https://platform.openai.com/docs/guides/prompt-caching): the amount of cached tokens of a conversation is visible in debug view
- ✅ Embedding: uses `text-embedding-3-small`
- Custom base URL: not yet supported


### Anthropic
- ✅ Streaming responses
- [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching): not yet supported. Note that it's not a "free lunch", input tokens are 25% more expensive when caching is enabled.