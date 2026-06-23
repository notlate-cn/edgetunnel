#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

args=("$@")
has_namespace_id=false
for arg in "${args[@]}"; do
	if [[ "$arg" == "--namespace-id" ]]; then
		has_namespace_id=true
		break
	fi
done

if [[ "$has_namespace_id" == false && -n "${KV_NAMESPACE_ID:-}" ]]; then
	args+=("--namespace-id" "$KV_NAMESPACE_ID")
fi

exec node tools/deploy-custom-subscription.mjs "${args[@]}"
