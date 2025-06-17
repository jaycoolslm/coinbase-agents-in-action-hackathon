# xARP (x402 Agent Registry Protocol)

An open-source showcase of how an on-chain AI agent can:

1. Discover x402 pay-walled APIs on a public decentralised registry (powered by the Hedera Consensus Service)
2. Inspect their JSON request / response schema
3. Pay in USDC via the x402 protocol
4. Invoke the endpoint and relay the result back to the user

Check out the [demo](https://vimeo.com/1093992082/27cd96e5c6?share=copy).

## Repository at a Glance

• `agent/` – Chat-style CLI powered by Coinbase AgentKit.  
 – Includes `registryQueryActionProvider` so the agent can `list-endpoints` & `get-endpoint-schema` before using `x402ActionProvider` to call the API.

• `x402-registry/` – CLI + helpers.  
 – Publish new API Directory Entries to registry (`add-endpoint`).  
 – Update pricing or req / res schema (`update-price`).  
 – Fetch endpoints / latest price from the mirror node.

• `x402/` – Reference implementation of the x402 paywall protocol plus demo servers & clients (see `examples/typescript/servers/express`).

• `tasks/` – Product Requirement Docs (PRDs) that drove the build. Skim them for deeper context.

## Quick Start (≈5 min)

### 1. Clone Repo and Install Dependencies

```bash
git clone https://github.com/jaycoolslm/xARP
cd xARP
npm run setup
```

### 2. Setup x402 Registry

#### 2. a) Add .env variables

Create Hedera Testnet Account at the [Hedera Portal](https://portal.hedera.com).

```bash
cd x402-registry
cp .env.example .env
# add your keys etc here
```

#### 2. b) Run CLI Commands

```bash
# create topic to act as the registry
bun run src/cli/registry.ts create-directory
# add output Registry Topic ID into .env

# add an endpoint to the registry (this costs a fee)
# this command adds an x402 server we will run later on
bun run src/cli/registry.ts add-endpoint local-endpoints/summarise-directory-entry.json

# add a price and req / res schema to the endpoint
bun run src/cli/registry.ts update-price ${topic ID from recent command} ${USDC price} local-endpoints/summarise-pointer-message.json
```

Check the created Topic IDs on https://hashscan.io/testnet

### 3. Launch an Example Pay-Walled API (optional)

#### 3. a) Add .env variables

Fill in .env vars from .env-local in `/x402/examples/typescript/servers/express`

NOTE: an Amazon Bedrock account with claude-3.5-sonnet is needed to run the server, as there is a summarisation endpoint

#### 3. b) Run server

```bash
# from root dir
npm run x402-server
```

### 4. Talk to the Agent

NOTE: You must add the DIRECTORY_TOPIC_ID from the previous step here

````bash
```sdbash
cp .env.example .env    # fill OPENAI_API_KEY, CDP_API_KEY_ID, CDP_API_KEY_SECRET, DIRECTORY_TOPIC_ID
bun run index.ts
````

``
Try these prompts:

- `What endpoints are available?`
- `Summarise this "hello my name is Jay, I live in England, and I love Web3`

The agent will:

1. Fetch the directory from Hedera (`list-endpoints`).
2. Pull the full schema & current price (`get-endpoint-schema`).
3. Pay via x402 and hit the endpoint – all autonomously.

## Environment Variables

| Component              | Required Vars                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Agent                  | `OPENAI_API_KEY`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `DIRECTORY_TOPIC_ID`, `[NETWORK_ID=base-sepolia]` |
| Hedera Registry CLI    | `OPERATOR_ID`, `OPERATOR_KEY`, `DIRECTORY_TOPIC_ID`, `[HEDERA_NETWORK=testnet]`                             |
| Example Express Server | `FACILITATOR_URL`, `ADDRESS`                                                                                |

See each directory's `.env.example` for exact formats.

## Project Motivation

The architecture follows the PRDs in [`tasks/`](tasks/) which describe:

- A Hedera-based API Registry MVP – lightweight two-topic design.
- A Registry Query Action Provider – enabling in-chat API discovery for the agent.
