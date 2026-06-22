const DEFAULT_DNS_BLOCK = `dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  use-hosts: true
  nameserver:
    - https://sm2.doh.pub/dns-query
    - https://dns.alidns.com/dns-query
  fake-ip-filter:
    - '*.argotunnel.com'
    - 'argotunnel.com'
    - '*.cloudflare.com'
    - 'browser.argotunnel.com'
    - '*.cloudflarebridge.com'
    - 'localhost'
    - '+.lan'
    - '+.local'
  fallback:
    - https://dns.google/dns-query
    - https://cloudflare-dns.com/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
    geosite:
      - gfw
    ipcidr:
      - 240.0.0.0/4
      - 127.0.0.1/32
      - 0.0.0.0/32
    domain:
      - '+.google.com'
      - '+.facebook.com'
      - '+.youtube.com'
`;

const DEFAULT_EMOJI_PATTERNS = [
	{ match: '新加坡|singapore|(?:^|[\\s_-])sg(?:[\\s_-]|$)|(?:^|[\\s_-])sp(?:[\\s_-]|$)', flag: '🇸🇬' },
	{ match: '美国|美國|united\\s*states|america|(?:^|[\\s_-])us(?:[\\s_-]|$)|cloudflare|cf官方', flag: '🇺🇸' },
	{ match: '香港|hong\\s*kong|(?:^|[\\s_-])hk(?:[\\s_-]|$)', flag: '🇭🇰' },
	{ match: '台湾|台灣|taiwan|(?:^|[\\s_-])tw(?:[\\s_-]|$)', flag: '🇹🇼' },
	{ match: '日本|japan|tokyo|(?:^|[\\s_-])jp(?:[\\s_-]|$)', flag: '🇯🇵' },
	{ match: '韩国|韓國|korea|seoul|(?:^|[\\s_-])kr(?:[\\s_-]|$)', flag: '🇰🇷' },
];

function assertPlainObject(value, path) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${path} must be an object`);
	}
}

function assertRequiredString(value, path) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${path} must be a non-empty string`);
	}
}

function assertOptionalArray(value, path) {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
	return value;
}

function quoteYamlString(value) {
	return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function scalarYamlValue(value, { quoteStrings = false } = {}) {
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') return String(value);
	if (value === '') return '""';
	if (quoteStrings) return quoteYamlString(value);
	return String(value);
}

function inlineYamlMap(entries, { quoteStrings = false } = {}) {
	return `{${entries
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}: ${scalarYamlValue(value, { quoteStrings })}`)
		.join(', ')}}`;
}

function normalizeProxyName(node) {
	const flag = node.flag ? `${node.flag} ` : '';
	if (node.fullName) return node.fullName;
	if (node.type === 'vless-reality' && node.includeServerInName !== false) {
		return `${flag}${node.name}-${node.server}`;
	}
	return `${flag}${node.name}`;
}

function resolveNodeName(idToName, value) {
	if (idToName.has(value)) return idToName.get(value);
	return value;
}

function requireKnownNodeName(idToName, value) {
	if (!idToName.has(value)) throw new Error(`unknown node id "${value}"`);
	return idToName.get(value);
}

function buildVlessRealityYaml(node, proxyName, path) {
	for (const key of ['name', 'server', 'uuid', 'servername', 'publicKey']) {
		assertRequiredString(node[key], `${path}.${key}`);
	}

	const realityOptions = inlineYamlMap([
		['public-key', node.publicKey],
		['short-id', node.shortId ?? ''],
	], { quoteStrings: node.quoteRealityStrings === true });
	const entries = [
		['name', quoteYamlString(proxyName)],
		['type', 'vless'],
		['server', node.server],
		['port', node.port ?? 443],
		['uuid', node.uuid],
		['network', node.network ?? 'tcp'],
		['tls', node.tls ?? true],
		['udp', node.udp ?? true],
		['flow', node.flow ?? 'xtls-rprx-vision'],
		['servername', node.servername],
		['client-fingerprint', node.clientFingerprint],
		['reality-opts', realityOptions],
	];
	if (node.smux && typeof node.smux === 'object') {
		entries.push(['smux', inlineYamlMap([
			['enabled', node.smux.enabled],
			['protocol', node.smux.protocol],
			['padding', node.smux.padding],
			['max-connections', node.smux.maxConnections],
			['min-streams', node.smux.minStreams],
			['statistic', node.smux.statistic],
			['only-tcp', node.smux.onlyTcp],
		], { quoteStrings: true })]);
	}
	if (node.brutal && typeof node.brutal === 'object') {
		entries.push(['brutal-opts', inlineYamlMap([
			['enabled', node.brutal.enabled],
			['up', node.brutal.up],
			['down', node.brutal.down],
		], { quoteStrings: true })]);
	}

	return `  - ${inlineYamlMap(entries)}`;
}

function buildSocks5Yaml(node, proxyName, idToName, path) {
	for (const key of ['name', 'server', 'port', 'username', 'password']) {
		if (key === 'port' && typeof node[key] === 'number') continue;
		assertRequiredString(node[key], `${path}.${key}`);
	}

	const entries = [
		['name', quoteYamlString(proxyName)],
		['type', 'socks5'],
		['server', node.server],
		['port', node.port],
		['username', quoteYamlString(node.username)],
		['password', quoteYamlString(node.password)],
	];
	if (node.type === 'socks5-chain') {
		assertRequiredString(node.dialer, `${path}.dialer`);
		entries.push(['dialer-proxy', quoteYamlString(requireKnownNodeName(idToName, node.dialer))]);
	}

	return `  - ${inlineYamlMap(entries)}`;
}

function buildProxyYaml(node, proxyName, idToName, path) {
	if (node.yaml) return node.yaml;
	if (node.type === 'vless-reality') return buildVlessRealityYaml(node, proxyName, path);
	if (node.type === 'socks5' || node.type === 'socks5-chain') return buildSocks5Yaml(node, proxyName, idToName, path);
	throw new Error(`${path}.type must be one of: vless-reality, socks5, socks5-chain`);
}

function buildRules(configRules, idToName) {
	const rules = configRules || {};
	if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('rules must be an object');
	const output = [];
	const target = rules.target ? requireKnownNodeName(idToName, rules.target) : null;

	for (const domain of assertOptionalArray(rules.domainSuffix, 'rules.domainSuffix')) {
		assertRequiredString(domain, 'rules.domainSuffix[]');
		if (!target) throw new Error('rules.target is required when rules.domainSuffix is set');
		output.push(`DOMAIN-SUFFIX,${domain},${target},no-resolve`);
	}
	for (const keyword of assertOptionalArray(rules.domainKeyword, 'rules.domainKeyword')) {
		assertRequiredString(keyword, 'rules.domainKeyword[]');
		if (!target) throw new Error('rules.target is required when rules.domainKeyword is set');
		output.push(`DOMAIN-KEYWORD,${keyword},${target},no-resolve`);
	}
	for (const rule of assertOptionalArray(rules.raw, 'rules.raw')) {
		assertRequiredString(rule, 'rules.raw[]');
		const parts = rule.split(',');
		if (parts.length >= 3) parts[2] = resolveNodeName(idToName, parts[2]);
		output.push(parts.join(','));
	}

	return output;
}

function buildGroupDefaults(groupDefaults, idToName) {
	if (!groupDefaults) return {};
	assertPlainObject(groupDefaults, 'groupDefaults');

	return Object.fromEntries(Object.entries(groupDefaults).map(([groupName, proxies]) => {
		const proxyList = assertOptionalArray(proxies, `groupDefaults.${groupName}`);
		return [groupName, proxyList.map(proxy => resolveNodeName(idToName, proxy))];
	}));
}

function buildEmoji(config, nodes) {
	const configuredEmoji = config.emoji || {};
	if (configuredEmoji && typeof configuredEmoji !== 'object') throw new Error('emoji must be an object');

	const servers = {};
	for (const node of Object.values(nodes)) {
		if (node.server && node.flag) servers[node.server] = node.flag;
	}
	if (configuredEmoji.servers) {
		assertPlainObject(configuredEmoji.servers, 'emoji.servers');
		Object.assign(servers, configuredEmoji.servers);
	}

	const patterns = [...DEFAULT_EMOJI_PATTERNS];
	for (const pattern of assertOptionalArray(configuredEmoji.patterns, 'emoji.patterns')) {
		assertPlainObject(pattern, 'emoji.patterns[]');
		assertRequiredString(pattern.match, 'emoji.patterns[].match');
		assertRequiredString(pattern.flag, 'emoji.patterns[].flag');
		patterns.push({ match: pattern.match, flag: pattern.flag });
	}

	return { servers, patterns };
}

function resolveDnsBlock(config) {
	if (typeof config.dnsYaml === 'string') return config.dnsYaml;
	if (config.dnsPreset === false || config.dnsPreset === null) return '';
	if (!config.dnsPreset || config.dnsPreset === 'default') return DEFAULT_DNS_BLOCK;
	throw new Error(`unsupported dnsPreset "${config.dnsPreset}"`);
}

export function buildCustomSubscription(config) {
	assertPlainObject(config, 'config');
	assertPlainObject(config.nodes, 'nodes');

	const nodes = config.nodes;
	const idToName = new Map();
	for (const [nodeId, node] of Object.entries(nodes)) {
		assertPlainObject(node, `nodes.${nodeId}`);
		assertRequiredString(node.type, `nodes.${nodeId}.type`);
		assertRequiredString(node.name, `nodes.${nodeId}.name`);
		idToName.set(nodeId, normalizeProxyName(node));
	}

	const proxies = Object.entries(nodes).map(([nodeId, node]) => {
		const name = idToName.get(nodeId);
		return {
			name,
			yaml: buildProxyYaml(node, name, idToName, `nodes.${nodeId}`),
		};
	});

	return {
		enabled: config.enabled !== false,
		appendServerToName: config.appendServerToName === true,
		clash: {
			dns: resolveDnsBlock(config),
			proxies,
			rules: buildRules(config.rules, idToName),
			addProxiesToGroups: config.addProxiesToGroups !== false,
			groupDefaults: buildGroupDefaults(config.groupDefaults, idToName),
			emoji: buildEmoji(config, nodes),
		},
	};
}

export function stringifyCustomSubscription(config) {
	return `${JSON.stringify(config, null, 2)}\n`;
}
