import { buildCustomSubscription, collectClashExpandableRuleSetUrls } from './custom-subscription-builder.mjs';

const DEFAULT_FETCH_TIMEOUT_MS = 30000;

async function fetchRuleSetText(url) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			headers: { 'user-agent': 'edgetunnel-custom-subscription-builder' },
			signal: controller.signal,
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.text();
	} catch (error) {
		throw new Error(`failed to download ${url}: ${error.message}`);
	} finally {
		clearTimeout(timeout);
	}
}

export async function loadClashRuleSetContents(config) {
	const preview = buildCustomSubscription(config);
	const urls = collectClashExpandableRuleSetUrls(preview.shadowrocket.rules, config);
	if (urls.length === 0) return {};
	const entries = await Promise.all(urls.map(async url => [url, await fetchRuleSetText(url)]));
	console.log(`Fetched ${entries.length} remote rule sets for Clash expansion`);
	return Object.fromEntries(entries);
}
