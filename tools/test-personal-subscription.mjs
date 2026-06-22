import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function loadWorkerExports() {
	const source = readFileSync(new URL('../_worker.js', import.meta.url), 'utf8');
	const instrumented = source.replace('export default {', 'globalThis.__workerDefault = {') + `
globalThis.__testExports = {
	添加个人节点地址到备注,
	应用个人Clash配置,
	读取个人订阅配置,
	获取订阅转换目标,
	订阅类型需要Clash热补丁,
};
`;
	const context = {
		atob,
		btoa,
		console,
		crypto: globalThis.crypto,
		fetch: async () => {
			throw new Error('fetch should not run in unit tests');
		},
		TextDecoder,
		TextEncoder,
		URL,
	};
	vm.runInNewContext(instrumented, context, { filename: '_worker.js' });
	return context.__testExports;
}

test('appends server address to generated node remarks idempotently', () => {
	const { 添加个人节点地址到备注 } = loadWorkerExports();
	const config = { enabled: true, appendServerToName: true };

	assert.equal(添加个人节点地址到备注('GoogleDNS', '[2606:4700::1]', config), 'GoogleDNS-2606:4700::1');
	assert.equal(添加个人节点地址到备注('GoogleDNS-1.1.1.1', '1.1.1.1', config), 'GoogleDNS-1.1.1.1');
});

test('empty personal config is inert by default', () => {
	const { 添加个人节点地址到备注, 应用个人Clash配置 } = loadWorkerExports();
	const input = `mode: Rule
proxies:
  - {name: "US-HD", type: vless, server: 198.51.100.20}
rules:
  - MATCH,DIRECT
`;

	assert.equal(添加个人节点地址到备注('GoogleDNS', '1.1.1.1', {}), 'GoogleDNS');
	assert.equal(应用个人Clash配置(input, {}), input);
});

test('applies personal Clash proxies, rules, dns, emoji and group default', () => {
	const { 应用个人Clash配置 } = loadWorkerExports();
	const config = {
		enabled: true,
		clash: {
			dns: `dns:
  enable: true
  ipv6: false
`,
			proxies: [
				{
					name: '🇺🇸 US-StaticIP-via-HD',
					yaml: '  - {name: "🇺🇸 US-StaticIP-via-HD", type: socks5, server: 192.0.2.30, port: 22324}',
				},
			],
			rules: ['DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve'],
			addProxiesToGroups: true,
			groupDefaults: {
				OpenAi: ['🇺🇸 US-StaticIP-via-HD'],
			},
			emoji: {
				servers: {
					'198.51.100.20': '🇺🇸',
				},
				patterns: [],
			},
		},
	};
	const input = `mode: Rule
proxies:
  - {name: "US-HD", type: vless, server: 198.51.100.20}
proxy-groups:
  - name: OpenAi
    type: select
    proxies:
      - US-HD
      - DIRECT
rules:
  - MATCH,OpenAi
`;

	const output = 应用个人Clash配置(input, config);

	assert.match(output, /^dns:\n  enable: true\n  ipv6: false\n/m);
	assert.match(output, /name: "🇺🇸 US-HD"/);
	assert.match(output, /name: "🇺🇸 US-StaticIP-via-HD"/);
	assert.ok(output.indexOf('DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve') < output.indexOf('MATCH,OpenAi'));
	assert.match(output, /proxy-groups:\n  - name: OpenAi\n    type: select\n    proxies:\n      - "🇺🇸 US-StaticIP-via-HD"\n      - "🇺🇸 US-HD"/);
});

test('reads personal config from KV key custom-subscription.json', async () => {
	const { 读取个人订阅配置 } = loadWorkerExports();
	const env = {
		KV: {
			async get(key) {
				if (key !== 'custom-subscription.json') return null;
				return JSON.stringify({
					enabled: true,
					appendServerToName: true,
					clash: {
						rules: ['DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve'],
					},
				});
			},
		},
	};

	const config = await 读取个人订阅配置(env);

	assert.equal(config.enabled, true);
	assert.equal(config.appendServerToName, true);
	assert.deepEqual(Array.from(config.clash.rules), ['DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve']);
});

function isDocumentationIPv4(ip) {
	return /^192\.0\.2\.\d+$/.test(ip) || /^198\.51\.100\.\d+$/.test(ip) || /^203\.0\.113\.\d+$/.test(ip);
}

test('public custom subscription examples use documentation IP ranges for proxy servers', () => {
	const compactExample = JSON.parse(readFileSync(new URL('../custom-subscription.simple.example.json', import.meta.url), 'utf8'));
	const kvExample = JSON.parse(readFileSync(new URL('../custom-subscription.example.json', import.meta.url), 'utf8'));

	for (const node of Object.values(compactExample.nodes)) {
		assert.ok(isDocumentationIPv4(node.server), `compact example server ${node.server} must use a documentation IP`);
	}
	for (const proxy of kvExample.clash.proxies) {
		const match = proxy.yaml.match(/server:\s*([0-9.]+)/);
		assert.ok(match, `KV example proxy ${proxy.name} must contain a server field`);
		assert.ok(isDocumentationIPv4(match[1]), `KV example server ${match[1]} must use a documentation IP`);
	}
});

test('routes Shadowrocket requests through Clash YAML generation', () => {
	const { 获取订阅转换目标, 订阅类型需要Clash热补丁 } = loadWorkerExports();

	assert.equal(获取订阅转换目标('shadowrocket'), 'clash');
	assert.equal(订阅类型需要Clash热补丁('shadowrocket'), true);
	assert.equal(订阅类型需要Clash热补丁('clash'), true);
	assert.equal(订阅类型需要Clash热补丁('singbox'), false);
});
