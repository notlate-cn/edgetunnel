# Personal Subscription Configuration

This fork keeps private proxy details out of `_worker.js` and Git history.

Maintain only `custom-subscription.private.json`, generate `custom-subscription.json`, then upload the generated file to the Workers KV key named `custom-subscription.json`.

## Files

- `custom-subscription.simple.example.json`: safe compact template for local editing.
- `custom-subscription.private.json`: your real local config. This file is ignored by Git.
- `custom-subscription.json`: generated KV payload. This file is ignored by Git.
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
node tools/build-custom-subscription.mjs
```

Equivalent explicit form:

```bash
node tools/build-custom-subscription.mjs custom-subscription.private.json custom-subscription.json
```

## Upload To KV

```bash
node tools/deploy-custom-subscription.mjs custom-subscription.private.json --namespace-id <KV_NAMESPACE_ID>
```

Dry run:

```bash
node tools/deploy-custom-subscription.mjs custom-subscription.private.json --namespace-id <KV_NAMESPACE_ID> --dry-run
```

The upload command writes the generated value to:

```text
custom-subscription.json
```

inside the KV namespace bound to the Worker as `KV`.

## Subscription URLs

Use Clash YAML output for both clients:

```text
https://<your-domain>/sub?token=<token>&clash
https://<your-domain>/sub?token=<token>&shadowrocket
```

The Shadowrocket URL is mapped to Clash YAML by this fork.
