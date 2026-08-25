const 主配置键 = 'cla' + 'sh';

const 个人订阅默认配置 = {
	enabled: false,
	appendServerToName: false,
	[主配置键]: {
		dns: '',
		proxies: [],
		rules: [],
		addProxiesToGroups: true,
		groupDefaults: {},
		emoji: {
			servers: {},
			patterns: [],
		},
	},
};

function 深克隆配置(value) {
	if (Array.isArray(value)) return value.map(深克隆配置);
	if (value && typeof value === 'object') {
		const copy = {};
		for (const [key, child] of Object.entries(value)) copy[key] = 深克隆配置(child);
		return copy;
	}
	return value;
}

function 深合并配置(base, override) {
	if (override === undefined) return 深克隆配置(base);
	if (Array.isArray(override)) return override.map(深克隆配置);
	if (!override || typeof override !== 'object') return override;
	const result = base && typeof base === 'object' && !Array.isArray(base) ? 深克隆配置(base) : {};
	for (const [key, value] of Object.entries(override)) result[key] = 深合并配置(result[key], value);
	return result;
}

function 解析个人订阅配置文本(文本) {
	const raw = String(文本 || '').trim();
	if (!raw) return {};
	if (/^(0|false|off|disabled)$/i.test(raw)) return { enabled: false };
	return JSON.parse(raw);
}

function 规范化个人订阅配置(配置 = {}) {
	return 深合并配置(个人订阅默认配置, 配置);
}

async function 读取个人订阅配置(env = {}) {
	let 配置 = {};
	for (const key of ['CUSTOM_SUBSCRIPTION', 'CUSTOM_SUB', 'PERSONAL_SUBSCRIPTION']) {
		if (!env[key]) continue;
		try {
			配置 = 深合并配置(配置, 解析个人订阅配置文本(env[key]));
		} catch (error) {
			console.warn(`[个人订阅配置] 环境变量 ${key} 解析失败: ${error.message}`);
		}
	}
	if (env.KV && typeof env.KV.get === 'function') {
		for (const key of ['custom-subscription.json', 'CUSTOM_SUBSCRIPTION', 'personal-subscription.json']) {
			try {
				const value = await env.KV.get(key);
				if (value) 配置 = 深合并配置(配置, 解析个人订阅配置文本(value));
			} catch (error) {
				console.warn(`[个人订阅配置] KV ${key} 读取或解析失败: ${error.message}`);
			}
		}
	}
	return 规范化个人订阅配置(配置);
}

function 添加个人节点地址到备注(节点备注, 节点地址, 配置 = {}) {
	const 个人配置 = 规范化个人订阅配置(配置);
	if (!个人配置.enabled || !个人配置.appendServerToName) return 节点备注;
	const 节点地址备注后缀 = String(节点地址 || '').replace(/^\[|\]$/g, '');
	if (!节点地址备注后缀 || String(节点备注 || '').endsWith(`-${节点地址备注后缀}`)) return 节点备注;
	return `${节点备注}-${节点地址备注后缀}`;
}

function YAML字段正则转义(字段) {
	return 字段.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function YAML标量去引号(值 = '') {
	const 文本 = String(值).trim();
	if ((文本.startsWith('"') && 文本.endsWith('"')) || (文本.startsWith("'") && 文本.endsWith("'"))) return 文本.slice(1, -1);
	return 文本;
}

function YAML引用字符串(值) {
	return JSON.stringify(String(值));
}

function 提取YAML字段值(文本, 字段) {
	const 字段名 = YAML字段正则转义(字段);
	const 匹配 = String(文本).match(new RegExp(`${字段名}\\s*:\\s*("[^"]*"|'[^']*'|[^,}\\]\\n#]+)`));
	return 匹配 ? YAML标量去引号(匹配[1]) : null;
}

function 替换YAML字段值(文本, 字段, 新值) {
	const 字段名 = YAML字段正则转义(字段);
	return String(文本).replace(new RegExp(`(${字段名}\\s*:\\s*)("[^"]*"|'[^']*'|[^,}\\]\\n#]+)`), `$1${YAML引用字符串(新值)}`);
}

function 查找YAML顶级段落(行列表, 段落名列表) {
	const 段落名集合 = new Set(段落名列表);
	let 开始 = -1;
	for (let i = 0; i < 行列表.length; i++) {
		const 匹配 = 行列表[i].match(/^([A-Za-z0-9_-]+):\s*(?:#.*)?$/);
		if (匹配 && 段落名集合.has(匹配[1])) {
			开始 = i;
			break;
		}
	}
	if (开始 === -1) return null;
	let 结束 = 行列表.length;
	for (let i = 开始 + 1; i < 行列表.length; i++) {
		if (/^[A-Za-z0-9_-]+:\s*(?:#.*)?$/.test(行列表[i])) {
			结束 = i;
			break;
		}
	}
	return { 开始, 结束 };
}

function 替换或插入主配置DNS段落(主配置文本, dnsBlock) {
	const 行列表 = 主配置文本.split('\n');
	const DNS段落 = 查找YAML顶级段落(行列表, ['dns']);
	const DNS行列表 = String(dnsBlock || '').trimEnd().split('\n');
	if (!dnsBlock) return 主配置文本;
	if (!DNS段落) return DNS行列表.join('\n') + '\n' + 主配置文本.replace(/^\n+/, '');
	行列表.splice(DNS段落.开始, DNS段落.结束 - DNS段落.开始, ...DNS行列表);
	return 行列表.join('\n');
}

function 收集主配置代理名称(行列表, 开始, 结束) {
	const 名称集合 = new Set();
	for (let i = 开始; i < 结束; i++) {
		const 名称 = 提取YAML字段值(行列表[i], 'name');
		if (名称) 名称集合.add(名称);
	}
	return 名称集合;
}

function 规范化主配置代理条目(item) {
		if (typeof item === 'string') {
			const yaml = item.trimStart().startsWith('-') ? `  ${item.trimStart()}` : `  - ${item}`;
			return { name: 提取YAML字段值(yaml, 'name'), yaml };
		}
		const yaml = String(item?.yaml || '').trimStart().startsWith('-') ? `  ${String(item.yaml).trimStart()}` : String(item?.yaml || '');
		return { name: item?.name || 提取YAML字段值(yaml, 'name'), yaml };
}

function 个人主配置代理条目列表(主配置 = {}) {
	return (Array.isArray(主配置.proxies) ? 主配置.proxies : []).map(规范化主配置代理条目).filter(item => item.name && item.yaml);
}

function 合并主配置代理条目(条目列表 = []) {
	const 已有名称 = new Set(), output = [];
	for (const item of 条目列表) {
		if (!item?.name || !item?.yaml || 已有名称.has(item.name)) continue;
		已有名称.add(item.name);
		output.push(item);
	}
	return output;
}

function 个人主配置代理名称列表(主配置 = {}) {
	return 个人主配置代理条目列表(主配置).map(item => item.name);
}

function 添加个人主配置代理(主配置文本, 主配置 = {}) {
	const 条目列表 = 个人主配置代理条目列表(主配置);
	if (条目列表.length === 0) return 主配置文本;
	const 行列表 = 主配置文本.split('\n');
	const 代理段落 = 查找YAML顶级段落(行列表, ['proxies']);
	if (!代理段落) return `proxies:\n${条目列表.map(item => item.yaml).join('\n')}\n` + 主配置文本.replace(/^\n+/, '');
	const 已有名称 = 收集主配置代理名称(行列表, 代理段落.开始 + 1, 代理段落.结束);
	const 待添加条目 = 条目列表.filter(item => !已有名称.has(item.name)).map(item => item.yaml);
	if (待添加条目.length === 0) return 主配置文本;
	let 插入位置 = 代理段落.结束;
	while (插入位置 > 代理段落.开始 + 1 && 行列表[插入位置 - 1].trim() === '') 插入位置--;
	行列表.splice(插入位置, 0, ...待添加条目);
	return 行列表.join('\n');
}

function 渲染主配置代理引用列表(代理名称列表) {
	return 代理名称列表.map(名称 => ['DIRECT', 'REJECT', 'REJECT-DROP', 'GLOBAL'].includes(名称) ? 名称 : YAML引用字符串(名称)).join(', ');
}

function 渲染主配置Provider引用列表(provider名称列表) {
	return provider名称列表.map(名称 => YAML引用字符串(名称)).join(', ');
}

function 去掉开头国旗Emoji(名称 = '') {
	return String(名称 || '').replace(/^(?:[\u{1F1E6}-\u{1F1FF}]{2}\s*)+/u, '');
}

function 代理名称匹配模式(名称, 模式) {
	const 文本 = String(名称 || '');
	const pattern = String(模式 || '');
	if (!pattern.endsWith('*')) return 文本 === pattern;
	const prefix = pattern.slice(0, -1);
	return 文本.startsWith(prefix) || 去掉开头国旗Emoji(文本).startsWith(prefix);
}

function 解析实际代理名称(名称, 可选代理名称列表 = []) {
	return 可选代理名称列表.find(候选 => 候选 === 名称 || 去掉开头国旗Emoji(候选) === 名称) || 名称;
}

function 展开代理名称列表(代理名称列表 = [], 可选代理名称列表 = []) {
	const result = [];
	for (const 名称 of 代理名称列表.map(item => String(item || '').trim()).filter(Boolean)) {
		const 展开列表 = 名称.endsWith('*') ? 可选代理名称列表.filter(候选 => 代理名称匹配模式(候选, 名称)) : [解析实际代理名称(名称, 可选代理名称列表)];
		for (const 展开名称 of 展开列表) if (展开名称 && !result.includes(展开名称)) result.push(展开名称);
	}
	return result;
}

function 合并主配置分组代理(已有名称列表, 待添加名称列表 = [], 优先名称列表 = []) {
	const result = 已有名称列表.filter(Boolean);
	for (const 名称 of 待添加名称列表) if (名称 && !result.includes(名称)) result.push(名称);
	for (let i = 优先名称列表.length - 1; i >= 0; i--) {
		const 名称 = 优先名称列表[i];
		if (!名称) continue;
		const index = result.indexOf(名称);
		if (index >= 0) result.splice(index, 1);
		result.unshift(名称);
	}
	return result;
}

function 获取主配置分组优先代理列表(分组名, 主配置 = {}) {
	const groupDefaults = 主配置.groupDefaults || {};
	if (!分组名 || !groupDefaults || typeof groupDefaults !== 'object') return [];
	if (Array.isArray(groupDefaults[分组名])) return groupDefaults[分组名];
	const 匹配键 = Object.keys(groupDefaults).find(key => key.toLowerCase() === String(分组名).toLowerCase());
	return 匹配键 && Array.isArray(groupDefaults[匹配键]) ? groupDefaults[匹配键] : [];
}

function 更新Flow主配置代理列表(行文本, 分组名, 主配置 = {}) {
	const 待添加代理名称列表 = 主配置.addProxiesToGroups === false ? [] : 个人主配置代理名称列表(主配置);
	const 优先代理名称列表 = 获取主配置分组优先代理列表(分组名, 主配置);
	if (待添加代理名称列表.length === 0 && 优先代理名称列表.length === 0) return 行文本;
	return 行文本.replace(/(proxies\s*:\s*\[)([^\]]*)(\])/, (_, 前缀, 内容, 后缀) => {
		const 代理名称列表 = 内容.split(',').map(item => YAML标量去引号(item)).filter(Boolean);
		return 前缀 + 渲染主配置代理引用列表(合并主配置分组代理(代理名称列表, 待添加代理名称列表, 优先代理名称列表)) + 后缀;
	});
}

function 处理Block主配置分组(分组行列表, 主配置 = {}) {
	if (分组行列表.length === 0) return 分组行列表;
	const 分组名 = 提取YAML字段值(分组行列表[0], 'name');
	for (let i = 0; i < 分组行列表.length; i++) {
		if (/\bproxies\s*:\s*\[/.test(分组行列表[i])) {
			分组行列表[i] = 更新Flow主配置代理列表(分组行列表[i], 分组名, 主配置);
			continue;
		}
		if (!/^\s*proxies\s*:\s*(?:#.*)?$/.test(分组行列表[i])) continue;
		const 代理列表缩进 = 分组行列表[i].search(/\S/);
		let 列表结束 = i + 1, 子项缩进 = 代理列表缩进 + 2;
		const 已有名称 = [];
		for (let j = i + 1; j < 分组行列表.length; j++) {
			const 下一行 = 分组行列表[j];
			const 去空白 = 下一行.trim();
			if (!去空白) {
				列表结束 = j + 1;
				continue;
			}
			const 缩进 = 下一行.search(/\S/);
			if (缩进 <= 代理列表缩进) break;
			const 子项匹配 = 下一行.match(/^(\s*)-\s*(.+?)\s*(?:#.*)?$/);
			if (子项匹配) {
				子项缩进 = 子项匹配[1].length;
				已有名称.push(YAML标量去引号(子项匹配[2]));
			}
			列表结束 = j + 1;
		}
		const 待添加代理名称列表 = 主配置.addProxiesToGroups === false ? [] : 个人主配置代理名称列表(主配置);
		const 优先代理名称列表 = 获取主配置分组优先代理列表(分组名, 主配置);
		const 代理名称列表 = 合并主配置分组代理(已有名称, 待添加代理名称列表, 优先代理名称列表);
		分组行列表.splice(i + 1, 列表结束 - (i + 1), ...代理名称列表.map(名称 => `${' '.repeat(子项缩进)}- ${YAML引用字符串(名称)}`));
		break;
	}
	return 分组行列表;
}

function 添加个人主配置代理到分组(主配置文本, 主配置 = {}) {
	const 行列表 = 主配置文本.split('\n');
	const 分组段落 = 查找YAML顶级段落(行列表, ['proxy-groups', 'proxy_groups']);
	if (!分组段落) return 主配置文本;
	let 分组结束 = 分组段落.结束;
	for (let i = 分组段落.开始 + 1; i < 分组结束;) {
		if (/^\s*-\s*\{/.test(行列表[i])) {
			const 分组名 = 提取YAML字段值(行列表[i], 'name');
			行列表[i] = 更新Flow主配置代理列表(行列表[i], 分组名, 主配置);
			i++;
			continue;
		}
		if (!/^\s*-\s*name\s*:/.test(行列表[i])) {
			i++;
			continue;
		}
		const 分组开始 = i;
		const 基础缩进 = 行列表[i].search(/\S/);
		let 块结束 = i + 1;
		for (let j = i + 1; j < 分组结束; j++) {
			const 去空白 = 行列表[j].trim();
			if (!去空白) {
				块结束 = j + 1;
				continue;
			}
			const 缩进 = 行列表[j].search(/\S/);
			if (缩进 <= 基础缩进 && /^\s*-\s*/.test(行列表[j])) break;
			块结束 = j + 1;
		}
		const 原块长度 = 块结束 - 分组开始;
		const 新块 = 处理Block主配置分组(行列表.slice(分组开始, 块结束), 主配置);
		行列表.splice(分组开始, 原块长度, ...新块);
		分组结束 += 新块.length - 原块长度;
		i = 分组开始 + 新块.length;
	}
	return 行列表.join('\n');
}

function 收集主配置全部代理名称(行列表) {
	const 代理段落 = 查找YAML顶级段落(行列表, ['proxies']);
	if (!代理段落) return [];
	return Array.from(收集主配置代理名称(行列表, 代理段落.开始 + 1, 代理段落.结束));
}

function 渲染个人主配置分组(group, 可选代理名称列表 = []) {
	if (!group || typeof group !== 'object' || !group.name) return '';
	const type = group.type || 'select';
	const proxies = 展开代理名称列表(Array.isArray(group.proxies) ? group.proxies : [], 可选代理名称列表);
	const use = Array.isArray(group.use) ? group.use.map(item => String(item || '').trim()).filter(Boolean) : [];
	if (proxies.length === 0 && use.length === 0) return '';
	const parts = [
		`name: ${YAML引用字符串(group.name)}`,
		`type: ${type}`,
	];
	if (proxies.length > 0) parts.push(`proxies: [${渲染主配置代理引用列表(proxies)}]`);
	if (use.length > 0) parts.push(`use: [${渲染主配置Provider引用列表(use)}]`);
	return `  - {${parts.join(', ')}}`;
}

function 渲染个人主配置Provider(provider) {
	if (!provider || typeof provider !== 'object' || !provider.name || !provider.url) return '';
	const 名称 = String(provider.name).trim();
	const type = provider.type || 'http';
	const interval = Number(provider.interval ?? 3600) || 3600;
	const path = provider.path || `./proxy-providers/${名称}.yaml`;
	const healthCheck = provider.healthCheck === false ? null : (provider.healthCheck && typeof provider.healthCheck === 'object' ? provider.healthCheck : {});
	const lines = [
		`  ${YAML引用字符串(名称)}:`,
		`    type: ${type}`,
		`    url: ${YAML引用字符串(provider.url)}`,
		`    interval: ${interval}`,
		`    path: ${YAML引用字符串(path)}`,
	];
	if (healthCheck) {
		lines.push(
			'    health-check:',
			`      enable: ${healthCheck.enable === false ? 'false' : 'true'}`,
			`      interval: ${Number(healthCheck.interval ?? 600) || 600}`,
			`      url: ${YAML引用字符串(healthCheck.url || 'https://www.gstatic.com/generate_204')}`,
		);
	}
	return lines.join('\n');
}

function 移除已有个人主配置分组(行列表, 分组段落, 分组名集合) {
	let 分组结束 = 分组段落.结束;
	for (let i = 分组结束 - 1; i > 分组段落.开始; i--) {
		if (!/^\s*-\s*/.test(行列表[i])) continue;
		const 分组开始 = i;
		const 基础缩进 = 行列表[i].search(/\S/);
		let 块结束 = i + 1;
		for (let j = i + 1; j < 分组结束; j++) {
			const 去空白 = 行列表[j].trim();
			if (!去空白) {
				块结束 = j + 1;
				continue;
			}
			const 缩进 = 行列表[j].search(/\S/);
			if (缩进 <= 基础缩进 && /^\s*-\s*/.test(行列表[j])) break;
			块结束 = j + 1;
		}
		const 分组名 = 提取YAML字段值(行列表.slice(分组开始, 块结束).join('\n'), 'name');
		if (!分组名集合.has(分组名)) continue;
		行列表.splice(分组开始, 块结束 - 分组开始);
		分组结束 -= 块结束 - 分组开始;
	}
}

function 添加个人主配置分组(主配置文本, 主配置 = {}) {
	const groups = Array.isArray(主配置.groups) ? 主配置.groups : [];
	if (groups.length === 0) return 主配置文本;
	const 行列表 = 主配置文本.split('\n');
	const 可选代理名称列表 = 收集主配置全部代理名称(行列表);
	const 待插入分组 = groups.map(group => 渲染个人主配置分组(group, 可选代理名称列表)).filter(Boolean);
	if (待插入分组.length === 0) return 主配置文本;
	let 分组段落 = 查找YAML顶级段落(行列表, ['proxy-groups', 'proxy_groups']);
	if (!分组段落) {
		const 代理段落 = 查找YAML顶级段落(行列表, ['proxies']);
		const 插入位置 = 代理段落 ? 代理段落.结束 : 0;
		行列表.splice(插入位置, 0, 'proxy-groups:', ...待插入分组);
		return 行列表.join('\n');
	}
	移除已有个人主配置分组(行列表, 分组段落, new Set(groups.map(group => String(group?.name || '')).filter(Boolean)));
	分组段落 = 查找YAML顶级段落(行列表, ['proxy-groups', 'proxy_groups']);
	行列表.splice(分组段落.开始 + 1, 0, ...待插入分组);
	return 行列表.join('\n');
}

function 添加个人主配置规则(主配置文本, 主配置 = {}) {
	const 规则列表 = Array.isArray(主配置.rules) ? 主配置.rules : [];
	if (规则列表.length === 0) return 主配置文本;
	const 行列表 = 主配置文本.split('\n');
	const 规则段落 = 查找YAML顶级段落(行列表, ['rules']);
	const 已有规则 = new Set(行列表.map(line => line.trim().replace(/^-\s*/, '')));
	const 待添加规则 = 规则列表.filter(rule => !已有规则.has(rule)).map(rule => `  - ${rule}`);
	if (待添加规则.length === 0) return 主配置文本;
	if (!规则段落) return 主配置文本.replace(/\s*$/, '\n') + `rules:\n${待添加规则.join('\n')}\n`;
	行列表.splice(规则段落.开始 + 1, 0, ...待添加规则);
	return 行列表.join('\n');
}

function 含国旗Emoji(文本 = '') {
	return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(String(文本));
}

function 获取主配置代理国旗Emoji(名称 = '', 节点文本 = '', 主配置 = {}) {
	const 文本 = `${名称} ${节点文本}`;
	const server = 提取YAML字段值(节点文本, 'server') || '';
	const servers = 主配置?.emoji?.servers || {};
	if (servers[server]) return servers[server];
	for (const item of Array.isArray(主配置?.emoji?.patterns) ? 主配置.emoji.patterns : []) {
		try {
			if (item?.flag && new RegExp(item.match, 'i').test(文本)) return item.flag;
		} catch (_) { }
	}
	return '🇺🇸';
}

function 补齐主配置代理名称国旗(名称, 节点文本 = '', 主配置 = {}) {
	if (!名称 || 含国旗Emoji(名称) || ['DIRECT', 'REJECT', 'REJECT-DROP', 'GLOBAL'].includes(名称)) return 名称;
	return `${获取主配置代理国旗Emoji(名称, 节点文本, 主配置)} ${名称}`;
}

function 使用映射替换Flow代理列表(行文本, 重命名映射) {
	return 行文本.replace(/(proxies\s*:\s*\[)([^\]]*)(\])/, (_, 前缀, 内容, 后缀) => {
		const 代理名称列表 = 内容.split(',').map(item => YAML标量去引号(item)).filter(Boolean).map(名称 => 重命名映射.get(名称) || 名称);
		return 前缀 + 渲染主配置代理引用列表(代理名称列表) + 后缀;
	});
}

function 替换主配置分组代理引用(行列表, 重命名映射) {
	const 分组段落 = 查找YAML顶级段落(行列表, ['proxy-groups', 'proxy_groups']);
	if (!分组段落) return;
	for (let i = 分组段落.开始 + 1; i < 分组段落.结束; i++) {
		if (/\bproxies\s*:\s*\[/.test(行列表[i])) {
			行列表[i] = 使用映射替换Flow代理列表(行列表[i], 重命名映射);
			continue;
		}
		if (!/^\s*proxies\s*:\s*(?:#.*)?$/.test(行列表[i])) continue;
		const 代理列表缩进 = 行列表[i].search(/\S/);
		for (let j = i + 1; j < 分组段落.结束; j++) {
			const 下一行 = 行列表[j];
			const 去空白 = 下一行.trim();
			if (!去空白) continue;
			const 缩进 = 下一行.search(/\S/);
			if (缩进 <= 代理列表缩进) break;
			const 子项匹配 = 下一行.match(/^(\s*)-\s*(.+?)\s*(?:#.*)?$/);
			if (!子项匹配) continue;
			const 原名称 = YAML标量去引号(子项匹配[2]);
			const 新名称 = 重命名映射.get(原名称);
			if (新名称) 行列表[j] = `${子项匹配[1]}- ${YAML引用字符串(新名称)}`;
		}
	}
}

function 补齐主配置代理国旗(主配置文本, 主配置 = {}) {
	const 行列表 = 主配置文本.split('\n');
	const 代理段落 = 查找YAML顶级段落(行列表, ['proxies']);
	if (!代理段落) return 主配置文本;
	const 重命名映射 = new Map();
	for (let i = 代理段落.开始 + 1; i < 代理段落.结束; i++) {
		if (/^\s*-\s*\{/.test(行列表[i])) {
			const 原名称 = 提取YAML字段值(行列表[i], 'name');
			const 新名称 = 补齐主配置代理名称国旗(原名称, 行列表[i], 主配置);
			if (原名称 && 新名称 !== 原名称) {
				行列表[i] = 替换YAML字段值(行列表[i], 'name', 新名称);
				重命名映射.set(原名称, 新名称);
			}
			continue;
		}
		const 名称行匹配 = 行列表[i].match(/^(\s*-\s*name\s*:\s*)("[^"]*"|'[^']*'|.+?)\s*(?:#.*)?$/);
		if (!名称行匹配) continue;
		let 节点结束 = i + 1;
		const 基础缩进 = 行列表[i].search(/\S/);
		for (let j = i + 1; j < 代理段落.结束; j++) {
			const 去空白 = 行列表[j].trim();
			if (!去空白) {
				节点结束 = j + 1;
				continue;
			}
			const 缩进 = 行列表[j].search(/\S/);
			if (缩进 <= 基础缩进 && /^\s*-\s*/.test(行列表[j])) break;
			节点结束 = j + 1;
		}
		const 原名称 = YAML标量去引号(名称行匹配[2]);
		const 节点文本 = 行列表.slice(i, 节点结束).join('\n');
		const 新名称 = 补齐主配置代理名称国旗(原名称, 节点文本, 主配置);
		if (原名称 && 新名称 !== 原名称) {
			行列表[i] = `${名称行匹配[1]}${YAML引用字符串(新名称)}`;
			重命名映射.set(原名称, 新名称);
		}
	}
	if (重命名映射.size > 0) 替换主配置分组代理引用(行列表, 重命名映射);
	return 行列表.join('\n');
}

function 应用个人文本配置(主配置文本, 配置 = {}) {
	const 个人配置 = 规范化个人订阅配置(配置);
	if (!个人配置.enabled) return 主配置文本;
	const 主配置 = 个人配置[主配置键] || {};
	let patched = 主配置文本;
	if (主配置.dns) patched = 替换或插入主配置DNS段落(patched, 主配置.dns);
	patched = 添加个人主配置代理(patched, 主配置);
	patched = 添加个人主配置代理到分组(patched, 主配置);
	patched = 添加个人主配置规则(patched, 主配置);
	patched = 补齐主配置代理国旗(patched, 主配置);
	patched = 添加个人主配置分组(patched, 主配置);
	return patched;
}

function 生成个人主配置(配置 = {}, 额外代理列表 = []) {
	const 个人配置 = 规范化个人订阅配置(配置);
	if (!个人配置.enabled) return '';
	const 主配置 = 个人配置[主配置键] || {};
	const proxies = 合并主配置代理条目([
		...个人主配置代理条目列表(主配置),
		...(Array.isArray(额外代理列表) ? 额外代理列表.map(规范化主配置代理条目).filter(item => item.name && item.yaml) : []),
	]);
	if (proxies.length === 0) return '';
	const proxyNames = proxies.map(item => item.name);
	const 原始分组 = Array.isArray(主配置.groups) ? 主配置.groups : [];
	const groupLines = 原始分组.map(group => 渲染个人主配置分组(group, proxyNames)).filter(Boolean);
	const 包含Proxy分组 = 原始分组.some(group => group && typeof group === 'object' && String(group.name || '').trim() === 'Proxy');
	if (!包含Proxy分组) groupLines.unshift(`  - {name: Proxy, type: select, proxies: [${渲染主配置代理引用列表(proxyNames)}]}`);
	const providerLines = (Array.isArray(主配置.proxyProviders) ? 主配置.proxyProviders : []).map(渲染个人主配置Provider).filter(Boolean);
	const rules = (Array.isArray(主配置.rules) ? 主配置.rules : []).map(rule => String(rule || '').trim()).filter(Boolean);
	const hasTerminalRule = rules.some(rule => /^MATCH,/i.test(rule));
	const dns = String(主配置.dns || '').trim();
	const output = [];
	if (dns) output.push(dns, '');
	output.push(
		'mixed-port: 7890',
		'allow-lan: true',
		'mode: rule',
		'log-level: info',
		'',
		'proxies:',
		...proxies.map(item => item.yaml),
		'',
	);
	if (providerLines.length > 0) output.push('proxy-providers:', ...providerLines, '');
	output.push(
		'proxy-groups:',
		...groupLines,
		'',
		'rules:',
		...rules.map(rule => `  - ${rule}`),
		...(hasTerminalRule ? [] : ['  - MATCH,Proxy']),
		'',
	);
	return output.join('\n');
}

let 缓存CF优选列表 = null, 缓存CF优选列表Key = '', 缓存CF优选列表过期时间 = 0;

function 生成主配置优选代理列表(优选IP列表 = [], config_JSON = {}, 个人订阅配置 = {}, deps = {}) {
	const uuid = config_JSON.UUID || '';
	if (!uuid) return [];
	const host = (Array.isArray(config_JSON.HOSTS) && config_JSON.HOSTS.length > 0 ? config_JSON.HOSTS[0] : config_JSON.HOST || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
	if (!host) return [];
	const fingerprint = config_JSON.Fingerprint || 'chrome';
	const 节点路径 = deps.获取传输路径参数值(config_JSON, config_JSON.完整节点路径 || '/', false);
	const 网络类型 = config_JSON.传输协议 === 'grpc' ? 'grpc' : config_JSON.传输协议 === 'xhttp' ? 'xhttp' : 'ws';
	return 优选IP列表.map(原始地址 => {
		const 节点 = 解析优选节点地址(原始地址);
		if (!节点) return null;
		const 节点名称 = 添加个人节点地址到备注(节点.备注, 节点.地址, 个人订阅配置);
		const server = 节点.地址.replace(/^\[|\]$/g, '');
		const common = `name: ${YAML引用字符串(节点名称)}, type: vless, server: ${YAML引用字符串(server)}, port: ${节点.端口}, uuid: ${YAML引用字符串(uuid)}, network: ${网络类型}, tls: true, udp: true, servername: ${YAML引用字符串(host)}, client-fingerprint: ${YAML引用字符串(fingerprint)}`;
		let opts = '';
		if (网络类型 === 'grpc') {
			opts = `, grpc-opts: {grpc-service-name: ${YAML引用字符串(节点路径.split('?')[0] || '/')}}`;
		} else if (网络类型 === 'ws') {
			opts = `, ws-opts: {path: ${YAML引用字符串(节点路径)}, headers: {Host: ${YAML引用字符串(host)}}}`;
		}
		return { name: 节点名称, yaml: `  - {${common}${opts}}` };
	}).filter(Boolean);
}

async function 读取本地优选列表(request, env = {}, config_JSON = {}, deps = {}) {
	const 本地IP库 = config_JSON.优选订阅生成?.本地IP库 || {};
	if (本地IP库.随机IP !== false) return (await deps.生成随机IP(request, 本地IP库.随机数量 || 16, 本地IP库.指定端口 ?? -1))[0];
	const addText = await env.KV?.get?.('ADD.txt');
	if (addText) return await deps.整理成数组(addText);
	return (await deps.生成随机IP(request, 本地IP库.随机数量 || 16, 本地IP库.指定端口 ?? -1))[0];
}

function 获取CF优选缓存Key(config_JSON = {}) {
	const 本地IP库 = config_JSON.优选订阅生成?.本地IP库 || {};
	return JSON.stringify({
		randomIP: 本地IP库.随机IP !== false,
		count: 本地IP库.随机数量 || 16,
		port: 本地IP库.指定端口 ?? -1,
	});
}

async function 读取缓存优选列表(request, env = {}, config_JSON = {}, deps = {}) {
	const 本地IP库 = config_JSON.优选订阅生成?.本地IP库 || {};
	const ttlSeconds = Math.max(0, Number(本地IP库.缓存秒 ?? 本地IP库.cacheSeconds ?? 300) || 0);
	const cacheKey = 获取CF优选缓存Key(config_JSON);
	const now = Date.now();
	if (ttlSeconds > 0 && 缓存CF优选列表 && 缓存CF优选列表Key === cacheKey && 缓存CF优选列表过期时间 > now) return [...缓存CF优选列表];
	const 列表 = await 读取本地优选列表(request, env, config_JSON, deps);
	if (ttlSeconds > 0) {
		缓存CF优选列表 = [...列表];
		缓存CF优选列表Key = cacheKey;
		缓存CF优选列表过期时间 = now + ttlSeconds * 1000;
	}
	return 列表;
}

function 解析优选节点地址(原始地址 = '') {
	const 文本 = String(原始地址 || '').trim();
	if (!文本 || 文本.toLowerCase().includes('://') || /\bsub\s*=/i.test(文本)) return null;
	const 匹配 = 文本.match(/^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/);
	if (!匹配) return null;
	return {
		地址: 匹配[1],
		端口: 匹配[2] || '443',
		备注: 匹配[3] || 匹配[1].replace(/^\[|\]$/g, ''),
	};
}

async function 准备个人输出({ request, env = {}, config_JSON = {}, 订阅类型 = '', 个人订阅配置 = {}, deps = {} }) {
	const 主配置优选代理列表 = 订阅类型 === 主配置键
		? 生成主配置优选代理列表(await 读取缓存优选列表(request, env, config_JSON, deps), config_JSON, 个人订阅配置, deps)
		: [];
	const 个人主配置内容 = 订阅类型 === 主配置键 ? 生成个人主配置(个人订阅配置, 主配置优选代理列表) : '';
	return {
		内容: 个人主配置内容 || '',
		使用主配置: Boolean(个人主配置内容 && /^proxies:\s*$|^dns:\s*$/m.test(个人主配置内容)),
	};
}

export {
	读取个人订阅配置,
	添加个人节点地址到备注,
	应用个人文本配置,
	准备个人输出,
};
