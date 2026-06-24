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

The ClashMac URL returns Clash YAML. The Shadowrocket URL returns a Shadowrocket `.conf` profile with `[Proxy]`, `[Proxy Group]`, and `[Rule]` sections generated from `custom-subscription.private.json`, plus local CF preferred nodes generated directly by the Worker instead of the mixed subscription path.

Shadowrocket rule order is:

1. Your custom Shadowrocket rule set from `rules/shadowrocket/static-hd.list`, mapped to `rules.target`.
2. Johnshall ad-block rules, loaded from your GitHub-hosted `rules/shadowrocket/johnshall-ad-only.list` and mapped to `REJECT`.
3. Johnshall `lazy_group.conf` routing rules, with policy groups such as `AI`, `YOUTUBE`, `TWITTER`, `微软服务`, and `苹果服务`.
4. `FINAL,Proxy`.

This keeps your custom domains at the highest priority, so they override Johnshall categories when both match.

To change the custom Shadowrocket static-IP rules, edit:

```text
rules/shadowrocket/static-hd.list
```

Commit and push the file. Shadowrocket loads it from GitHub Raw through:

```text
RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/static-hd.list,🇺🇸 US-StaticIP-via-HD,no-resolve
```

No Worker deploy is needed for this rule-only change. Run `./deploy.sh` only when changing nodes, policy groups, Clash rules, or other private config.

The compact `rules` block in `custom-subscription.private.json` is still used for ClashMac output and for choosing the Shadowrocket custom rule-set target policy through `rules.target`.

To tune Johnshall category routing, edit `shadowrocket.groupDefaults` in `custom-subscription.private.json`:

```json
{
  "shadowrocket": {
    "groupDefaults": {
      "AI": ["static_hd", "Proxy", "DIRECT"],
      "TWITTER": ["static_hd", "Proxy", "DIRECT"],
      "谷歌服务": ["Proxy", "static_hd", "DIRECT"]
    }
  }
}
```

Values can be node ids from `nodes`, generated group names such as `Proxy`, or built-in policies such as `DIRECT` and `REJECT`.

If a Johnshall policy should be rewritten entirely instead of shown as its own group, use `shadowrocket.policyMap`:

```json
{
  "shadowrocket": {
    "policyMap": {
      "FACEBOOK": "static_hd",
      "游戏平台": "Proxy"
    }
  }
}
```

Johnshall-derived tracked files can be refreshed with:

```bash
node tools/sync-shadowrocket-johnshall-rules.mjs
```

The generated files are derived from `Johnshall/Shadowrocket-ADBlock-Rules-Forever`, licensed under CC BY-SA 4.0.
