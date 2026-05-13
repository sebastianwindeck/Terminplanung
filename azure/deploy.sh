#!/usr/bin/env bash
# Azure Container Instances deployment script
# Usage: ./azure/deploy.sh [resource-group] [location]

set -euo pipefail

RG="${1:-terminplanung-rg}"
LOCATION="${2:-westeurope}"
ACR_NAME="${ACR_NAME:-terminplanungacr}"
CONTAINER_GROUP="terminplanung-app"
STORAGE_ACCOUNT="${ACR_NAME}storage"
FILE_SHARE="terminplanung-data"

echo "==> Creating resource group: $RG in $LOCATION"
az group create --name "$RG" --location "$LOCATION" --output none

echo "==> Creating Azure Container Registry: $ACR_NAME"
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true --output none

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

echo "==> Building and pushing images to $ACR_LOGIN_SERVER"
az acr build --registry "$ACR_NAME" --image terminplanung-backend:latest ./backend
az acr build --registry "$ACR_NAME" --image terminplanung-frontend:latest ./frontend

echo "==> Creating storage for persistent SQLite volume"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --output none

STORAGE_KEY=$(az storage account keys list --account-name "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)

az storage share create \
  --name "$FILE_SHARE" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none

echo "==> Deploying Container Group: $CONTAINER_GROUP"
az container create \
  --resource-group "$RG" \
  --name "$CONTAINER_GROUP" \
  --image "$ACR_LOGIN_SERVER/terminplanung-backend:latest" \
  --registry-login-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --dns-name-label "terminplanung-$(echo $RG | tr -d '-')" \
  --ports 80 8000 \
  --environment-variables \
    DATABASE_URL="sqlite:////data/terminplanung.db" \
    ALLOWED_ORIGINS='["http://terminplanung-app.westeurope.azurecontainer.io"]' \
  --azure-file-volume-account-name "$STORAGE_ACCOUNT" \
  --azure-file-volume-account-key "$STORAGE_KEY" \
  --azure-file-volume-share-name "$FILE_SHARE" \
  --azure-file-volume-mount-path /data \
  --cpu 1 \
  --memory 1.5 \
  --output table

echo "==> Deployment complete!"
az container show --resource-group "$RG" --name "$CONTAINER_GROUP" --query ipAddress.fqdn -o tsv
