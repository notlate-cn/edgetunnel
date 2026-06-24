#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_BASE = 'https://raw.githubusercontent.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever/release';
const OUTPUT_DIR = resolve(REPO_ROOT, 'rules/shadowrocket');

function usage() {
	console.log(`Usage:
  node tools/sync-shadowrocket-johnshall-rules.mjs [--offline <repo-path>]

Downloads Johnshall Shadowrocket rule files and writes derived rule files under rules/shadowrocket.
`);
}

function extractRuleLines(text, { stripPolicy = false, dropFinal = false } = {}) {
	const output = [];
	let inRule = false;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === '[Rule]') {
			inRule = true;
			continue;
		}
		if (inRule && line.startsWith('[')) break;
		if (!inRule || !line || line.startsWith('#')) continue;
		if (dropFinal && /^FINAL,/i.test(line)) continue;
		if (!stripPolicy) {
			output.push(line);
			continue;
		}
		const parts = line.split(',').map(part => part.trim());
		if (parts.length < 3) continue;
		const policyIndex = parts.at(-1) === 'no-resolve' ? parts.length - 2 : parts.length - 1;
		parts.splice(policyIndex, 1);
		output.push(parts.join(','));
	}
	return output;
}

async function readSource(fileName, offlineRepo) {
	if (offlineRepo) return readFileSync(resolve(offlineRepo, fileName), 'utf8');
	const response = await fetch(`${SOURCE_BASE}/${fileName}`);
	if (!response.ok) throw new Error(`failed to download ${fileName}: HTTP ${response.status}`);
	return response.text();
}

function parseArgs(argv) {
	const options = { offlineRepo: '' };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '-h' || arg === '--help') {
			options.help = true;
		} else if (arg === '--offline') {
			options.offlineRepo = argv[++i] || '';
		} else {
			throw new Error(`unknown argument ${arg}`);
		}
	}
	return options;
}

try {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		usage();
		process.exit(0);
	}

	mkdirSync(OUTPUT_DIR, { recursive: true });
	const adOnly = await readSource('sr_ad_only.conf', options.offlineRepo);
	const lazyGroup = await readSource('lazy_group.conf', options.offlineRepo);
	const adRules = extractRuleLines(adOnly, { stripPolicy: true });
	const lazyGroupRules = extractRuleLines(lazyGroup, { dropFinal: true });

	writeFileSync(resolve(OUTPUT_DIR, 'johnshall-ad-only.list'), `${adRules.join('\n')}\n`);
	writeFileSync(resolve(OUTPUT_DIR, 'johnshall-lazy-group.rules'), `${lazyGroupRules.join('\n')}\n`);
	console.log(`Wrote ${adRules.length} ad rules to rules/shadowrocket/johnshall-ad-only.list`);
	console.log(`Wrote ${lazyGroupRules.length} grouped rules to rules/shadowrocket/johnshall-lazy-group.rules`);
} catch (error) {
	console.error(`Failed to sync Johnshall rules: ${error.message}`);
	usage();
	process.exit(1);
}
