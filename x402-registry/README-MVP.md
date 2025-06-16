# Lean API Registry - MVP Architecture

## Simplified Two-Topic Architecture

The registry uses a clean separation of concerns with two types of topics:

### 1. Directory Topic (Public Discovery)

**Purpose**: Simple endpoint discovery and basic info  
**Content**: Lean `DirectoryEntry` with essential fields only:

- `id`: Unique endpoint identifier
- `url`: Full endpoint URL
- `method`: HTTP verb (GET, POST, etc.)
- `description`: Brief summary
- `pointer_topic_id`: Link to pricing/specs topic
- `initial_price_usdc`: Current price

### 2. Pointer Topics (Pricing + API Specs)

**Purpose**: Current pricing and detailed API specifications  
**Content**: `PointerMessage` includes:

- `price_usdc`: Current price per request
- `version`: Version number (incremented on updates)
- `request_schema`: JSON Schema for request body (POST endpoints)
- `response_schema`: JSON Schema for response format
- `additional_terms`: Optional SLA/quota info

## Why This Architecture?

**✅ Lean Discovery**: Directory entries stay small and focused on discovery  
**✅ Flexible Updates**: API specs and pricing can change independently  
**✅ MVP Focus**: Essential features only, no over-engineering  
**✅ Cost Efficient**: Less data in expensive directory topic submissions

## Example Usage

### Directory Entry (Simple):

```json
{
  "id": "text-summarizer-api",
  "url": "https://api.example.com/summarize",
  "method": "POST",
  "description": "AI-powered text summarization service",
  "pointer_topic_id": "0.0.123456",
  "initial_price_usdc": 0.05
}
```

### Pointer Message (Detailed):

```json
{
  "price_usdc": 0.05,
  "version": 1,
  "request_schema": {
    "schema": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "description": "Text to summarize" },
        "max_sentences": { "type": "integer", "default": 3 }
      },
      "required": ["text"]
    },
    "example": { "text": "Long article...", "max_sentences": 2 }
  },
  "response_schema": {
    "schema": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" }
      },
      "required": ["summary"]
    },
    "example": { "summary": "Concise summary text" }
  }
}
```

This architecture provides complete API information while keeping the registry lean and cost-effective for MVP validation.
