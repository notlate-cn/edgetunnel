# Personal Subscription Configuration

This fork keeps private proxy details out of `_worker.js` and Git history.

Maintain only `custom-subscription.private.json`, generate `custom-subscription.json`, then upload the generated file to the Workers KV key named `custom-subscription.json`.

## Files

- `custom-subscription.simple.example.json`: safe compact template for local editing.
- `custom-subscription.private.json`: your real local config. This file is ignored by Git.
- `custom-subscription.json`: generated KV payload. This file is ignored by Git.
- `build.sh`: builds the generated KV payload.
- `deploy.sh`: builds and uploads the generated KV payload.
- `tools/build-custom-subscription.mjs`: builds the generated KV payload.
- `tools/deploy-custom-subscription.mjs`: builds and uploads the generated KV payload.

## First Setup

```bash
cp custom-subscription.simple.example.json custom-subscription.private.json
```

Edit `custom-subscription.private.json` and replace the placeholder node values.

Keep references inside `rules` and `groupDefaults` as node ids:

```json
{
  "rules": {
    "target": "static_hd",
    "domainKeyword": ["openai", "chatgpt"]
  },
  "groupDefaults": {
    "OpenAi": ["static_hd"],
    "美国节点": ["hd"]
  }
}
```

The builder resolves those ids to final Clash proxy names, such as `🇺🇸 US-StaticIP-via-HD`.

## Generate Only

```bash
./build.sh
```

Equivalent explicit form:

```bash
./build.sh custom-subscription.private.json custom-subscription.json
```

## Upload To KV

```bash
./deploy.sh
```

The default command reads `custom-subscription.private.json` and `KV_NAMESPACE_ID` from `.env.local`.
If `.env.local` also contains `WORKER_HOST` and `UUID`, it prints ClashMac and Shadowrocket subscription links after upload.

Dry run:

```bash
./deploy.sh --dry-run
```

You can also override the defaults:

```bash
./deploy.sh custom-subscription.private.json --namespace-id <KV_NAMESPACE_ID>
```

The upload command writes the generated value to:

```text
custom-subscription.json
```

inside the KV namespace bound to the Worker as `KV`.

`deploy.sh` uploads to the remote Cloudflare KV by default. For local Wrangler KV debugging, pass `--local`.

## Subscription URLs

Use Clash YAML output for both clients:

```text
https://<your-domain>/sub?token=<token>&clash
https://<your-domain>/sub?token=<token>&shadowrocket
```

The Shadowrocket URL is mapped to Clash YAML by this fork.
