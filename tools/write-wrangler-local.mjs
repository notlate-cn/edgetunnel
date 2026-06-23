#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function printUsage() {
	console.log(`Usage:
  node tools/write-wrangler-local.mjs [options]

Options:
  --env <path>           Environment file. Default: .env.local
  --base <path>          Public Wrangler template. Default: wrangler.toml
  --output <path>        Local Wrangler config. Default: wrangler.local.toml
  --namespace-id <id>    Override KV_NAMESPACE_ID from the env file

Example:
  node tools/write-wrangler-local.mjs
`);
}

function parseArgs(argv) {
	const options = {
		env: '.env.local',
		base: 'wrangler.toml',
		output: 'wrangler.local.toml',
		namespaceId: '',
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '-h' || arg === '--help') {
			options.help = true;
		} else if (arg === '--env') {
			options.env = argv[++i] || '';
		} else if (arg === '--base') {
			options.base = argv[++i] || '';
		} else if (arg === '--output') {
			options.output = argv[++i] || '';
		} else if (arg === '--namespace-id') {
			options.namespaceId = argv[++i] || '';
		} else {
			throw new Error(`unknown option ${arg}`);
		}
	}

	if (!options.env) throw new Error('--env must not be empty');
	if (!options.base) throw new Error('--base must not be empty');
	if (!options.output) throw new Error('--output must not be empty');
	return options;
}

function parseEnv(content) {
	const env = {};
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
		const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match) continue;
		let value = match[2].trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		env[match[1]] = value;
	}
	return env;
}

function stripUncommentedKvNamespaceBlocks(toml) {
	const lines = toml.replace(/\r\n/g, '\n').split('\n');
	const kept = [];

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (line.trim() !== '[[kv_namespaces]]') {
			kept.push(line);
			continue;
		}

		for (i += 1; i < lines.length; i += 1) {
			const nextLine = lines[i];
			const trimmed = nextLine.trim();
			if (trimmed.startsWith('[') && trimmed !== '[[kv_namespaces]]') {
				i -= 1;
				break;
			}
		}
	}

	return kept.join('\n').replace(/\s+$/, '\n');
}

function tomlString(value) {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

try {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printUsage();
		process.exit(0);
	}

	const env = parseEnv(readFileSync(options.env, 'utf8'));
	const namespaceId = options.namespaceId || env.KV_NAMESPACE_ID || '';
	if (!namespaceId) throw new Error(`KV namespace id is required: set KV_NAMESPACE_ID in ${options.env} or pass --namespace-id`);

	const baseConfig = readFileSync(options.base, 'utf8');
	const localConfig = `${stripUncommentedKvNamespaceBlocks(baseConfig)}
[[kv_namespaces]]
binding = "KV"
id = ${tomlString(namespaceId)}
`;

	writeFileSync(options.output, localConfig);
	console.log(`Wrote ${resolve(options.output)} from ${resolve(options.base)}`);
} catch (error) {
	console.error(`Failed to write local Wrangler config: ${error.message}`);
	printUsage();
	process.exit(1);
}
