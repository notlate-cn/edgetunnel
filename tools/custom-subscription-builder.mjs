import { readFileSync } from 'node:fs';

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

const DEFAULT_GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/notlate-cn/edgetunnel/main';
const DEFAULT_SHADOWROCKET_RULESET_BASE_URL = `${DEFAULT_GITHUB_RAW_BASE_URL}/rules/shadowrocket`;
const DEFAULT_SHADOWROCKET_CUSTOM_RULESET_SOURCE = 'rules/shadowrocket/static-hd.list';
const DEFAULT_SHADOWROCKET_CUSTOM_RULESET_URL = `${DEFAULT_GITHUB_RAW_BASE_URL}/${DEFAULT_SHADOWROCKET_CUSTOM_RULESET_SOURCE}`;
const DEFAULT_SHADOWROCKET_AD_RULESET_URL = `${DEFAULT_SHADOWROCKET_RULESET_BASE_URL}/johnshall-ad-only.list`;
const DEFAULT_JOHNSHALL_LAZY_GROUP_RULES = readRuleLines('../rules/shadowrocket/johnshall-lazy-group.rules');
const JOHNSHALL_POLICY_GROUPS = [
	'AI',
	'YOUTUBE',
	'NETFLIX',
	'DISNEY+',
	'MAX',
	'SPOTIFY',
	'TELEGRAM',
	'PAYPAL',
	'TWITTER',
	'FACEBOOK',
	'AMAZON',
	'游戏平台',
	'微软服务',
	'谷歌服务',
	'苹果服务',
	'哔哩哔哩',
	'TIKTOK',
];
const DEFAULT_POLICY_MAP = {
	PROXY: 'Proxy',
	Proxy: 'Proxy',
	proxy: 'Proxy',
	Direct: 'DIRECT',
	direct: 'DIRECT',
	Reject: 'REJECT',
	reject: 'REJECT',
	...Object.fromEntries(JOHNSHALL_POLICY_GROUPS.map(group => [group, 'Proxy'])),
	AI: '静态住宅',
	TELEGRAM: '静态住宅',
	PAYPAL: '静态住宅',
	TWITTER: '静态住宅',
	谷歌服务: 'Google',
};
const DEFAULT_PROXY_POOL_GROUPS = [
	{ name: '静态住宅', proxies: ['static_hd', 'static_tt'] },
	{ name: '三网优化', proxies: ['hd'] },
	{ name: '普通代理', proxies: ['tt', 'CF官方优选*'] },
	{ name: 'Google', proxies: ['三网优化', '普通代理', '静态住宅', 'DIRECT'] },
	{ name: 'Proxy', proxies: ['普通代理', '三网优化', '静态住宅', 'DIRECT'] },
];

const CURATED_EMOJI_PATTERNS = [
	{ match: '新加坡|singapore|(?:^|[\\s_-])sg(?:[\\s_-]|$)|(?:^|[\\s_-])sp(?:[\\s_-]|$)', flag: '🇸🇬' },
	{ match: '美国|美國|united\\s*states|america|(?:^|[\\s_-])us(?:[\\s_-]|$)|cloudflare|cf官方', flag: '🇺🇸' },
	{ match: '香港|hong\\s*kong|(?:^|[\\s_-])hk(?:[\\s_-]|$)', flag: '🇭🇰' },
	{ match: '台湾|台灣|taiwan|(?:^|[\\s_-])tw(?:[\\s_-]|$)', flag: '🇹🇼' },
	{ match: '日本|japan|tokyo|(?:^|[\\s_-])jp(?:[\\s_-]|$)', flag: '🇯🇵' },
	{ match: '韩国|韓國|korea|seoul|(?:^|[\\s_-])kr(?:[\\s_-]|$)', flag: '🇰🇷' },
];

const COUNTRY_EMOJI_ROWS = `
AF|阿富汗|afghanistan
AX|奥兰|奥兰群岛|aland|aland islands
AL|阿尔巴尼亚|albania
DZ|阿尔及利亚|algeria
AS|美属萨摩亚|american samoa
AD|安道尔|andorra
AO|安哥拉|angola
AI|安圭拉|anguilla
AQ|南极洲|antarctica
AG|安提瓜和巴布达|antigua|barbuda|antigua and barbuda
AR|阿根廷|argentina
AM|亚美尼亚|armenia
AW|阿鲁巴|aruba
AU|澳大利亚|澳洲|australia|sydney
AT|奥地利|austria
AZ|阿塞拜疆|azerbaijan
BS|巴哈马|bahamas
BH|巴林|bahrain
BD|孟加拉|孟加拉国|bangladesh
BB|巴巴多斯|barbados
BY|白俄罗斯|belarus
BE|比利时|belgium
BZ|伯利兹|belize
BJ|贝宁|benin
BM|百慕大|bermuda
BT|不丹|bhutan
BO|玻利维亚|bolivia
BQ|荷兰加勒比|caribbean netherlands|bonaire
BA|波黑|波斯尼亚|bosnia|bosnia and herzegovina
BW|博茨瓦纳|botswana
BV|布韦岛|bouvet
BR|巴西|brazil|sao paulo
IO|英属印度洋|british indian ocean
BN|文莱|brunei
BG|保加利亚|bulgaria
BF|布基纳法索|burkina faso
BI|布隆迪|burundi
CV|佛得角|cape verde|cabo verde
KH|柬埔寨|cambodia
CM|喀麦隆|cameroon
CA|加拿大|canada|toronto|vancouver
KY|开曼|开曼群岛|cayman|cayman islands
CF|中非|中非共和国|central african republic
TD|乍得|chad
CL|智利|chile
CN|中国|大陆|china|mainland
CX|圣诞岛|christmas island
CC|科科斯|cocos|keeling
CO|哥伦比亚|colombia
KM|科摩罗|comoros
CG|刚果布|刚果共和国|congo brazzaville|republic of congo
CD|刚果金|刚果民主共和国|congo kinshasa|democratic republic of congo
CK|库克群岛|cook islands
CR|哥斯达黎加|costa rica
CI|科特迪瓦|象牙海岸|cote divoire|ivory coast
HR|克罗地亚|croatia
CU|古巴|cuba
CW|库拉索|curacao
CY|塞浦路斯|cyprus
CZ|捷克|czech|czechia|czech republic
DK|丹麦|denmark
DJ|吉布提|djibouti
DM|多米尼克|dominica
DO|多米尼加|多米尼加共和国|dominican republic
EC|厄瓜多尔|ecuador
EG|埃及|egypt
SV|萨尔瓦多|el salvador
GQ|赤道几内亚|equatorial guinea
ER|厄立特里亚|eritrea
EE|爱沙尼亚|estonia
SZ|斯威士兰|eswatini|swaziland
ET|埃塞俄比亚|ethiopia
FK|福克兰|falkland|falkland islands
FO|法罗|法罗群岛|faroe|faroe islands
FJ|斐济|fiji
FI|芬兰|finland
FR|法国|france|paris
GF|法属圭亚那|french guiana
PF|法属波利尼西亚|french polynesia
TF|法属南部|french southern territories
GA|加蓬|gabon
GM|冈比亚|gambia
GE|格鲁吉亚|georgia
DE|德国|德國|germany|deutschland|frankfurt
GH|加纳|ghana
GI|直布罗陀|gibraltar
GR|希腊|greece
GL|格陵兰|greenland
GD|格林纳达|grenada
GP|瓜德罗普|guadeloupe
GU|关岛|guam
GT|危地马拉|guatemala
GG|根西|guernsey
GN|几内亚|guinea
GW|几内亚比绍|guinea bissau
GY|圭亚那|guyana
HT|海地|haiti
HM|赫德岛|heard island|mcdonald islands
VA|梵蒂冈|vatican|holy see
HN|洪都拉斯|honduras
HK|香港|hong kong
HU|匈牙利|hungary
IS|冰岛|iceland
IN|印度|india|mumbai
ID|印度尼西亚|印尼|indonesia|jakarta
IR|伊朗|iran
IQ|伊拉克|iraq
IE|爱尔兰|ireland
IM|马恩岛|isle of man
IL|以色列|israel
IT|意大利|italy
JM|牙买加|jamaica
JP|日本|japan|tokyo|osaka
JE|泽西|jersey
JO|约旦|jordan
KZ|哈萨克斯坦|kazakhstan
KE|肯尼亚|kenya
KI|基里巴斯|kiribati
KP|朝鲜|北朝鲜|north korea
KR|韩国|韓國|南韩|south korea|korea|seoul
KW|科威特|kuwait
KG|吉尔吉斯|吉尔吉斯斯坦|kyrgyzstan
LA|老挝|laos
LV|拉脱维亚|latvia
LB|黎巴嫩|lebanon
LS|莱索托|lesotho
LR|利比里亚|liberia
LY|利比亚|libya
LI|列支敦士登|liechtenstein
LT|立陶宛|lithuania
LU|卢森堡|luxembourg
MO|澳门|澳門|macao|macau
MG|马达加斯加|madagascar
MW|马拉维|malawi
MY|马来西亚|malaysia|kuala lumpur
MV|马尔代夫|maldives
ML|马里|mali
MT|马耳他|malta
MH|马绍尔|马绍尔群岛|marshall islands
MQ|马提尼克|martinique
MR|毛里塔尼亚|mauritania
MU|毛里求斯|mauritius
YT|马约特|mayotte
MX|墨西哥|mexico
FM|密克罗尼西亚|micronesia
MD|摩尔多瓦|moldova
MC|摩纳哥|monaco
MN|蒙古|mongolia
ME|黑山|montenegro
MS|蒙特塞拉特|montserrat
MA|摩洛哥|morocco
MZ|莫桑比克|mozambique
MM|缅甸|myanmar|burma
NA|纳米比亚|namibia
NR|瑙鲁|nauru
NP|尼泊尔|nepal
NL|荷兰|netherlands|holland|amsterdam
NC|新喀里多尼亚|new caledonia
NZ|新西兰|new zealand
NI|尼加拉瓜|nicaragua
NE|尼日尔|niger
NG|尼日利亚|nigeria
NU|纽埃|niue
NF|诺福克|norfolk
MK|北马其顿|马其顿|north macedonia|macedonia
MP|北马里亚纳|northern mariana islands
NO|挪威|norway
OM|阿曼|oman
PK|巴基斯坦|pakistan
PW|帕劳|palau
PS|巴勒斯坦|palestine
PA|巴拿马|panama
PG|巴布亚新几内亚|papua new guinea
PY|巴拉圭|paraguay
PE|秘鲁|peru
PH|菲律宾|philippines|manila
PN|皮特凯恩|pitcairn
PL|波兰|poland
PT|葡萄牙|portugal
PR|波多黎各|puerto rico
QA|卡塔尔|qatar
RE|留尼汪|reunion
RO|罗马尼亚|romania
RU|俄罗斯|俄国|russia|russian|moscow
RW|卢旺达|rwanda
BL|圣巴泰勒米|saint barthelemy
SH|圣赫勒拿|saint helena
KN|圣基茨和尼维斯|saint kitts|nevis
LC|圣卢西亚|saint lucia
MF|法属圣马丁|saint martin
PM|圣皮埃尔|saint pierre|miquelon
VC|圣文森特|saint vincent|grenadines
WS|萨摩亚|samoa
SM|圣马力诺|san marino
ST|圣多美|sao tome|principe
SA|沙特|沙特阿拉伯|saudi arabia|riyadh
SN|塞内加尔|senegal
RS|塞尔维亚|serbia
SC|塞舌尔|seychelles
SL|塞拉利昂|sierra leone
SG|新加坡|singapore
SX|荷属圣马丁|sint maarten
SK|斯洛伐克|slovakia
SI|斯洛文尼亚|slovenia
SB|所罗门|所罗门群岛|solomon islands
SO|索马里|somalia
ZA|南非|south africa
GS|南乔治亚|south georgia
SS|南苏丹|south sudan
ES|西班牙|spain|madrid
LK|斯里兰卡|sri lanka
SD|苏丹|sudan
SR|苏里南|suriname
SJ|斯瓦尔巴|svalbard|jan mayen
SE|瑞典|sweden
CH|瑞士|switzerland|zurich
SY|叙利亚|syria
TW|台湾|台灣|taiwan|taipei
TJ|塔吉克斯坦|tajikistan
TZ|坦桑尼亚|tanzania
TH|泰国|thailand|bangkok
TL|东帝汶|timor leste|east timor
TG|多哥|togo
TK|托克劳|tokelau
TO|汤加|tonga
TT|特立尼达和多巴哥|trinidad|tobago
TN|突尼斯|tunisia
TR|土耳其|turkey|turkiye|istanbul
TM|土库曼|土库曼斯坦|turkmenistan
TC|特克斯和凯科斯|turks|caicos
TV|图瓦卢|tuvalu
UG|乌干达|uganda
UA|乌克兰|ukraine
AE|阿联酋|阿拉伯联合酋长国|united arab emirates|uae|dubai
GB|英国|英國|大不列颠|united kingdom|great britain|england|london|uk
US|美国|美國|united states|america|usa|los angeles|new york|san jose
UM|美国本土外小岛|united states minor outlying islands
UY|乌拉圭|uruguay
UZ|乌兹别克|乌兹别克斯坦|uzbekistan
VU|瓦努阿图|vanuatu
VE|委内瑞拉|venezuela
VN|越南|vietnam|hanoi
VG|英属维京|british virgin islands
VI|美属维京|us virgin islands|virgin islands
WF|瓦利斯和富图纳|wallis|futuna
EH|西撒哈拉|western sahara
YE|也门|yemen
ZM|赞比亚|zambia
ZW|津巴布韦|zimbabwe
XK|科索沃|kosovo
EU|欧洲|欧盟|europe|european union
`;

function escapeRegexText(value) {
	return String(value)
		.trim()
		.split(/\s+/)
		.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
		.join('\\s*');
}

function emojiFlagFromCode(code) {
	return String.fromCodePoint(...String(code).toUpperCase().split('').map(char => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function emojiAliasPattern(alias) {
	const normalized = String(alias).trim();
	if (/^[a-z]{2,3}$/i.test(normalized)) return `(?:^|[\\\\s_-])${normalized.toLowerCase()}(?:[\\\\s_-]|$)`;
	return escapeRegexText(normalized);
}

function buildCountryEmojiPatterns() {
	return COUNTRY_EMOJI_ROWS
		.trim()
		.split('\n')
		.map(row => row.trim())
		.filter(Boolean)
		.map(row => {
			const [code, ...aliases] = row.split('|').map(value => value.trim()).filter(Boolean);
			const priority = Math.max(...aliases.map(alias => alias.length), code.length);
			return {
				code,
				aliases,
				priority,
			};
		})
		.sort((left, right) => right.priority - left.priority)
		.map(({ code, aliases }) => {
			return {
				match: [...aliases, code.toLowerCase()].map(emojiAliasPattern).join('|'),
				flag: emojiFlagFromCode(code),
			};
		});
}

const DEFAULT_EMOJI_PATTERNS = [
	...buildCountryEmojiPatterns(),
	...CURATED_EMOJI_PATTERNS,
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

function readRuleLines(relativePath) {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line && !line.startsWith('#'));
}

function readProjectRuleLines(sourcePath, path) {
	assertRequiredString(sourcePath, path);
	if (/^[a-z][a-z0-9+.-]*:/i.test(sourcePath)) throw new Error(`${path} must be a local repository path`);
	return readRuleLines(`../${sourcePath.replace(/^\/+/, '')}`);
}

function buildGitHubRawUrl(sourcePath) {
	return `${DEFAULT_GITHUB_RAW_BASE_URL}/${sourcePath.replace(/^\/+/, '')}`;
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

function resolvePolicyName(idToName, value) {
	assertRequiredString(value, 'policy');
	return resolveNodeName(idToName, value);
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

function encodeShareName(name) {
	return encodeURIComponent(name);
}

function formatShareServer(server) {
	return String(server).includes(':') && !String(server).startsWith('[') ? `[${server}]` : server;
}

function buildVlessRealityLink(node, proxyName, path) {
	for (const key of ['server', 'uuid', 'servername', 'publicKey']) {
		assertRequiredString(node[key], `${path}.${key}`);
	}

	const params = new URLSearchParams();
	params.set('encryption', 'none');
	params.set('security', 'reality');
	params.set('type', node.network ?? 'tcp');
	params.set('flow', node.flow ?? 'xtls-rprx-vision');
	params.set('sni', node.servername);
	params.set('fp', node.clientFingerprint ?? 'chrome');
	params.set('pbk', node.publicKey);
	params.set('sid', node.shortId ?? '');
	return `vless://${node.uuid}@${formatShareServer(node.server)}:${node.port ?? 443}?${params.toString()}#${encodeShareName(proxyName)}`;
}

function buildSocks5Link(node, proxyName, path) {
	for (const key of ['server', 'port', 'username', 'password']) {
		if (key === 'port' && typeof node[key] === 'number') continue;
		assertRequiredString(node[key], `${path}.${key}`);
	}

	return `socks5://${encodeURIComponent(node.username)}:${encodeURIComponent(node.password)}@${formatShareServer(node.server)}:${node.port}#${encodeShareName(proxyName)}`;
}

function buildShadowrocketLink(node, proxyName, path) {
	if (node.shadowrocket === false || node.shadowrocket?.enabled === false) return null;
	if (node.shadowrocketLink) {
		assertRequiredString(node.shadowrocketLink, `${path}.shadowrocketLink`);
		return node.shadowrocketLink;
	}
	if (node.shadowrocket?.link) {
		assertRequiredString(node.shadowrocket.link, `${path}.shadowrocket.link`);
		return node.shadowrocket.link;
	}
	if (node.type === 'vless-reality') return buildVlessRealityLink(node, proxyName, path);
	if (node.type === 'socks5' || node.type === 'socks5-chain') return buildSocks5Link(node, proxyName, path);
	return null;
}

function buildVlessRealityShadowrocketProxy(node, proxyName, path) {
	for (const key of ['server', 'uuid', 'servername', 'publicKey']) {
		assertRequiredString(node[key], `${path}.${key}`);
	}

	return [
		`${proxyName}=vless`,
		node.server,
		node.port ?? 443,
		`password=${node.uuid}`,
		`tls=${node.tls ?? true}`,
		`type=${node.network ?? 'tcp'}`,
		`flow=${node.flow ?? 'xtls-rprx-vision'}`,
		`sni=${node.servername}`,
		`peer=${node.servername}`,
		`fp=${node.clientFingerprint ?? 'chrome'}`,
		`pbk=${node.publicKey}`,
		`sid=${node.shortId ?? ''}`,
	].join(',');
}

function buildSocks5ShadowrocketProxy(node, proxyName, path) {
	for (const key of ['server', 'port', 'username', 'password']) {
		if (key === 'port' && typeof node[key] === 'number') continue;
		assertRequiredString(node[key], `${path}.${key}`);
	}

	return `${proxyName}=socks5,${node.server},${node.port},${node.username},${node.password}`;
}

function buildShadowrocketProxy(node, proxyName, path) {
	if (node.shadowrocket === false || node.shadowrocket?.enabled === false) return null;
	if (node.shadowrocketProxy) {
		assertRequiredString(node.shadowrocketProxy, `${path}.shadowrocketProxy`);
		return node.shadowrocketProxy;
	}
	if (node.shadowrocket?.proxy) {
		assertRequiredString(node.shadowrocket.proxy, `${path}.shadowrocket.proxy`);
		return node.shadowrocket.proxy;
	}
	if (node.type === 'vless-reality') return buildVlessRealityShadowrocketProxy(node, proxyName, path);
	if (node.type === 'socks5' || node.type === 'socks5-chain') return buildSocks5ShadowrocketProxy(node, proxyName, path);
	return null;
}

function buildRules(configRules, idToName) {
	const rules = configRules || {};
	if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('rules must be an object');
	const output = [];
	const target = rules.target ? resolvePolicyName(idToName, rules.target) : null;

	if (rules.source !== undefined) {
		if (!target) throw new Error('rules.target is required when rules.source is set');
		for (const rule of readProjectRuleLines(rules.source, 'rules.source')) {
			const parts = rule.split(',').map(part => part.trim());
			if (parts.length < 2 || parts.length > 3 || (parts.length === 3 && parts[2] !== 'no-resolve')) {
				throw new Error('rules.source entries must be policy-less rules');
			}
			output.push(`${parts[0]},${parts[1]},${target},no-resolve`);
		}
	}
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

function buildShadowrocketRuleSets(config = {}, idToName, rules) {
	const output = [];
	const shadowrocketConfig = config.shadowrocket || {};
	for (const item of assertOptionalArray(shadowrocketConfig.ruleSets, 'shadowrocket.ruleSets')) {
		if (typeof item === 'string') {
			output.push(item);
			continue;
		}
		assertPlainObject(item, 'shadowrocket.ruleSets[]');
		assertRequiredString(item.url, 'shadowrocket.ruleSets[].url');
		assertRequiredString(item.policy, 'shadowrocket.ruleSets[].policy');
		output.push({
			url: item.url,
			policy: resolveNodeName(idToName, item.policy),
			noResolve: item.noResolve === true,
		});
	}
	return output;
}

function shadowrocketPolicyIndex(parts) {
	if (parts.length < 3) return -1;
	if (parts.at(-1) === 'no-resolve') return parts.length - 2;
	return parts.length - 1;
}

function buildPolicyMap(config, idToName, path) {
	const configuredMap = config?.policyMap || {};
	if (config?.policyMap) assertPlainObject(configuredMap, `${path}.policyMap`);
	return Object.fromEntries(Object.entries({
		...DEFAULT_POLICY_MAP,
		...configuredMap,
	}).map(([from, to]) => {
		assertRequiredString(from, `${path}.policyMap key`);
		assertRequiredString(to, `${path}.policyMap.${from}`);
		return [from, resolvePolicyName(idToName, to)];
	}));
}

function buildShadowrocketPolicyMap(config, idToName) {
	return buildPolicyMap(config.shadowrocket || {}, idToName, 'shadowrocket');
}

function normalizeShadowrocketRule(rule, idToName, policyMap = {}) {
	const parts = String(rule || '').trim().split(',').map(part => part.trim());
	const policyIndex = shadowrocketPolicyIndex(parts);
	if (policyIndex >= 0) {
		const policy = parts[policyIndex];
		parts[policyIndex] = policyMap[policy] || resolveNodeName(idToName, policy);
	}
	return parts.join(',');
}

function buildShadowrocketRules(config = {}, idToName, rules) {
	const shadowrocketConfig = config.shadowrocket || {};
	const policyMap = buildShadowrocketPolicyMap(config, idToName);
	const output = [];
	const target = config.rules?.target ? resolvePolicyName(idToName, config.rules.target) : null;
	if (rules.length > 0 && target && shadowrocketConfig.inlineCustomRules !== true && shadowrocketConfig.useCustomRuleSet !== false) {
		const customRuleSetUrl = shadowrocketConfig.customRuleSetUrl || (config.rules?.source ? buildGitHubRawUrl(config.rules.source) : DEFAULT_SHADOWROCKET_CUSTOM_RULESET_URL);
		output.push(`RULE-SET,${customRuleSetUrl},${target},no-resolve`);
	}
	if (shadowrocketConfig.inlineCustomRules === true) {
		output.push(...rules.map(rule => normalizeShadowrocketRule(rule, idToName, policyMap)));
	}
	for (const rule of assertOptionalArray(shadowrocketConfig.rules, 'shadowrocket.rules')) {
		assertRequiredString(rule, 'shadowrocket.rules[]');
		output.push(normalizeShadowrocketRule(rule, idToName, policyMap));
	}
	if (shadowrocketConfig.useJohnshallAdBlock !== false) {
		output.push(`RULE-SET,${shadowrocketConfig.adRuleSetUrl || DEFAULT_SHADOWROCKET_AD_RULESET_URL},REJECT`);
	}
	if (shadowrocketConfig.useJohnshallLazyGroup !== false) {
		output.push(...DEFAULT_JOHNSHALL_LAZY_GROUP_RULES
			.filter(rule => !/^FINAL,/i.test(rule))
			.map(rule => normalizeShadowrocketRule(rule, idToName, policyMap)));
	}
	return output;
}

function uniqueList(values) {
	const output = [];
	for (const value of values) {
		if (value && !output.includes(value)) output.push(value);
	}
	return output;
}

function resolveProxyList(proxies, idToName, path) {
	return assertOptionalArray(proxies, path).map(proxy => resolvePolicyName(idToName, proxy));
}

function buildDefaultProxyGroups(idToName) {
	return DEFAULT_PROXY_POOL_GROUPS.map(group => ({
		name: group.name,
		type: 'select',
		proxies: uniqueList(group.proxies.map(proxy => resolveNodeName(idToName, proxy))),
	})).filter(group => group.proxies.length > 0);
}

function buildConfiguredGroups(groups, idToName, path) {
	const output = [];
	for (const group of assertOptionalArray(groups, `${path}.groups`)) {
		if (typeof group === 'string') {
			output.push(group);
			continue;
		}
		assertPlainObject(group, `${path}.groups[]`);
		assertRequiredString(group.name, `${path}.groups[].name`);
		output.push({
			name: group.name,
			type: group.type || 'select',
			proxies: resolveProxyList(group.proxies, idToName, `${path}.groups.${group.name}.proxies`),
		});
	}
	return output;
}

function buildShadowrocketGroups(config = {}, idToName) {
	const shadowrocketConfig = config.shadowrocket || {};
	const output = shadowrocketConfig.useDefaultProxyGroups === false ? [] : buildDefaultProxyGroups(idToName);
	output.push(...buildConfiguredGroups(shadowrocketConfig.groups, idToName, 'shadowrocket'));
	return output;
}

function buildClashGroups(config = {}, idToName) {
	const clashConfig = config.clash || {};
	const output = clashConfig.useDefaultProxyGroups === false ? [] : buildDefaultProxyGroups(idToName);
	output.push(...buildConfiguredGroups(clashConfig.groups, idToName, 'clash'));
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
	const shadowrocketLinks = Object.entries(nodes)
		.map(([nodeId, node]) => buildShadowrocketLink(node, idToName.get(nodeId), `nodes.${nodeId}`))
		.filter(Boolean);
	const shadowrocketProxies = Object.entries(nodes)
		.map(([nodeId, node]) => buildShadowrocketProxy(node, idToName.get(nodeId), `nodes.${nodeId}`))
		.filter(Boolean);
	const rules = buildRules(config.rules, idToName);
	const shadowrocketRuleSets = buildShadowrocketRuleSets(config, idToName, rules);
	const shadowrocketRules = buildShadowrocketRules(config, idToName, rules);
	const shadowrocketGroups = buildShadowrocketGroups(config, idToName);
	const clashGroups = buildClashGroups(config, idToName);

	return {
		enabled: config.enabled !== false,
		appendServerToName: config.appendServerToName === true,
		shadowrocket: {
			links: shadowrocketLinks,
			proxies: shadowrocketProxies,
			rules: shadowrocketRules,
			ruleSets: shadowrocketRuleSets,
			groups: shadowrocketGroups,
		},
		clash: {
			dns: resolveDnsBlock(config),
			proxies,
			rules,
			groups: clashGroups,
			addProxiesToGroups: config.addProxiesToGroups !== false,
			groupDefaults: buildGroupDefaults(config.groupDefaults, idToName),
			emoji: buildEmoji(config, nodes),
		},
	};
}

export function stringifyCustomSubscription(config) {
	return `${JSON.stringify(config, null, 2)}\n`;
}
