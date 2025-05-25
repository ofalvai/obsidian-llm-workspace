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

This provider allows connecting to an API that offers OpenAI-compatible LLM APIs, served by arbitrary models.

Features:

- ✅ Streaming responses
- ✅ Chat and embedding models
- ✅ Custom base URL

Configuration:

- Server URL: The base URL of the OpenAI-compatible API.
- API Key: The access token for the OpenAI-compatible API.

To configure the OpenAI-compatible provider, go to the plugin settings and enter the Server URL and API Key. You can then list available models and select one for use.
