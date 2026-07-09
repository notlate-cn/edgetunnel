# 个人订阅配置

这个 fork 的目标是把私人代理信息从 `_worker.js` 和 Git 历史中拆出来。

日常维护流程是：编辑 `custom-subscription.private.json`，生成 `custom-subscription.json`，再把生成结果上传到 Workers KV 的 `custom-subscription.json` 这个 key。

## 文件说明

- `custom-subscription.simple.example.json`：可提交到仓库的精简示例配置。
- `custom-subscription.private.json`：你的真实本地配置，已被 Git 忽略。
- `custom-subscription.json`：生成后的 KV 负载，已被 Git 忽略。
- `rules/custom/*.list`：按业务意图拆分的最高优先级自定义规则列表。
- `build.sh`：生成 KV 负载。
- `deploy.sh`：生成并上传 KV 负载。
- `wrangler.toml`：公开安全的 Worker 模板，不要把真实 KV namespace id 写进去。
- `wrangler.local.toml`：本地生成的 Worker 部署配置，已被 Git 忽略。

## 首次配置

```bash
cp custom-subscription.simple.example.json custom-subscription.private.json
```

编辑 `custom-subscription.private.json`，把示例节点里的占位值替换成你的真实配置。

部署相关变量放到 `.env.local`：

```bash
KV_NAMESPACE_ID=<your-kv-namespace-id>
WORKER_HOST=<your-worker-host>
UUID=<your-uuid>
```

## 自定义规则

最高优先级规则建议拆成多个小列表：

```text
rules/custom/ai.list
rules/custom/social-payment.list
rules/custom/account-services.list
rules/custom/multi-country.list
rules/custom/proxy.list
rules/custom/apple.list
rules/custom/direct.list
rules/custom/fake-ip-filter.list
```

路由规则列表只写“不带策略组”的规则行，例如 `DOMAIN-SUFFIX,example.com` 或 `DOMAIN-KEYWORD,example`。DNS fake-ip filter 列表只写域名匹配模式，例如 `example.com` 或 `*.example.com`。

在 `custom-subscription.private.json` 中引用这些列表：

```json
{
  "dns": {
    "fakeIpFilterSource": "rules/custom/fake-ip-filter.list"
  },
  "rules": {
    "sources": [
      { "target": "DIRECT", "source": "rules/custom/direct.list", "noResolve": false },
      { "target": "AI", "source": "rules/custom/ai.list" },
      { "target": "社交支付", "source": "rules/custom/social-payment.list" },
      { "target": "账号服务", "source": "rules/custom/account-services.list" },
      { "target": "多国代理", "source": "rules/custom/multi-country.list" },
      { "target": "普通代理", "source": "rules/custom/proxy.list" },
      { "target": "Apple", "source": "rules/custom/apple.list" }
    ]
  }
}
```

`target` 是业务策略组，不是某个具体节点。

新增路由列表的步骤：

1. 在 `rules/custom/` 下新建文件，例如 `rules/custom/bank.list`。
2. 在文件里写不带策略组的规则，例如 `DOMAIN-SUFFIX,examplebank.com`。
3. 在 `rules.sources` 里加一行，指定这个列表应该走哪个策略组：

```json
{ "target": "DIRECT", "source": "rules/custom/bank.list", "noResolve": false }
```

只有明确希望生成规则不带 `no-resolve` 时才加 `noResolve: false`，通常用于直连的软件源、系统域名、网络服务域名。普通代理分组一般省略它，构建器会自动加 `no-resolve`。

默认策略组：

```text
AI = 静态住宅, 三网优化, 普通代理, DIRECT
社交支付 = 静态住宅, 普通代理, 三网优化, DIRECT
账号服务 = 静态住宅, 三网优化, 普通代理, DIRECT
Google = 三网优化, 普通代理, 静态住宅, DIRECT
YouTube = 普通代理, 三网优化, 静态住宅, DIRECT
流媒体 = 普通代理, 三网优化, 静态住宅, DIRECT
Apple = 静态住宅, DIRECT, 三网优化, 普通代理
Proxy = 普通代理, 三网优化, 静态住宅, DIRECT
静态住宅 = US-StaticIP-via-HD, US-StaticIP-via-TT
三网优化 = US-HD
普通代理 = SP-TT, CF官方优选*
多国代理 = 外部 provider 多地区节点
```

各列表用途：

- `rules/custom/ai.list`：AI 服务、模型平台等，走 `AI`。
- `rules/custom/social-payment.list`：PayPal、Wise、Neverless、社交支付类域名，走 `社交支付`。
- `rules/custom/account-services.list`：Cloudflare、HostDare、IPRoyal、Datadog、AdsPower、BrowserLeaks、Auth0 等账号/风控相关域名，走 `账号服务`。
- `rules/custom/multi-country.list`：适合走外部多地区 provider 的域名，走 `多国代理`。
- `rules/custom/proxy.list`：需要避开宽泛广告误杀、但只走普通代理池的域名，走 `普通代理`。
- `rules/custom/apple.list`：Apple、iCloud 覆盖规则，走 `Apple`。
- `rules/custom/direct.list`：必须真实 DNS 解析且直连的域名，例如系统软件源，走 `DIRECT`。
- `rules/custom/fake-ip-filter.list`：必须返回真实 DNS 结果、不走 fake-ip 的域名；它不是路由规则。

本地私有列表可以使用 `*.private.list` 后缀，例如 `rules/custom/fake-ip-filter.private.list`。这些文件已被 Git 忽略。

## DNS Fake IP Filter

需要返回真实 DNS 结果、不能返回 fake-ip 的域名，放到：

```text
rules/custom/fake-ip-filter.list
```

配置中这样引用：

```json
{
  "dns": {
    "fakeIpFilterSource": "rules/custom/fake-ip-filter.list"
  }
}
```

如果还需要本地私有补充列表，可以使用多个来源：

```json
{
  "dns": {
    "fakeIpFilterSources": [
      "rules/custom/fake-ip-filter.list",
      "rules/custom/fake-ip-filter.private.list"
    ]
  }
}
```

这和路由规则是两件事。`fake-ip-filter` 只决定 DNS 是否返回真实 IP；如果这些域名也要直连，还要把它们放到 `DIRECT` 对应的路由列表里。

## 远程代理 Provider

外部订阅 URL 放在 `custom-subscription.private.json`，不要提交到 Git：

```json
{
  "clash": {
    "proxyProviders": [
      {
        "name": "NAT鸡",
        "url": "https://example.com/getsub/nat",
        "path": "./proxy-providers/nat.yaml"
      },
      {
        "name": "机场聚合",
        "url": "https://example.com/getsub/collection",
        "path": "./proxy-providers/collection.yaml"
      }
    ],
    "groups": [
      {
        "name": "多国代理",
        "proxies": []
      }
    ],
    "groupProviderUses": {
      "普通代理": [
        "NAT鸡",
        "机场聚合"
      ],
      "多国代理": [
        "NAT鸡",
        "机场聚合"
      ]
    }
  }
}
```

`proxyProviders` 会渲染成 Clash/Mihomo 的 `proxy-providers`；`groupProviderUses` 会通过 `use` 把 provider 名称追加到指定策略组。像 `多国代理` 这种只靠 provider 填充的分组，需要在 `groups` 里显式创建。

## 构建

```bash
./build.sh
```

等价的显式写法：

```bash
./build.sh custom-subscription.private.json custom-subscription.json
```

## 上传到 KV

```bash
./deploy.sh
```

默认命令会读取 `custom-subscription.private.json`，并从 `.env.local` 读取 `KV_NAMESPACE_ID`。
如果 `.env.local` 同时包含 `WORKER_HOST` 和 `UUID`，上传后会打印 main-config 订阅链接。

只演练不上传：

```bash
./deploy.sh --dry-run
```

上传命令会把生成结果写到这个 KV key：

```text
custom-subscription.json
```

## 部署 Worker 代码

仓库里的 `wrangler.toml` 要保持公开安全。部署 Worker 代码前，先生成本地配置：

```bash
node tools/write-wrangler-local.mjs
npx wrangler deploy --config wrangler.local.toml
```

## 订阅 URL

```text
https://<your-domain>/sub?token=<token>&clash
```

配置了个人代理后，Worker 会直接返回 main-config YAML，不再先调用外部订阅转换后端。这样即使转换后端拒绝过大的配置，订阅也能继续可用。

## 规则顺序

1. `rules/custom/` 下的自定义分类列表。
2. 默认 AI 规则集，映射到 `AI`。
3. 下载的分类规则列表，映射到上面定义的业务策略组。
4. `MATCH,Proxy`。

构建时内联下载的分类规则列表，可以使用：

```json
{
  "clash": {
    "expandExternalRuleSets": true
  }
}
```

公开的精简示例配置里设置了 `clash.useDefaultRuleSets: false`，目的是让提交到仓库的生成示例尽量小。如果你的私有配置想启用默认外部 AI 规则列表，移除这个字段即可。

每次修改配置或 list 文件后，运行 `./deploy.sh`，刷新生成的 KV 负载并上传。
