#!/bin/bash
# AWS Deployment Script for BioPharm GMP Intelligence Platform
# This script builds and deploys the application to AWS ECS

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
APP_NAME=${APP_NAME:-biopharmgmp}
ENVIRONMENT=${ENVIRONMENT:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BioPharm GMP AWS Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v aws >/dev/null 2>&1 || { echo -e "${RED}AWS CLI is required but not installed. Aborting.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed. Aborting.${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Build Docker images
echo -e "${YELLOW}Building Docker images...${NC}"
echo "Building backend image..."
docker build -t ${APP_NAME}-backend:latest -f Dockerfile .

echo "Building frontend image..."
docker build -t ${APP_NAME}-frontend:latest -f Dockerfile.frontend .
echo -e "${GREEN}✓ Docker images built successfully${NC}"
echo ""

# Login to ECR
echo -e "${YELLOW}Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo -e "${GREEN}✓ Logged in to ECR${NC}"
echo ""

# Create ECR repositories if they don't exist
echo -e "${YELLOW}Ensuring ECR repositories exist...${NC}"
aws ecr describe-repositories --repository-names ${APP_NAME}-backend --region ${AWS_REGION} >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name ${APP_NAME}-backend --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true

aws ecr describe-repositories --repository-names ${APP_NAME}-frontend --region ${AWS_REGION} >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name ${APP_NAME}-frontend --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
echo -e "${GREEN}✓ ECR repositories ready${NC}"
echo ""

# Tag and push images
echo -e "${YELLOW}Tagging and pushing images to ECR...${NC}"
docker tag ${APP_NAME}-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-backend:latest

docker tag ${APP_NAME}-frontend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}-frontend:latest
echo -e "${GREEN}✓ Images pushed to ECR${NC}"
echo ""

# Update ECS service (if exists)
echo -e "${YELLOW}Checking for existing ECS service...${NC}"
if aws ecs describe-services --cluster ${APP_NAME}-cluster --services ${APP_NAME}-service --region ${AWS_REGION} --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "Updating ECS service..."
  aws ecs update-service --cluster ${APP_NAME}-cluster --service ${APP_NAME}-service --force-new-deployment --region ${AWS_REGION}
  echo -e "${GREEN}✓ ECS service updated${NC}"
else
  echo -e "${YELLOW}⚠ No active ECS service found. Please deploy infrastructure using Terraform first.${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check ECS service status: aws ecs describe-services --cluster ${APP_NAME}-cluster --services ${APP_NAME}-service --region ${AWS_REGION}"
echo "2. View logs: aws logs tail /ecs/${APP_NAME} --follow --region ${AWS_REGION}"
echo "3. Access the application via the ALB DNS name from Terraform outputs"
