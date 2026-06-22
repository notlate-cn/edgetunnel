#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildCustomSubscription, stringifyCustomSubscription } from './custom-subscription-builder.mjs';

function printUsage() {
	console.log(`Usage:
  node tools/build-custom-subscription.mjs [input] [output]

Defaults:
  input   custom-subscription.private.json
  output  custom-subscription.json
`);
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
	printUsage();
	process.exit(0);
}

const [inputPath = 'custom-subscription.private.json', outputPath = 'custom-subscription.json'] = args;

try {
	const compactConfig = JSON.parse(readFileSync(inputPath, 'utf8'));
	const generatedConfig = buildCustomSubscription(compactConfig);
	writeFileSync(outputPath, stringifyCustomSubscription(generatedConfig));
	console.log(`Wrote ${resolve(outputPath)} from ${resolve(inputPath)}`);
} catch (error) {
	console.error(`Failed to build custom subscription: ${error.message}`);
	process.exit(1);
}
