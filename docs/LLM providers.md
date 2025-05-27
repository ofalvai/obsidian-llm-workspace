# LLM providers

### OpenAI

- ✅ Streaming responses
- ✅ [Prompt caching](https://platform.openai.com/docs/guides/prompt-caching): the amount of cached tokens of a conversation is visible in debug view
- ✅ Embedding: uses `text-embedding-3-small`
- Custom base URL: not yet supported


### Anthropic

- ✅ Streaming responses
- [Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching): not yet supported. Note that it's not a "free lunch", input tokens are 25% more expensive when caching is enabled.

### Ollama

This plugin can optionally use the [Ollama REST API](https://github.com/ollama/ollama/blob/main/docs/api.md).

Make sure to install Ollama and download a few models before using this integration.

Features:

- ✅ Streaming responses
- ✅ Chat and embedding models

### OpenAI-compatible

This provider allows you to connect to any API that implements the OpenAI chat completions and embeddings APIs. 
Examples include self-hosted models, local inference servers, and third-party API providers that follow the OpenAI API specification.

Features:
- ✅ Streaming responses
- ✅ List available models from the server
- ✅ Support for chat completions and embeddings

Requirements:

The API server must implement the following OpenAI API endpoints:
  - GET `/v1/models` - For listing available models
  - POST `/v1/chat/completions` - For chat completions
  - POST `/v1/embeddings` - For embeddings

The `/v1/chat/completions` endpoint must support `response_format: json_object` for some features to work.
