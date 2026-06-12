#!/usr/bin/env bash
# =============================================================================
# create-storage.sh  –  One-shot: resource group + storage account + file shares
#
# Run BEFORE azure-deploy.sh when storage does not exist yet.
# Idempotent: safely re-runnable (already-exists errors are suppressed).
#
# Usage:
#   chmod +x create-storage.sh
#   ./create-storage.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: .env not found"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

info()    { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
success() { echo -e "\033[1;32m[OK]\033[0m    $*"; }
die()     { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

for var in AZURE_SUBSCRIPTION_ID AZURE_RESOURCE_GROUP AZURE_LOCATION STORAGE_ACCOUNT_NAME; do
  [[ -z "${!var:-}" ]] && die "Required variable '$var' not set in .env"
done

info "Subscription: $AZURE_SUBSCRIPTION_ID"
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# ── Resource group ─────────────────────────────────────────────────────────────
info "Ensuring resource group '$AZURE_RESOURCE_GROUP' in '$AZURE_LOCATION' …"
az group create \
  --name     "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --output none
success "Resource group ready."

# ── Storage account ────────────────────────────────────────────────────────────
info "Creating storage account '$STORAGE_ACCOUNT_NAME' …"
az storage account create \
  --name              "$STORAGE_ACCOUNT_NAME" \
  --resource-group    "$AZURE_RESOURCE_GROUP" \
  --location          "$AZURE_LOCATION" \
  --sku               Standard_LRS \
  --kind              StorageV2 \
  --min-tls-version   TLS1_2 \
  --output none 2>/dev/null || true
success "Storage account ready."

STORAGE_KEY=$(az storage account keys list \
  --account-name   "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query          "[0].value" \
  --output tsv)

# ── File shares ────────────────────────────────────────────────────────────────
for share in app-storage caddy-config caddy-data; do
  info "Creating file share '$share' …"
  az storage share create \
    --name         "$share" \
    --account-name "$STORAGE_ACCOUNT_NAME" \
    --account-key  "$STORAGE_KEY" \
    --quota        50 \
    --output none 2>/dev/null || true
done
success "File shares created: app-storage, caddy-config, caddy-data"

echo ""
success "Storage ready — run ./azure-deploy.sh to deploy the app."
