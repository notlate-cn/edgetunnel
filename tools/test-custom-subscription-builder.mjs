import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { buildCustomSubscription } from './custom-subscription-builder.mjs';

function isDocumentationIPv4(ip) {
	return /^192\.0\.2\.\d+$/.test(ip) || /^198\.51\.100\.\d+$/.test(ip) || /^203\.0\.113\.\d+$/.test(ip);
}

const SIMPLE_CONFIG = {
	enabled: true,
	appendServerToName: true,
	nodes: {
		tt: {
			type: 'vless-reality',
			flag: '🇸🇬',
			name: 'SP-TT',
			server: '203.0.113.10',
			port: 443,
			uuid: 'YOUR-TT-UUID',
			servername: 'www.microsoft.com',
			publicKey: 'YOUR-TT-PUBLIC-KEY',
			shortId: 'abcd',
		},
		hd: {
			type: 'vless-reality',
			flag: '🇺🇸',
			name: 'US-HD',
			server: '198.51.100.20',
			port: 443,
			uuid: 'YOUR-HD-UUID',
			servername: 'addons.mozilla.org',
			publicKey: 'YOUR-HD-PUBLIC-KEY',
			shortId: '',
			clientFingerprint: 'firefox',
			smux: {
				enabled: false,
				protocol: 'h2mux',
				padding: false,
				maxConnections: '8',
				minStreams: '16',
				statistic: true,
				onlyTcp: false,
			},
			brutal: {
				enabled: false,
				up: '1000 Mbps',
				down: '1000 Mbps',
			},
		},
		static_hd: {
			type: 'socks5-chain',
			flag: '🇺🇸',
			name: 'US-StaticIP-via-HD',
			server: '192.0.2.30',
			port: 22324,
			username: 'SOCKS-USER',
			password: 'SOCKS-PASS',
			dialer: 'hd',
		},
	},
	rules: {
		target: 'static_hd',
		domainSuffix: ['x.com', 't.co'],
		domainKeyword: ['openai', 'chatgpt'],
		raw: ['DOMAIN-SUFFIX,example.test,static_hd,no-resolve'],
	},
	groupDefaults: {
		OpenAi: ['static_hd'],
		'美国节点': ['hd'],
		'手动切换': ['static_hd', 'hd'],
	},
};

test('builds full KV config from compact node ids', () => {
	const output = buildCustomSubscription(SIMPLE_CONFIG);

	assert.equal(output.enabled, true);
	assert.equal(output.appendServerToName, true);
	assert.match(output.clash.dns, /^dns:\n  enable: true\n/m);
	assert.match(output.clash.dns, /fake-ip-range: 198\.18\.0\.1\/16/);
	assert.equal(output.clash.addProxiesToGroups, true);

	assert.deepEqual(output.clash.proxies.map(proxy => proxy.name), [
		'🇸🇬 SP-TT-203.0.113.10',
		'🇺🇸 US-HD-198.51.100.20',
		'🇺🇸 US-StaticIP-via-HD',
	]);
	assert.match(output.clash.proxies[1].yaml, /client-fingerprint: firefox/);
	assert.match(output.clash.proxies[1].yaml, /smux: \{enabled: false, protocol: "h2mux"/);
	assert.match(output.clash.proxies[2].yaml, /dialer-proxy: "🇺🇸 US-HD-198\.51\.100\.20"/);
	assert.match(output.clash.proxies[2].yaml, /username: "SOCKS-USER"/);
	assert.equal(output.shadowrocket.links.length, 3);
	assert.match(output.shadowrocket.links[0], /^vless:\/\/YOUR-TT-UUID@203\.0\.113\.10:443\?/);
	assert.match(output.shadowrocket.links[0], /security=reality/);
	assert.match(output.shadowrocket.links[0], /pbk=YOUR-TT-PUBLIC-KEY/);
	assert.match(output.shadowrocket.links[1], /fp=firefox/);
	assert.match(output.shadowrocket.links[2], /^socks5:\/\/SOCKS-USER:SOCKS-PASS@192\.0\.2\.30:22324#/);
	assert.equal(output.shadowrocket.proxies.length, 3);
	assert.match(output.shadowrocket.proxies[0], /^🇸🇬 SP-TT-203\.0\.113\.10=vless,203\.0\.113\.10,443,password=YOUR-TT-UUID,tls=true/);
	assert.match(output.shadowrocket.proxies[0], /pbk=YOUR-TT-PUBLIC-KEY/);
	assert.match(output.shadowrocket.proxies[2], /^🇺🇸 US-StaticIP-via-HD=socks5,192\.0\.2\.30,22324,SOCKS-USER,SOCKS-PASS/);
	assert.equal(output.shadowrocket.rules[0], 'RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/static-hd.list,🇺🇸 US-StaticIP-via-HD,no-resolve');
	assert.ok(!output.shadowrocket.rules.some(rule => rule.startsWith('DOMAIN-SUFFIX,x.com,')));
	assert.ok(!output.shadowrocket.rules.some(rule => rule.startsWith('DOMAIN-KEYWORD,openai,')));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/iab0x00/ProxyRules/main/Rule/AI.txt,静态住宅'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Telegram/Telegram.list,静态住宅'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/PayPal/PayPal.list,静态住宅'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Twitter/Twitter.list,静态住宅'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,Proxy'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/GitHub/GitHub.list,Proxy'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,Google'));
	assert.ok(!output.shadowrocket.rules.some(rule => rule.includes('/QuantumultX/')));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list,DIRECT'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/BiliBili/BiliBili.list,DIRECT'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/WeChat/WeChat.list,DIRECT'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Global/Global.list,Proxy'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China.list,DIRECT'));
	assert.ok(output.shadowrocket.rules.includes('GEOIP,CN,DIRECT'));
	assert.equal(output.shadowrocket.rules[1], 'RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/johnshall-ad-only.list,REJECT');
	assert.ok(!output.shadowrocket.rules.some(rule => /^FINAL,/i.test(rule)));
	assert.deepEqual(output.shadowrocket.ruleSets, []);
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === 'Google'), {
		name: 'Google',
		type: 'select',
		proxies: ['三网优化', '普通代理', '静态住宅', 'DIRECT'],
	});
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === 'Proxy'), {
		name: 'Proxy',
		type: 'select',
		proxies: ['普通代理', '三网优化', '静态住宅', 'DIRECT'],
	});

	assert.deepEqual(output.clash.rules, [
		'DOMAIN-SUFFIX,x.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,t.co,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-KEYWORD,chatgpt,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,example.test,🇺🇸 US-StaticIP-via-HD,no-resolve',
	]);
	assert.deepEqual(output.clash.groupDefaults, {
		OpenAi: ['🇺🇸 US-StaticIP-via-HD'],
		'美国节点': ['🇺🇸 US-HD-198.51.100.20'],
		'手动切换': ['🇺🇸 US-StaticIP-via-HD', '🇺🇸 US-HD-198.51.100.20'],
	});
	assert.equal(output.clash.emoji.servers['198.51.100.20'], '🇺🇸');
	assert.ok(output.clash.emoji.patterns.some(pattern => pattern.flag === '🇯🇵'));
});

test('default emoji patterns cover common countries and regions broadly', () => {
	const output = buildCustomSubscription(SIMPLE_CONFIG);
	const patterns = output.clash.emoji.patterns;

	assert.ok(patterns.length >= 200);
	for (const [sample, flag] of [
		['德国 DE Frankfurt', '🇩🇪'],
		['France Paris', '🇫🇷'],
		['英国 UK London', '🇬🇧'],
		['俄罗斯 RU Moscow', '🇷🇺'],
		['India IN Mumbai', '🇮🇳'],
		['Brazil BR Sao Paulo', '🇧🇷'],
		['Australia AU Sydney', '🇦🇺'],
		['阿联酋 UAE Dubai', '🇦🇪'],
		['土耳其 TR Istanbul', '🇹🇷'],
		['越南 VN Hanoi', '🇻🇳'],
		['泰国 TH Bangkok', '🇹🇭'],
		['马来西亚 MY Kuala Lumpur', '🇲🇾'],
		['菲律宾 PH Manila', '🇵🇭'],
		['印度尼西亚 ID Jakarta', '🇮🇩'],
		['加拿大 CA Toronto', '🇨🇦'],
		['台湾 TW Taipei', '🇹🇼'],
		['香港 HK', '🇭🇰'],
		['澳门 MO', '🇲🇴'],
	]) {
		const matched = patterns.find(pattern => new RegExp(pattern.match, 'i').test(sample));
		assert.equal(matched?.flag, flag, sample);
	}
});

test('allows overriding Shadowrocket Johnshall policy routing', () => {
	const output = buildCustomSubscription({
		...SIMPLE_CONFIG,
		shadowrocket: {
			useJohnshallAdBlock: false,
			policyMap: {
				FACEBOOK: 'static_hd',
				YOUTUBE: 'static_hd',
			},
		},
	});

	assert.deepEqual(output.shadowrocket.ruleSets, []);
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Facebook/Facebook.list,🇺🇸 US-StaticIP-via-HD'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,🇺🇸 US-StaticIP-via-HD'));
});

test('can still inline custom Shadowrocket rules when requested', () => {
	const output = buildCustomSubscription({
		...SIMPLE_CONFIG,
		shadowrocket: {
			inlineCustomRules: true,
			useJohnshallAdBlock: false,
			useJohnshallLazyGroup: false,
		},
	});

	assert.deepEqual(output.shadowrocket.rules, [
		'DOMAIN-SUFFIX,x.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,t.co,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-KEYWORD,openai,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-KEYWORD,chatgpt,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,example.test,🇺🇸 US-StaticIP-via-HD,no-resolve',
	]);
});

test('builds Clash and Shadowrocket custom rules from one source list', () => {
	const output = buildCustomSubscription({
		...SIMPLE_CONFIG,
		rules: {
			target: 'static_hd',
			source: 'rules/shadowrocket/static-hd.list',
		},
		shadowrocket: {
			useJohnshallAdBlock: false,
			useJohnshallLazyGroup: false,
		},
	});

	assert.deepEqual(output.clash.rules.slice(0, 4), [
		'DOMAIN-SUFFIX,gemini.gstatic.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,argotunnel.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,cloudflare.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
		'DOMAIN-SUFFIX,cloudflarebridge.com,🇺🇸 US-StaticIP-via-HD,no-resolve',
	]);
	assert.equal(output.clash.rules.length, 16);
	assert.deepEqual(output.shadowrocket.rules, [
		'RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/static-hd.list,🇺🇸 US-StaticIP-via-HD,no-resolve',
	]);
});

test('builds three proxy pools and routes Google separately from YouTube', () => {
	const output = buildCustomSubscription({
		...SIMPLE_CONFIG,
		nodes: {
			...SIMPLE_CONFIG.nodes,
			static_tt: {
				type: 'socks5-chain',
				flag: '🇺🇸',
				name: 'US-StaticIP-via-TT',
				server: '192.0.2.31',
				port: 22324,
				username: 'SOCKS-USER',
				password: 'SOCKS-PASS',
				dialer: 'tt',
			},
		},
		rules: {
			target: '静态住宅',
			source: 'rules/shadowrocket/static-hd.list',
		},
	});

	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === '静态住宅'), {
		name: '静态住宅',
		type: 'select',
		proxies: ['🇺🇸 US-StaticIP-via-HD', '🇺🇸 US-StaticIP-via-TT'],
	});
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === '三网优化'), {
		name: '三网优化',
		type: 'select',
		proxies: ['🇺🇸 US-HD-198.51.100.20'],
	});
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === '普通代理'), {
		name: '普通代理',
		type: 'select',
		proxies: ['🇸🇬 SP-TT-203.0.113.10', 'CF官方优选*'],
	});
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === 'Google'), {
		name: 'Google',
		type: 'select',
		proxies: ['三网优化', '普通代理', '静态住宅', 'DIRECT'],
	});
	assert.deepEqual(output.shadowrocket.groups.find(group => group.name === 'Proxy'), {
		name: 'Proxy',
		type: 'select',
		proxies: ['普通代理', '三网优化', '静态住宅', 'DIRECT'],
	});
	assert.equal(output.shadowrocket.rules[0], 'RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/static-hd.list,静态住宅,no-resolve');
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,Google'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,Proxy'));
	assert.ok(output.shadowrocket.rules.includes('RULE-SET,https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/johnshall-ad-only.list,REJECT'));
	assert.deepEqual(output.clash.groups.find(group => group.name === '普通代理'), {
		name: '普通代理',
		type: 'select',
		proxies: ['🇸🇬 SP-TT-203.0.113.10', 'CF官方优选*'],
	});
	assert.equal(output.clash.rules[0], 'DOMAIN-SUFFIX,gemini.gstatic.com,静态住宅,no-resolve');
}
);

test('expands downloaded Shadowrocket rule sets into Clash rules when enabled', () => {
	const output = buildCustomSubscription({
		...SIMPLE_CONFIG,
		clash: {
			expandShadowrocketRuleSets: true,
		},
	}, {
		ruleSetContents: {
			'https://raw.githubusercontent.com/iab0x00/ProxyRules/main/Rule/AI.txt': [
				'DOMAIN-SUFFIX,openai.com',
				'USER-AGENT,OpenAI*',
			].join('\n'),
			'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Twitter/Twitter.list': [
				'DOMAIN-SUFFIX,x.com',
				'DOMAIN-SUFFIX,t.co',
				'DOMAIN-KEYWORD,twitter',
			].join('\n'),
			'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list': [
				'DOMAIN-SUFFIX,youtube.com',
			].join('\n'),
			'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list': [
				'DOMAIN-SUFFIX,apple.com',
			].join('\n'),
			'https://raw.githubusercontent.com/notlate-cn/edgetunnel/main/rules/shadowrocket/johnshall-ad-only.list': [
				'DOMAIN-SUFFIX,ads.example',
			].join('\n'),
		},
	});

	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,openai.com,静态住宅'));
	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,x.com,静态住宅'));
	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,t.co,静态住宅'));
	assert.ok(output.clash.rules.includes('DOMAIN-KEYWORD,twitter,静态住宅'));
	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,youtube.com,Proxy'));
	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,apple.com,DIRECT'));
	assert.ok(output.clash.rules.includes('DOMAIN-SUFFIX,litix.io,Proxy'));
	assert.ok(!output.clash.rules.includes('USER-AGENT,OpenAI*,静态住宅'));
	assert.ok(!output.clash.rules.includes('DOMAIN-SUFFIX,ads.example,REJECT'));
});

test('validates references to missing node ids', () => {
	assert.throws(
		() => buildCustomSubscription({
			...SIMPLE_CONFIG,
			nodes: {
				...SIMPLE_CONFIG.nodes,
				static_hd: {
					...SIMPLE_CONFIG.nodes.static_hd,
					dialer: 'missing',
				},
			},
		}),
		/unknown node id "missing"/,
	);

	const output = buildCustomSubscription({ ...SIMPLE_CONFIG, rules: { target: '自定义策略', domainKeyword: ['example'] } });
	assert.equal(output.clash.rules[0], 'DOMAIN-KEYWORD,example,自定义策略,no-resolve');
});

test('CLI writes generated custom-subscription JSON', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'edgetunnel-custom-sub-'));
	try {
		const input = join(tempDir, 'private.json');
		const output = join(tempDir, 'custom-subscription.json');
		writeFileSync(input, JSON.stringify(SIMPLE_CONFIG, null, 2));

		const result = spawnSync(process.execPath, ['tools/build-custom-subscription.mjs', input, output], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
		});

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const generated = JSON.parse(readFileSync(output, 'utf8'));
		assert.equal(generated.clash.proxies[2].name, '🇺🇸 US-StaticIP-via-HD');
		assert.match(result.stdout, /Wrote .*custom-subscription\.json/);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test('shell wrappers run build and deploy dry-run commands', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'edgetunnel-custom-sub-sh-'));
	try {
		const input = join(tempDir, 'private.json');
		const buildOutput = join(tempDir, 'custom-subscription.json');
		const deployOutput = join(tempDir, 'custom-subscription-deploy.json');
		writeFileSync(input, JSON.stringify(SIMPLE_CONFIG, null, 2));

		const buildResult = spawnSync('./build.sh', [input, buildOutput], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
		});
		assert.equal(buildResult.status, 0, buildResult.stderr || buildResult.stdout);
		const generated = JSON.parse(readFileSync(buildOutput, 'utf8'));
		assert.equal(generated.clash.proxies[0].name, '🇸🇬 SP-TT-203.0.113.10');

		const deployResult = spawnSync('./deploy.sh', [
			input,
			'--namespace-id',
			'test-namespace',
			'--output',
			deployOutput,
			'--dry-run',
		], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
		});
		assert.equal(deployResult.status, 0, deployResult.stderr || deployResult.stdout);
		assert.match(deployResult.stdout, /Dry run: npx wrangler kv key put custom-subscription\.json --path .*custom-subscription-deploy\.json --namespace-id test-namespace --remote/);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test('deploy shell wrapper defaults to .env.local KV namespace and private config', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'edgetunnel-custom-sub-defaults-'));
	try {
		const repoRoot = new URL('..', import.meta.url);
		const privateConfig = new URL('../custom-subscription.private.json', import.meta.url);
		const envLocal = new URL('../.env.local', import.meta.url);
		const output = new URL('../custom-subscription.json', import.meta.url);
		const previousPrivateConfig = readFileSync(privateConfig, 'utf8');
		const previousEnvLocal = readFileSync(envLocal, 'utf8');

		writeFileSync(privateConfig, JSON.stringify(SIMPLE_CONFIG, null, 2));
		writeFileSync(envLocal, `${previousEnvLocal.replace(/\n?$/, '\n')}KV_NAMESPACE_ID=test-env-file-namespace\nUUID=00000000-0000-4000-8000-000000000000\nWORKER_HOST=example.workers.dev\n`);

		const deployResult = spawnSync('./deploy.sh', ['--output', join(tempDir, 'generated.json'), '--dry-run'], {
			cwd: repoRoot,
			encoding: 'utf8',
		});

		writeFileSync(privateConfig, previousPrivateConfig);
		writeFileSync(envLocal, previousEnvLocal);
		rmSync(output, { force: true });

		assert.equal(deployResult.status, 0, deployResult.stderr || deployResult.stdout);
		assert.match(deployResult.stdout, /from .*custom-subscription\.private\.json/);
		assert.match(deployResult.stdout, /--namespace-id test-env-file-namespace --remote/);
		assert.match(deployResult.stdout, /ClashMac:\nhttps:\/\/example\.workers\.dev\/sub\?token=aa1e7a0d37bf5ebd8edf5127615f967c&clash/);
		assert.match(deployResult.stdout, /Shadowrocket config \(rules\):\nhttps:\/\/example\.workers\.dev\/sub\?token=aa1e7a0d37bf5ebd8edf5127615f967c&shadowrocket-conf/);
		assert.match(deployResult.stdout, /Shadowrocket nodes \(Subscribe\):\nhttps:\/\/example\.workers\.dev\/sub\?token=aa1e7a0d37bf5ebd8edf5127615f967c&shadowrocket-links/);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test('deploy shell wrapper runs with no arguments under nounset', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'edgetunnel-custom-sub-no-args-'));
	try {
		const repoRoot = new URL('..', import.meta.url);
		const privateConfig = new URL('../custom-subscription.private.json', import.meta.url);
		const envLocal = new URL('../.env.local', import.meta.url);
		const output = new URL('../custom-subscription.json', import.meta.url);
		const fakeNpx = join(tempDir, 'npx');
		const previousPrivateConfig = readFileSync(privateConfig, 'utf8');
		const previousEnvLocal = readFileSync(envLocal, 'utf8');

		writeFileSync(privateConfig, JSON.stringify(SIMPLE_CONFIG, null, 2));
		writeFileSync(envLocal, `${previousEnvLocal.replace(/\n?$/, '\n')}KV_NAMESPACE_ID=test-env-file-namespace\n`);
		writeFileSync(fakeNpx, '#!/usr/bin/env bash\necho "fake npx $*"\n');
		chmodSync(fakeNpx, 0o755);

		const deployResult = spawnSync('./deploy.sh', [], {
			cwd: repoRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `${tempDir}:${process.env.PATH}`,
			},
		});

		writeFileSync(privateConfig, previousPrivateConfig);
		writeFileSync(envLocal, previousEnvLocal);
		rmSync(output, { force: true });

		assert.equal(deployResult.status, 0, deployResult.stderr || deployResult.stdout);
		assert.match(deployResult.stdout, /from .*custom-subscription\.private\.json/);
		assert.match(deployResult.stdout, /fake npx wrangler kv key put custom-subscription\.json --path custom-subscription\.json --namespace-id test-env-file-namespace --remote/);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test('local Wrangler config generator writes KV binding without changing public template', () => {
	const tempDir = mkdtempSync(join(tmpdir(), 'edgetunnel-wrangler-local-'));
	try {
		const envLocal = join(tempDir, '.env.local');
		const publicTemplate = join(tempDir, 'wrangler.toml');
		const localConfig = join(tempDir, 'wrangler.local.toml');

		writeFileSync(envLocal, 'KV_NAMESPACE_ID=test-local-namespace\n');
		writeFileSync(publicTemplate, [
			'name = "v20251104"',
			'main = "_worker.js"',
			'',
			'#[[kv_namespaces]]',
			'#binding = "KV"',
			'#id = ""',
			'',
		].join('\n'));

		const result = spawnSync(process.execPath, [
			'tools/write-wrangler-local.mjs',
			'--env',
			envLocal,
			'--base',
			publicTemplate,
			'--output',
			localConfig,
		], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
		});

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(readFileSync(localConfig, 'utf8'), /\[\[kv_namespaces\]\]\nbinding = "KV"\nid = "test-local-namespace"/);
		assert.doesNotMatch(readFileSync(publicTemplate, 'utf8'), /test-local-namespace/);
		assert.match(result.stdout, /Wrote .*wrangler\.local\.toml/);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test('checked-in compact example builds without private material', () => {
	const example = JSON.parse(readFileSync(new URL('../custom-subscription.simple.example.json', import.meta.url), 'utf8'));
	const generated = buildCustomSubscription(example);

	assert.equal(generated.clash.proxies.length, 4);
	assert.deepEqual(generated.clash.proxies.map(proxy => proxy.name), [
		'🇸🇬 SP-TT-203.0.113.10',
		'🇺🇸 US-HD-198.51.100.20',
		'🇺🇸 US-StaticIP-via-HD',
		'🇺🇸 US-StaticIP-via-TT',
	]);
	for (const node of Object.values(example.nodes)) {
		assert.ok(isDocumentationIPv4(node.server), `example server ${node.server} must use a documentation IP`);
	}
});
