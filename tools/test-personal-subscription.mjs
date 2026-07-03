import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
	添加个人节点地址到备注,
	应用个人文本配置,
	读取个人订阅配置,
	准备个人输出,
} from '../worker/personal-output.js';

const MAIN_KEY = 'cla' + 'sh';

test('appends server address to generated node remarks idempotently', () => {
	const config = { enabled: true, appendServerToName: true };

	assert.equal(添加个人节点地址到备注('GoogleDNS', '[2606:4700::1]', config), 'GoogleDNS-2606:4700::1');
	assert.equal(添加个人节点地址到备注('GoogleDNS-1.1.1.1', '1.1.1.1', config), 'GoogleDNS-1.1.1.1');
});

test('empty personal config is inert by default', () => {
	const input = `mode: Rule
proxies:
  - {name: "US-HD", type: vless, server: 198.51.100.20}
rules:
  - MATCH,DIRECT
`;

	assert.equal(添加个人节点地址到备注('GoogleDNS', '1.1.1.1', {}), 'GoogleDNS');
	assert.equal(应用个人文本配置(input, {}), input);
});

test('applies personal main-config proxies, rules, dns, emoji and group default', () => {
	const config = {
		enabled: true,
		[MAIN_KEY]: {
			dns: `dns:
  enable: true
  ipv6: false
`,
			proxies: [
				{
					name: 'US-StaticIP-via-HD',
					yaml: '  - {name: "US-StaticIP-via-HD", type: socks5, server: 192.0.2.30, port: 22324}',
				},
			],
			groups: [
				{
					name: '普通代理',
					type: 'select',
					proxies: ['US-HD', 'CF官方优选*'],
				},
			],
			rules: ['DOMAIN-KEYWORD,openai,US-StaticIP-via-HD,no-resolve'],
			addProxiesToGroups: true,
			groupDefaults: {
				OpenAi: ['US-StaticIP-via-HD'],
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
  - {name: "CF官方优选1", type: vless, server: 203.0.113.100}
proxy-groups:
  - name: OpenAi
    type: select
    proxies:
      - US-HD
      - DIRECT
rules:
  - MATCH,OpenAi
`;

	const output = 应用个人文本配置(input, config);

	assert.match(output, /^dns:\n  enable: true\n  ipv6: false\n/m);
	assert.match(output, /name: "🇺🇸 US-HD"/);
	assert.match(output, /name: "🇺🇸 US-StaticIP-via-HD"/);
	assert.ok(output.indexOf('DOMAIN-KEYWORD,openai,US-StaticIP-via-HD,no-resolve') < output.indexOf('MATCH,OpenAi'));
	assert.match(output, /name: OpenAi\n    type: select\n    proxies:\n      - "🇺🇸 US-StaticIP-via-HD"\n      - "🇺🇸 US-HD"/);
	assert.match(output, /name: "普通代理", type: select, proxies: \["🇺🇸 US-HD", "🇺🇸 CF官方优选1"\]/);
});

test('builds main config directly from personal config and preferred edge nodes', async () => {
	let getCount = 0;
	const env = {
		KV: {
			async get(key) {
				if (key !== 'ADD.txt') return null;
				getCount++;
				return '203.0.113.100:443#CF官方优选1';
			},
		},
	};
	const config_JSON = {
		UUID: 'cf-uuid',
		HOSTS: ['worker.example.com'],
		Fingerprint: 'chrome',
		完整节点路径: '/edge?ed=2560',
		传输协议: 'ws',
		优选订阅生成: {
			本地IP库: {
				随机IP: false,
				随机数量: 16,
				指定端口: -1,
			},
		},
	};
	const deps = {
		获取传输路径参数值: () => '/edge?ed=2560',
		生成随机IP: async () => [['198.51.100.100:443#fallback']],
		整理成数组: async text => String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean),
	};
	const personalConfig = {
		enabled: true,
		appendServerToName: true,
		[MAIN_KEY]: {
			dns: `dns:
  enable: true
  ipv6: false
`,
			proxies: [
				{
					name: 'US-StaticIP-via-HD',
					yaml: '  - {name: "US-StaticIP-via-HD", type: socks5, server: 192.0.2.30, port: 22324}',
				},
			],
			groups: [
				{
					name: 'Proxy',
					type: 'select',
					proxies: ['US-StaticIP-via-HD', 'CF官方优选*', 'DIRECT'],
					use: ['NAT鸡'],
				},
			],
			proxyProviders: [
				{
					name: 'NAT鸡',
					url: 'https://example.com/getsub/nat',
					path: './proxy-providers/nat.yaml',
				},
			],
			rules: ['DOMAIN-SUFFIX,openai.com,US-StaticIP-via-HD'],
		},
	};

	const first = await 准备个人输出({ request: {}, env, config_JSON, 订阅类型: MAIN_KEY, 个人订阅配置: personalConfig, deps });
	const second = await 准备个人输出({ request: {}, env, config_JSON, 订阅类型: MAIN_KEY, 个人订阅配置: personalConfig, deps });

	assert.equal(getCount, 1);
	assert.equal(first.使用主配置, true);
	assert.equal(second.使用主配置, true);
	assert.match(first.内容, /^dns:\n  enable: true\n  ipv6: false\n\nmixed-port: 7890/m);
	assert.match(first.内容, /  - \{name: "CF官方优选1-203\.0\.113\.100", type: vless, server: "203\.0\.113\.100", port: 443, uuid: "cf-uuid"/);
	assert.match(first.内容, /ws-opts: \{path: "\/edge\?ed=2560", headers: \{Host: "worker\.example\.com"\}\}/);
	assert.match(first.内容, /proxy-providers:\n  "NAT鸡":\n    type: http\n    url: "https:\/\/example\.com\/getsub\/nat"/);
	assert.match(first.内容, /proxy-groups:\n  - \{name: "Proxy", type: select, proxies: \["US-StaticIP-via-HD", "CF官方优选1-203\.0\.113\.100", DIRECT\], use: \["NAT鸡"\]\}/);
	assert.match(first.内容, /rules:\n  - DOMAIN-SUFFIX,openai\.com,US-StaticIP-via-HD\n  - MATCH,Proxy/m);
});

test('reads personal config from KV key custom-subscription.json', async () => {
	const env = {
		KV: {
			async get(key) {
				if (key !== 'custom-subscription.json') return null;
				return JSON.stringify({
					enabled: true,
					appendServerToName: true,
					[MAIN_KEY]: {
						rules: ['DOMAIN-KEYWORD,openai,US-StaticIP-via-HD,no-resolve'],
					},
				});
			},
		},
	};

	const config = await 读取个人订阅配置(env);

	assert.equal(config.enabled, true);
	assert.equal(config.appendServerToName, true);
	assert.deepEqual(Array.from(config[MAIN_KEY].rules), ['DOMAIN-KEYWORD,openai,US-StaticIP-via-HD,no-resolve']);
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
	for (const proxy of kvExample[MAIN_KEY].proxies) {
		const match = proxy.yaml.match(/server:\s*([0-9.]+)/);
		assert.ok(match, `KV example proxy ${proxy.name} must contain a server field`);
		assert.ok(isDocumentationIPv4(match[1]), `KV example server ${match[1]} must use a documentation IP`);
	}
});
