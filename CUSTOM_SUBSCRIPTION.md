# Personal Subscription Configuration

This fork keeps private proxy details out of `_worker.js` and Git history.

Maintain only `custom-subscription.private.json`, generate `custom-subscription.json`, then upload the generated file to the Workers KV key named `custom-subscription.json`.

## Files

- `custom-subscription.simple.example.json`: safe compact template for local editing.
- `custom-subscription.private.json`: your real local config. This file is ignored by Git.
- `custom-subscription.json`: generated KV payload. This file is ignored by Git.
- `wrangler.toml`: public Worker template. Do not put your real KV namespace id here.
- `wrangler.local.toml`: generated local Worker deployment config. This file is ignored by Git.
- `build.sh`: builds the generated KV payload.
- `deploy.sh`: builds and uploads the generated KV payload.
- `tools/build-custom-subscription.mjs`: builds the generated KV payload.
- `tools/deploy-custom-subscription.mjs`: builds and uploads the generated KV payload.
- `tools/write-wrangler-local.mjs`: writes `wrangler.local.toml` from `.env.local`.

## First Setup

```bash
cp custom-subscription.simple.example.json custom-subscription.private.json
```

Edit `custom-subscription.private.json` and replace the placeholder node values.

Put local deployment values in `.env.local`:

```bash
KV_NAMESPACE_ID=<your-kv-namespace-id>
WORKER_HOST=<your-worker-host>
UUID=<your-uuid>
```

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

## Deploy Worker Code

Keep the checked-in `wrangler.toml` public-safe. Generate a local config before deploying Worker code:

```bash
node tools/write-wrangler-local.mjs
npx wrangler deploy --config wrangler.local.toml
```

`wrangler.local.toml` reads `KV_NAMESPACE_ID` from `.env.local` and is ignored by Git.

## Subscription URLs

Use separate outputs for ClashMac and Shadowrocket:

```text
https://<your-domain>/sub?token=<token>&clash
https://<your-domain>/sub?token=<token>&shadowrocket
```

The ClashMac URL returns Clash YAML. The Shadowrocket URL returns a lightweight Shadowrocket `.conf` profile with `[Proxy]`, `[Proxy Group]`, and `[Rule]` sections generated from `custom-subscription.private.json`, plus local CF preferred nodes generated directly by the Worker instead of the mixed subscription path.
