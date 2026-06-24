#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env.local ]]; then
	set -a
	source .env.local
	set +a
fi

has_namespace_id=false
for arg in "$@"; do
	if [[ "$arg" == "--namespace-id" ]]; then
		has_namespace_id=true
		break
	fi
done

if [[ $# -eq 0 || "${1:-}" == --* ]]; then
	args=("custom-subscription.private.json" "$@")
else
	args=("$@")
fi

if [[ "$has_namespace_id" == false && -n "${KV_NAMESPACE_ID:-}" ]]; then
	args+=("--namespace-id" "$KV_NAMESPACE_ID")
fi

node tools/deploy-custom-subscription.mjs "${args[@]}"

if [[ -z "${WORKER_HOST:-}" || -z "${UUID:-}" ]]; then
	echo
	echo "Subscription links skipped: set WORKER_HOST and UUID in .env.local to print them."
	exit 0
fi

token=$(node - <<'NODE' "$WORKER_HOST" "$UUID"
const crypto = require('node:crypto');
const [host, uuid] = process.argv.slice(2);
const md5 = value => crypto.createHash('md5').update(value).digest('hex');
const first = md5(`${host}${uuid}`);
console.log(md5(first.slice(7, 27)));
NODE
)

echo
echo "Subscription links:"
echo
echo "ClashMac:"
echo "https://${WORKER_HOST}/sub?token=${token}&clash"
echo
echo "Shadowrocket config (rules):"
echo "https://${WORKER_HOST}/sub?token=${token}&shadowrocket-conf"
echo
echo "Shadowrocket nodes (Subscribe):"
echo "https://${WORKER_HOST}/sub?token=${token}&shadowrocket-links"
