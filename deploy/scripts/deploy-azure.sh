#!/bin/bash
# Azure Deployment Script for BioPharm GMP Intelligence Platform
# This script builds and deploys the application to Azure

set -e

# Configuration
AZURE_REGION=${AZURE_REGION:-eastus}
RESOURCE_GROUP=${RESOURCE_GROUP:-biopharmgmp-production-rg}
APP_NAME=${APP_NAME:-biopharmgmp}
ENVIRONMENT=${ENVIRONMENT:-production}
ACR_NAME="${APP_NAME}${ENVIRONMENT}acr"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BioPharm GMP Azure Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v az >/dev/null 2>&1 || { echo -e "${RED}Azure CLI is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed. Aborting.${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Check Azure login
echo -e "${YELLOW}Checking Azure login status...${NC}"
az account show >/dev/null 2>&1 || { echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Logged in to Azure${NC}"
echo ""

# Build Docker images
echo -e "${YELLOW}Building Docker images...${NC}"
echo "Building backend image..."
docker build -t ${APP_NAME}-backend:latest -f Dockerfile .

echo "Building frontend image..."
docker build -t ${APP_NAME}-frontend:latest -f Dockerfile.frontend .
echo -e "${GREEN}✓ Docker images built successfully${NC}"
echo ""

# Get ACR login server
echo -e "${YELLOW}Getting ACR login server...${NC}"
ACR_LOGIN_SERVER=$(az acr show --name ${ACR_NAME} --resource-group ${RESOURCE_GROUP} --query loginServer --output tsv 2>/dev/null || echo "")

if [ -z "$ACR_LOGIN_SERVER" ]; then
  echo -e "${YELLOW}⚠ ACR not found. Please deploy infrastructure using Terraform first.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ ACR found: ${ACR_LOGIN_SERVER}${NC}"
echo ""

# Login to ACR
echo -e "${YELLOW}Logging in to Azure Container Registry...${NC}"
az acr login --name ${ACR_NAME}
echo -e "${GREEN}✓ Logged in to ACR${NC}"
echo ""

# Tag and push images
echo -e "${YELLOW}Tagging and pushing images to ACR...${NC}"
docker tag ${APP_NAME}-backend:latest ${ACR_LOGIN_SERVER}/biopharmgmp-backend:latest
docker push ${ACR_LOGIN_SERVER}/biopharmgmp-backend:latest

docker tag ${APP_NAME}-frontend:latest ${ACR_LOGIN_SERVER}/biopharmgmp-frontend:latest
docker push ${ACR_LOGIN_SERVER}/biopharmgmp-frontend:latest
echo -e "${GREEN}✓ Images pushed to ACR${NC}"
echo ""

# Restart App Services
echo -e "${YELLOW}Restarting App Services...${NC}"
BACKEND_APP="${APP_NAME}-backend-${ENVIRONMENT}"
FRONTEND_APP="${APP_NAME}-frontend-${ENVIRONMENT}"

if az webapp show --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP} >/dev/null 2>&1; then
  echo "Restarting backend app service..."
  az webapp restart --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP}
  echo -e "${GREEN}✓ Backend app service restarted${NC}"
else
  echo -e "${YELLOW}⚠ Backend app service not found${NC}"
fi

if az webapp show --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP} >/dev/null 2>&1; then
  echo "Restarting frontend app service..."
  az webapp restart --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP}
  echo -e "${GREEN}✓ Frontend app service restarted${NC}"
else
  echo -e "${YELLOW}⚠ Frontend app service not found${NC}"
fi
echo ""

# Get App Service URLs
BACKEND_URL=$(az webapp show --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP} --query defaultHostName --output tsv 2>/dev/null || echo "")
FRONTEND_URL=$(az webapp show --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP} --query defaultHostName --output tsv 2>/dev/null || echo "")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Application URLs:"
if [ ! -z "$BACKEND_URL" ]; then
  echo "  Backend:  https://${BACKEND_URL}"
fi
if [ ! -z "$FRONTEND_URL" ]; then
  echo "  Frontend: https://${FRONTEND_URL}"
fi
echo ""
echo "Next steps:"
echo "1. Check app service logs: az webapp log tail --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP}"
echo "2. Monitor application: Check Azure Portal > Application Insights"
