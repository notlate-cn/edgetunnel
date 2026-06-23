#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env.local ]]; then
	set -a
	source .env.local
	set +a
fi

args=("$@")
has_namespace_id=false
for arg in "${args[@]}"; do
	if [[ "$arg" == "--namespace-id" ]]; then
		has_namespace_id=true
		break
	fi
done

if [[ ${#args[@]} -eq 0 || "${args[0]}" == --* ]]; then
	args=("custom-subscription.private.json" "${args[@]}")
fi

if [[ "$has_namespace_id" == false && -n "${KV_NAMESPACE_ID:-}" ]]; then
	args+=("--namespace-id" "$KV_NAMESPACE_ID")
fi

exec node tools/deploy-custom-subscription.mjs "${args[@]}"
