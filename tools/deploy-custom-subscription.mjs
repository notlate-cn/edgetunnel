#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildCustomSubscription, stringifyCustomSubscription } from './custom-subscription-builder.mjs';

function printUsage() {
	console.log(`Usage:
  node tools/deploy-custom-subscription.mjs [input] --namespace-id <KV_NAMESPACE_ID> [options]

Options:
  --output <path>       Generated file path. Default: custom-subscription.json
  --key <name>          KV key name. Default: custom-subscription.json
  --wrangler <command>  Wrangler command. Default: npx wrangler
  --local              Upload to local Wrangler KV instead of remote Cloudflare KV
  --dry-run            Generate the file and print the upload command without running it

Example:
  node tools/deploy-custom-subscription.mjs custom-subscription.private.json --namespace-id abc123
`);
}

function parseArgs(argv) {
	const options = {
		input: 'custom-subscription.private.json',
		output: 'custom-subscription.json',
		key: 'custom-subscription.json',
		wrangler: 'npx wrangler',
		dryRun: false,
		remote: true,
		namespaceId: '',
	};
	const positionals = [];

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '-h' || arg === '--help') {
			options.help = true;
		} else if (arg === '--dry-run') {
			options.dryRun = true;
		} else if (arg === '--local') {
			options.remote = false;
		} else if (arg === '--namespace-id') {
			options.namespaceId = argv[++i] || '';
		} else if (arg === '--output') {
			options.output = argv[++i] || '';
		} else if (arg === '--key') {
			options.key = argv[++i] || '';
		} else if (arg === '--wrangler') {
			options.wrangler = argv[++i] || '';
		} else if (arg.startsWith('--')) {
			throw new Error(`unknown option ${arg}`);
		} else {
			positionals.push(arg);
		}
	}

	if (positionals[0]) options.input = positionals[0];
	if (!options.help && !options.namespaceId) throw new Error('--namespace-id is required');
	if (!options.output) throw new Error('--output must not be empty');
	if (!options.key) throw new Error('--key must not be empty');
	if (!options.wrangler) throw new Error('--wrangler must not be empty');
	return options;
}

function splitCommand(command) {
	return command.trim().split(/\s+/).filter(Boolean);
}

try {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printUsage();
		process.exit(0);
	}

	const compactConfig = JSON.parse(readFileSync(options.input, 'utf8'));
	const generatedConfig = buildCustomSubscription(compactConfig);
	writeFileSync(options.output, stringifyCustomSubscription(generatedConfig));
	console.log(`Wrote ${resolve(options.output)} from ${resolve(options.input)}`);

	const [command, ...prefixArgs] = splitCommand(options.wrangler);
	const wranglerArgs = [
		...prefixArgs,
		'kv',
		'key',
		'put',
		options.key,
		'--path',
		options.output,
		'--namespace-id',
		options.namespaceId,
	];
	if (options.remote) wranglerArgs.push('--remote');

	if (options.dryRun) {
		console.log(`Dry run: ${[command, ...wranglerArgs].join(' ')}`);
		process.exit(0);
	}

	const result = spawnSync(command, wranglerArgs, { stdio: 'inherit' });
	process.exit(result.status ?? 1);
} catch (error) {
	console.error(`Failed to deploy custom subscription: ${error.message}`);
	printUsage();
	process.exit(1);
}
