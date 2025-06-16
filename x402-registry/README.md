# Hedera API Registry

A CLI tool for managing API endpoint registrations on the Hedera network using topics and consensus messages.

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Setup

Create a `.env` file in the project root with your Hedera credentials:

```bash
# Copy template and edit
cat > .env << 'EOF'
# Hedera Network Configuration
HEDERA_NETWORK=testnet
OPERATOR_ID=0.0.123456
OPERATOR_KEY=your_private_key_here
DIRECTORY_TOPIC_ID=0.0.789012
EOF
```

Edit `.env` and set your Hedera account credentials:

- `OPERATOR_ID` - Your Hedera account ID (format: 0.0.xxxxx)
- `OPERATOR_KEY` - Your account's private key (ECDSA hex format)
- `HEDERA_NETWORK` - Use `testnet` for development, `mainnet` for production

### 3. Create Directory Topic (First Time Setup)

**⚠️ This step is only needed once per registry deployment.**

If you're setting up a new registry, create the directory topic:

```bash
bun run src/cli/registry.ts create-directory
```

This will:

- Create a public topic with 10 HBAR custom fee per submission
- Display the new topic ID
- Provide instructions for updating your `.env` file

Add the returned topic ID to your `.env` file:

```bash
DIRECTORY_TOPIC_ID=0.0.123456
```

If you're joining an existing registry, ask the administrator for the `DIRECTORY_TOPIC_ID`.

### 4. Required Environment Variables

| Variable                   | Description                             | Required | Default         |
| -------------------------- | --------------------------------------- | -------- | --------------- |
| `HEDERA_NETWORK`           | Network to use (`testnet` or `mainnet`) | Yes      | `testnet`       |
| `OPERATOR_ID`              | Your Hedera account ID                  | Yes      | -               |
| `OPERATOR_KEY`             | Your account private key                | Yes      | -               |
| `DIRECTORY_TOPIC_ID`       | Main directory topic ID                 | Yes      | -               |
| `MIRROR_NODE_URL`          | Mirror node API URL                     | No       | Network default |
| `DIRECTORY_SUBMISSION_FEE` | Fee in HBAR for submissions             | No       | `10`            |

## Common Commands

### Development

```bash
# Run the CLI tool
bun run cli

# Build the project
bun run build

# Run tests
bun run test
```

### CLI Usage

```bash
# Add a new API endpoint
bun run cli add-endpoint path/to/endpoint.json

# Update pricing for an endpoint
bun run cli update-price <pointerTopicId> <newPrice>
```

### Direct Bun Commands

```bash
# Run CLI directly
bun run src/cli/registry.ts

# Run with arguments
bun run src/cli/registry.ts add-endpoint sample.json

# Build for distribution
bun build src/cli/registry.ts --outfile dist/registry.js
```

## Project Structure

```
src/
├── cli/
│   └── registry.ts          # CLI entry point
├── lib/
│   └── hederaClient.ts      # Hedera SDK wrapper
├── models/
│   ├── DirectoryEntry.ts    # Directory entry interface
│   └── PointerMessage.ts    # Pointer message interface
├── schemas/
│   ├── directoryEntry.schema.json
│   └── pointerMessage.schema.json
├── validators/
│   └── validateDirectoryEntry.ts
└── helpers/
    └── fetchEndpoints.ts    # Agent SDK helper
```

## Development Notes

- This project uses Bun as the JavaScript runtime
- TypeScript is configured for ES2020 target with strict type checking
- JSON schema validation is implemented using Ajv
- Hedera SDK v2 is used for blockchain interactions
- Environment variables are loaded using dotenv

## Security

⚠️ **Important**: Never commit your `.env` file or real private keys to version control. Always use environment variables for sensitive data.

---

Built with [Bun](https://bun.sh) - A fast all-in-one JavaScript runtime.

# Enhanced API Schema Documentation

## Updated DirectoryEntry Model

The `DirectoryEntry` model has been enhanced to include comprehensive API specification information, addressing the need for request/response schema documentation.

### New Fields Added

#### `request_body` (optional)

For POST/PUT/PATCH endpoints, defines the expected request body:

- `schema`: JSON Schema for the request structure
- `content_type`: MIME type (e.g., "application/json")
- `example`: Example request body

#### `response_schema` (optional)

Defines the expected response structure:

- `schema`: JSON Schema for the response structure
- `content_type`: MIME type (e.g., "application/json")
- `example`: Example response body

#### `parameters` (optional)

Array of query parameters, headers, or path parameters:

- `name`: Parameter name
- `in`: Location ("query", "header", or "path")
- `required`: Whether the parameter is required
- `schema`: JSON Schema for the parameter
- `example`: Example value

#### `authentication` (optional)

Authentication requirements:

- `type`: Authentication type ("none", "api_key", "bearer_token", "basic_auth", "custom")
- `description`: Authentication method description
- `api_key_location`: For API keys - "header" or "query"
- `api_key_name`: For API keys - parameter name

#### `metadata` (optional)

Additional metadata:

- `tags`: Array of category tags
- `rate_limits`: Rate limiting information
- `expected_response_time_ms`: Expected response time
- `version`: API version

### Example Usage

#### POST Endpoint (with request body):

```json
{
  "id": "text-summarizer-api",
  "url": "https://api.example.com/summarize",
  "method": "POST",
  "description": "AI-powered text summarization service",
  "request_body": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "minLength": 10 },
        "max_sentences": { "type": "integer", "minimum": 1 }
      },
      "required": ["text"]
    },
    "example": {
      "text": "Long text to summarize...",
      "max_sentences": 3
    }
  },
  "response_schema": {
    "content_type": "application/json",
    "schema": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" }
      },
      "required": ["summary"]
    }
  }
}
```

#### GET Endpoint (with query parameters):

```json
{
  "id": "weather-api",
  "url": "https://api.example.com/weather",
  "method": "GET",
  "description": "Get weather information",
  "parameters": [
    {
      "name": "city",
      "in": "query",
      "required": true,
      "schema": { "type": "string" },
      "example": "London"
    }
  ]
}
```

This enhanced schema provides all the information clients need to understand how to interact with any API endpoint, including request/response formats, authentication, and usage examples.
