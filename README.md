# xARP (x402 Agent Registry Protocol)

An open-source showcase of how an on-chain AI agent can:

1. Discover x402 pay-walled APIs on a public decentralised registry (powered by the Hedera Consensus Service)
2. Inspect their JSON request / response schema
3. Pay in USDC via the x402 protocol
4. Invoke the endpoint and relay the result back to the user

The codebase is intentionally lean so you can fork it and start hacking in minutes.

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

### 1. Clone Repo

```bash
git clone https://github.com/jaycoolslm/xARP
cd xARP
```

### 2. Launch an Example Pay-Walled API (optional)

```bash
pnpm --filter x402/examples/typescript/servers/express dev
# ➜ http://localhost:4021/weather   – costs $0.001
```

### 3. Add the API to the On-Chain Registry (optional)

```bash
cd x402-registry
cp .env.example .env    # fill OPERATOR_ID, OPERATOR_KEY, DIRECTORY_TOPIC_ID
bun run src/cli/registry.ts add-endpoint local-endpoints/weather-directory-entry.json
```

### 4. Talk to the Agent

```bash
cd agent
cp .env.example .env    # fill OPENAI_API_KEY, CDP_API_KEY_ID, CDP_API_KEY_SECRET
bun run index.ts
```

Try these prompts:

- `list available APIs`
- `get schema for weather-api`
- `call GET /weather with city="London"`

The agent will:

1. Fetch the directory from Hedera (`list-endpoints`).
2. Pull the full schema & current price (`get-endpoint-schema`).
3. Pay via x402 and hit the endpoint – all autonomously.

## Environment Variables

| Component              | Required Vars                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Agent                  | `OPENAI_API_KEY`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `[NETWORK_ID=base-sepolia]` |
| Hedera Registry CLI    | `OPERATOR_ID`, `OPERATOR_KEY`, `DIRECTORY_TOPIC_ID`, `[HEDERA_NETWORK=testnet]`       |
| Example Express Server | `FACILITATOR_URL`, `ADDRESS`                                                          |

See each directory's `.env.example` for exact formats.

## Common Scripts

```bash
# From repo root
pnpm build        # build all TypeScript packages
pnpm test         # unit + integration tests

# Registry helpers
bun run x402-registry/src/cli/registry.ts add-endpoint docs/example-directory-entry.json
bun run x402-registry/src/cli/registry.ts update-price 0.0.123456 0.02
```

## Project Motivation

The architecture follows the PRDs in [`tasks/`](tasks/) which describe:

- A Hedera-based API Registry MVP – lightweight two-topic design.
- A Registry Query Action Provider – enabling in-chat API discovery for the agent.

Happy hacking 🚀
