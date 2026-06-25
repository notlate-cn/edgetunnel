# Personal Subscription Configuration

This fork keeps private proxy details out of `_worker.js` and Git history.

Maintain `custom-subscription.private.json`, generate `custom-subscription.json`, then upload the generated file to the Workers KV key named `custom-subscription.json`.

## Files

- `custom-subscription.simple.example.json`: safe compact template for local editing.
- `custom-subscription.private.json`: your real local config. This file is ignored by Git.
- `custom-subscription.json`: generated KV payload. This file is ignored by Git.
- `rules/custom/*.list`: small highest-priority rule lists grouped by business intent.
- `build.sh`: builds the generated KV payload.
- `deploy.sh`: builds and uploads the generated KV payload.
- `wrangler.toml`: public Worker template. Do not put your real KV namespace id here.
- `wrangler.local.toml`: generated local Worker deployment config. This file is ignored by Git.

## First Setup

```bash
cp custom-subscription.simple.example.json custom-subscription.private.json
```

Edit `custom-subscription.private.json` and replace the placeholder node values.

Put deployment values in `.env.local`:

```bash
KV_NAMESPACE_ID=<your-kv-namespace-id>
WORKER_HOST=<your-worker-host>
UUID=<your-uuid>
```

## Custom Rules

Keep your highest-priority custom rules in small lists:

```text
rules/custom/ai.list
rules/custom/social-payment.list
rules/custom/account-services.list
rules/custom/apple.list
```

Reference those lists from `custom-subscription.private.json`:

```json
{
  "rules": {
    "sources": [
      { "target": "AI", "source": "rules/custom/ai.list" },
      { "target": "社交支付", "source": "rules/custom/social-payment.list" },
      { "target": "账号服务", "source": "rules/custom/account-services.list" },
      { "target": "Apple", "source": "rules/custom/apple.list" }
    ]
  }
}
```

The `target` is a business policy group, not a physical node.

Default policy groups:

```text
AI = 静态住宅, 三网优化, 普通代理, DIRECT
社交支付 = 静态住宅, 普通代理, 三网优化, DIRECT
账号服务 = 静态住宅, 三网优化, 普通代理, DIRECT
Google = 三网优化, 普通代理, 静态住宅, DIRECT
YouTube = 普通代理, 三网优化, 静态住宅, DIRECT
流媒体 = 普通代理, 三网优化, 静态住宅, DIRECT
Apple = DIRECT, 三网优化, 普通代理, 静态住宅
Proxy = 普通代理, 三网优化, 静态住宅, DIRECT
静态住宅 = US-StaticIP-via-HD, US-StaticIP-via-TT
三网优化 = US-HD
普通代理 = SP-TT, CF官方优选*
```

Useful placement:

- AI providers and model platforms: `rules/custom/ai.list`
- PayPal-adjacent, Wise, Neverless and social/payment domains: `rules/custom/social-payment.list`
- Cloudflare, HostDare, IPRoyal, Datadog, AdsPower, BrowserLeaks and Auth0-style login domains: `rules/custom/account-services.list`
- Apple and iCloud overrides: `rules/custom/apple.list`

## Build

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
If `.env.local` also contains `WORKER_HOST` and `UUID`, it prints the main-config subscription link after upload.

Dry run:

```bash
./deploy.sh --dry-run
```

The upload command writes the generated value to this KV key:

```text
custom-subscription.json
```

## Deploy Worker Code

Keep the checked-in `wrangler.toml` public-safe. Generate a local config before deploying Worker code:

```bash
node tools/write-wrangler-local.mjs
npx wrangler deploy --config wrangler.local.toml
```

## Subscription URL

```text
https://<your-domain>/sub?token=<token>&clash
```

When personal proxies are configured, the Worker returns main-config YAML directly instead of calling the external subscription converter first. This keeps subscriptions available even when the converter backend rejects a large generated config.

## Rule Order

1. Your classified custom lists under `rules/custom/`.
2. Default AI rule sets, mapped to `AI`.
3. Downloaded category lists, mapped to the business policy groups above.
4. `MATCH,Proxy`.

To inline downloaded category lists at build time, use:

```json
{
  "clash": {
    "expandExternalRuleSets": true
  }
}
```

The public compact example sets `clash.useDefaultRuleSets` to `false` to keep the checked-in generated example small. Remove that field in your private config if you want the default external AI lists included.

After editing any config or list file, run `./deploy.sh` so the generated KV payload is refreshed.
