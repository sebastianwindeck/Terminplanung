#!/usr/bin/env bash
# =============================================================================
# azure-deploy.sh  –  Deploy Terminplanung as Azure Container Instance
#
# What this script does:
#   1. Creates a resource group (if needed)
#   2. Builds and pushes Docker images to Azure Container Registry
#   3. Creates Azure Storage Account + File Shares for persistent storage
#   4. Generates caddy.json from template → uploads to share
#   5. Creates (or updates) the ACI container-group
#   6. Runs Alembic migrations via az container exec
#
# Prerequisites:
#   - Azure CLI installed & logged in (az login)
#   - Docker installed and running
#   - .env file populated from .env.example
#
# Usage:
#   chmod +x azure-deploy.sh
#   ./azure-deploy.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: .env not found. Copy .env.example → .env"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
success() { echo -e "\033[1;32m[OK]\033[0m    $*"; }
die()     { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

# ── Required variables ────────────────────────────────────────────────────────
for var in AZURE_SUBSCRIPTION_ID AZURE_RESOURCE_GROUP AZURE_LOCATION \
           APP_DOMAIN LETSENCRYPT_EMAIL \
           DATABASE_URL SECRET_KEY; do
  [[ -z "${!var:-}" ]] && die "Required variable '$var' not set in .env"
done

ACI_GROUP_NAME="${ACI_GROUP_NAME:-terminplanung-group}"
ACI_DNS_LABEL="${ACI_DNS_LABEL:-terminplanung-$(echo "$AZURE_RESOURCE_GROUP" | tr '[:upper:]' '[:lower:]' | tr -d '-_')}"
STORAGE_ACCOUNT_NAME="${STORAGE_ACCOUNT_NAME:-tpstore$(echo "$AZURE_RESOURCE_GROUP" | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]' | cut -c1-10)}"
STORAGE_ACCOUNT_NAME="${STORAGE_ACCOUNT_NAME:0:24}"
ACR_NAME="${ACR_NAME:-tpregistry$(echo "$AZURE_RESOURCE_GROUP" | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]' | cut -c1-8)}"
ACR_NAME="${ACR_NAME:0:50}"

# ── Set subscription ──────────────────────────────────────────────────────────
info "Setting Azure subscription …"
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# ── Resource group ────────────────────────────────────────────────────────────
info "Ensuring resource group '$AZURE_RESOURCE_GROUP' in '$AZURE_LOCATION' …"
az group create \
  --name     "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --output none
success "Resource group ready."

# ── Container Registry ────────────────────────────────────────────────────────
# Ensure admin is enabled (no-op if registry already exists in another RG)
info "Ensuring Azure Container Registry '$ACR_NAME' has admin enabled …"
az acr update --name "$ACR_NAME" --admin-enabled true --output none 2>/dev/null || \
az acr create \
  --name           "$ACR_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --sku            Basic \
  --admin-enabled  true \
  --output none

ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
ACR_USER=$(az acr credential show --name "$ACR_NAME" --query username --output tsv)
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)
success "Container registry: $ACR_SERVER"

# ── Build and push images ─────────────────────────────────────────────────────
info "Building and pushing backend image …"
az acr build \
  --registry  "$ACR_NAME" \
  --image     "terminplanung-backend:latest" \
  --file      "${SCRIPT_DIR}/backend/Dockerfile" \
  "${SCRIPT_DIR}/backend"

info "Building and pushing frontend image …"
az acr build \
  --registry  "$ACR_NAME" \
  --image     "terminplanung-frontend:latest" \
  --file      "${SCRIPT_DIR}/frontend/Dockerfile" \
  "${SCRIPT_DIR}/frontend"
success "Images pushed."

# ── Storage Account ───────────────────────────────────────────────────────────
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

# ── File Shares ───────────────────────────────────────────────────────────────
for share in app-storage caddy-config caddy-data; do
  info "Creating file share '$share' …"
  az storage share create \
    --name           "$share" \
    --account-name   "$STORAGE_ACCOUNT_NAME" \
    --account-key    "$STORAGE_KEY" \
    --quota          50 \
    --output none 2>/dev/null || true
done
success "File shares created."

# ── Generate & upload caddy.json ──────────────────────────────────────────────
info "Generating caddy.json …"
CADDY_JSON=$(mktemp)
sed \
  -e "s|__APP_DOMAIN__|${APP_DOMAIN}|g" \
  -e "s|__LETSENCRYPT_EMAIL__|${LETSENCRYPT_EMAIL}|g" \
  "${SCRIPT_DIR}/caddy.json.template" > "$CADDY_JSON"

az storage file upload \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --account-key  "$STORAGE_KEY" \
  --share-name   "caddy-config" \
  --source       "$CADDY_JSON" \
  --path         "caddy.json" \
  --output none
rm -f "$CADDY_JSON"
success "caddy.json uploaded."

# ── Generate ACI container-group YAML ────────────────────────────────────────
info "Generating ACI container-group YAML …"
ACI_YAML=$(mktemp).yaml
sed \
  -e "s|__ACI_GROUP_NAME__|${ACI_GROUP_NAME}|g" \
  -e "s|__AZURE_LOCATION__|${AZURE_LOCATION}|g" \
  -e "s|__ACI_DNS_LABEL__|${ACI_DNS_LABEL}|g" \
  -e "s|__ACR_SERVER__|${ACR_SERVER}|g" \
  -e "s|__ACR_USER__|${ACR_USER}|g" \
  -e "s|__ACR_PASS__|${ACR_PASS}|g" \
  -e "s|__DATABASE_URL__|${DATABASE_URL}|g" \
  -e "s|__SECRET_KEY__|${SECRET_KEY}|g" \
  -e "s|__ANTHROPIC_API_KEY__|${ANTHROPIC_API_KEY:-}|g" \
  -e "s|__APP_DOMAIN__|${APP_DOMAIN}|g" \
  -e "s|__ALLOWED_ORIGINS__|[\"https://${APP_DOMAIN}\"]|g" \
  -e "s|__STORAGE_ACCOUNT_NAME__|${STORAGE_ACCOUNT_NAME}|g" \
  -e "s|__STORAGE_ACCOUNT_KEY__|${STORAGE_KEY}|g" \
  "${SCRIPT_DIR}/aci-container-group.yaml.template" > "$ACI_YAML"

# ── Delete + recreate ACI (force fresh image pull of :latest) ─────────────────
info "Deleting existing container group '$ACI_GROUP_NAME' (if any) …"
az container delete \
  --name           "$ACI_GROUP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --yes --output none 2>/dev/null || true

info "Creating ACI container group '$ACI_GROUP_NAME' …"
az container create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --file           "$ACI_YAML" \
  --output none
rm -f "$ACI_YAML"
success "Container group created."

# ── Wait for containers ───────────────────────────────────────────────────────
info "Waiting for containers to start …"
for i in $(seq 1 30); do
  STATE=$(az container show \
    --name           "$ACI_GROUP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query          "instanceView.state" \
    --output tsv 2>/dev/null || echo "Pending")
  if [[ "$STATE" == "Running" ]]; then
    success "Containers running."
    break
  fi
  echo "  State: $STATE (attempt $i/30) …"
  sleep 10
done

FQDN="${ACI_DNS_LABEL}.${AZURE_LOCATION}.azurecontainer.io"

# ── Verify migrations ran ─────────────────────────────────────────────────────
info "Backend startup logs (migrations + server):"
az container logs \
  --name           "$ACI_GROUP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --container-name backend 2>/dev/null | tail -30 || true

# Fail fast if the backend container exited (migration error)
BACKEND_STATE=$(az container show \
  --name           "$ACI_GROUP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query          "containers[?name=='backend'].instanceView.currentState.state | [0]" \
  --output tsv 2>/dev/null || echo "Unknown")

if [[ "$BACKEND_STATE" != "Running" ]]; then
  die "Backend container is '$BACKEND_STATE' — migrations may have failed. Check logs above."
fi
success "Backend is running — migrations applied successfully."

echo ""
success "Deployment complete!"
info   "URL: https://${APP_DOMAIN}"
info   "ACI FQDN: https://${FQDN}"
