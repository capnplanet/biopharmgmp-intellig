# Cloud Deployment Guide

This guide provides comprehensive instructions for deploying the BioPharm GMP Intelligence Platform to AWS and Azure cloud environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [AWS Deployment](#aws-deployment)
  - [AWS Architecture](#aws-architecture)
  - [AWS Prerequisites](#aws-prerequisites)
  - [AWS Infrastructure Setup](#aws-infrastructure-setup)
  - [AWS Application Deployment](#aws-application-deployment)
- [Azure Deployment](#azure-deployment)
  - [Azure Architecture](#azure-architecture)
  - [Azure Prerequisites](#azure-prerequisites)
  - [Azure Infrastructure Setup](#azure-infrastructure-setup)
  - [Azure Application Deployment](#azure-application-deployment)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The BioPharm GMP Intelligence Platform is designed for cloud-native deployment with support for:

- **AWS**: ECS Fargate with Application Load Balancer, EFS for storage, and CloudWatch for monitoring
- **Azure**: App Service with Container Registry, Azure Files for storage, and Application Insights for monitoring
- **Docker**: Docker Compose for local or on-premise containerized deployment

## Prerequisites

### General Requirements

- Docker 20.10 or later
- Docker Compose 2.0 or later (for Docker deployment)
- Git
- Node.js 18+ and npm (for local builds)

### Cloud-Specific Requirements

**AWS:**
- AWS CLI v2
- AWS Account with appropriate permissions
- Terraform 1.0+ (optional, for infrastructure as code)

**Azure:**
- Azure CLI 2.40+
- Azure Subscription with appropriate permissions
- Terraform 1.0+ (optional, for infrastructure as code)

## AWS Deployment

### AWS Architecture

The AWS deployment uses the following services:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Internet Gateway                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Application Load Balancer (ALB)                   │
│                    (Public Subnets)                              │
└────────────────┬────────────────────────┬───────────────────────┘
                 │                        │
                 ▼                        ▼
    ┌────────────────────┐    ┌────────────────────┐
    │  ECS Fargate Task  │    │  ECS Fargate Task  │
    │   (Private Subnet) │    │   (Private Subnet) │
    │  ┌──────────────┐  │    │  ┌──────────────┐  │
    │  │  Frontend    │  │    │  │  Frontend    │  │
    │  │  Container   │  │    │  │  Container   │  │
    │  └──────────────┘  │    │  └──────────────┘  │
    │  ┌──────────────┐  │    │  ┌──────────────┐  │
    │  │  Backend     │  │    │  │  Backend     │  │
    │  │  Container   │  │    │  │  Container   │  │
    │  └──────────────┘  │    │  └──────────────┘  │
    └────────┬───────────┘    └────────┬───────────┘
             │                         │
             └────────┬────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Amazon EFS      │
            │  (Persistent     │
            │   Storage)       │
            └──────────────────┘
```

**Components:**
- **VPC**: Isolated network with public and private subnets across 2 AZs
- **ECS Fargate**: Serverless container orchestration
- **Application Load Balancer**: HTTP/HTTPS traffic distribution
- **EFS**: Persistent file storage for audit logs and metrics
- **ECR**: Docker container registry
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Secure storage for credentials
- **Auto Scaling**: Automatic scaling based on CPU/memory utilization

### AWS Prerequisites

1. **Install AWS CLI:**
   ```bash
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Windows
   # Download and run the AWS CLI MSI installer
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, region, and output format
   ```

3. **Verify access:**
   ```bash
   aws sts get-caller-identity
   ```

### AWS Infrastructure Setup

#### Option 1: Using Terraform (Recommended)

1. **Navigate to the AWS Terraform directory:**
   ```bash
   cd deploy/aws/terraform
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init
   ```

3. **Create a `terraform.tfvars` file:**
   ```hcl
   aws_region  = "us-east-1"
   environment = "production"
   app_name    = "biopharmgmp"
   auth_token  = "your-secure-auth-token-here"
   llm_token   = "your-llm-api-token"       # Optional
   llm_endpoint = "https://llm.example.com" # Optional
   ```

4. **Review the infrastructure plan:**
   ```bash
   terraform plan
   ```

5. **Apply the infrastructure:**
   ```bash
   terraform apply
   ```

   This will create:
   - VPC with public/private subnets
   - ECS cluster
   - Application Load Balancer
   - EFS file system
   - ECR repositories
   - IAM roles and policies
   - CloudWatch log groups
   - Secrets Manager secrets

6. **Note the outputs:**
   ```bash
   terraform output
   ```
   
   Save the ALB DNS name, ECR repository URLs, and other important outputs.

#### Option 2: Using AWS Console

Follow the manual setup steps in the [AWS Console Setup Guide](aws-console-setup.md).

### AWS Application Deployment

1. **Build and push Docker images:**
   ```bash
   # From repository root
   ./deploy/scripts/deploy-aws.sh
   ```

   This script will:
   - Build frontend and backend Docker images
   - Login to Amazon ECR
   - Tag and push images to ECR
   - Update the ECS service

2. **Manually deploy (if not using script):**
   ```bash
   # Get AWS account ID
   AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   AWS_REGION=us-east-1

   # Login to ECR
   aws ecr get-login-password --region ${AWS_REGION} | \
     docker login --username AWS --password-stdin \
     ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

   # Build images
   docker build -t biopharmgmp-backend:latest -f Dockerfile .
   docker build -t biopharmgmp-frontend:latest -f Dockerfile.frontend .

   # Tag images
   docker tag biopharmgmp-backend:latest \
     ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/biopharmgmp-backend:latest
   docker tag biopharmgmp-frontend:latest \
     ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/biopharmgmp-frontend:latest

   # Push images
   docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/biopharmgmp-backend:latest
   docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/biopharmgmp-frontend:latest

   # Update ECS service
   aws ecs update-service --cluster biopharmgmp-cluster \
     --service biopharmgmp-service --force-new-deployment
   ```

3. **Access the application:**
   - Get the ALB DNS name from Terraform outputs or AWS Console
   - Navigate to `http://<alb-dns-name>` in your browser
   - The application should be accessible

## Azure Deployment

### Azure Architecture

The Azure deployment uses the following services:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Traffic Manager                     │
│                         (DNS Load Balancing)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Azure App Service                           │
│  ┌────────────────────┐              ┌────────────────────┐     │
│  │  Frontend          │              │  Backend           │     │
│  │  (Web App)         │◄────────────►│  (Web App)         │     │
│  │  Docker Container  │              │  Docker Container  │     │
│  └────────────────────┘              └─────────┬──────────┘     │
└───────────────────────────────────────────────┼────────────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────┐
                                    │  Azure Storage     │
                                    │  - Blob Storage    │
                                    │  - File Shares     │
                                    └────────────────────┘
```

**Components:**
- **Resource Group**: Logical container for all resources
- **Virtual Network**: Network isolation
- **App Service Plan**: Hosting plan for containers
- **App Service (Web Apps)**: Frontend and backend containers
- **Container Registry**: Docker container registry
- **Storage Account**: Blob storage and file shares for persistent data
- **Key Vault**: Secure secrets management
- **Application Insights**: Application monitoring and analytics
- **Log Analytics**: Centralized logging

### Azure Prerequisites

1. **Install Azure CLI:**
   ```bash
   # macOS
   brew install azure-cli

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

   # Windows
   # Download and run the Azure CLI MSI installer
   ```

2. **Login to Azure:**
   ```bash
   az login
   ```

3. **Set your subscription:**
   ```bash
   # List subscriptions
   az account list --output table

   # Set active subscription
   az account set --subscription "Your Subscription Name"
   ```

### Azure Infrastructure Setup

#### Option 1: Using Terraform (Recommended)

1. **Navigate to the Azure Terraform directory:**
   ```bash
   cd deploy/azure/terraform
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init
   ```

3. **Create a `terraform.tfvars` file:**
   ```hcl
   location     = "East US"
   environment  = "production"
   app_name     = "biopharmgmp"
   auth_token   = "your-secure-auth-token-here"
   llm_token    = "your-llm-api-token"       # Optional
   llm_endpoint = "https://llm.example.com"  # Optional
   ```

4. **Review the infrastructure plan:**
   ```bash
   terraform plan
   ```

5. **Apply the infrastructure:**
   ```bash
   terraform apply
   ```

   This will create:
   - Resource Group
   - Virtual Network and Subnets
   - Container Registry
   - Storage Account with containers
   - Key Vault with secrets
   - App Service Plan
   - Frontend and Backend Web Apps
   - Application Insights
   - Log Analytics Workspace

6. **Note the outputs:**
   ```bash
   terraform output
   ```

#### Option 2: Using Azure Portal

Follow the manual setup steps in the [Azure Portal Setup Guide](azure-portal-setup.md).

### Azure Application Deployment

1. **Build and push Docker images:**
   ```bash
   # From repository root
   ./deploy/scripts/deploy-azure.sh
   ```

   This script will:
   - Build frontend and backend Docker images
   - Login to Azure Container Registry
   - Tag and push images to ACR
   - Restart App Services

2. **Manually deploy (if not using script):**
   ```bash
   RESOURCE_GROUP=biopharmgmp-production-rg
   ACR_NAME=biopharmgmpproductionacr

   # Login to ACR
   az acr login --name ${ACR_NAME}

   # Get ACR login server
   ACR_LOGIN_SERVER=$(az acr show --name ${ACR_NAME} \
     --resource-group ${RESOURCE_GROUP} --query loginServer --output tsv)

   # Build images
   docker build -t biopharmgmp-backend:latest -f Dockerfile .
   docker build -t biopharmgmp-frontend:latest -f Dockerfile.frontend .

   # Tag images
   docker tag biopharmgmp-backend:latest ${ACR_LOGIN_SERVER}/biopharmgmp-backend:latest
   docker tag biopharmgmp-frontend:latest ${ACR_LOGIN_SERVER}/biopharmgmp-frontend:latest

   # Push images
   docker push ${ACR_LOGIN_SERVER}/biopharmgmp-backend:latest
   docker push ${ACR_LOGIN_SERVER}/biopharmgmp-frontend:latest

   # Restart app services
   az webapp restart --name biopharmgmp-backend-production --resource-group ${RESOURCE_GROUP}
   az webapp restart --name biopharmgmp-frontend-production --resource-group ${RESOURCE_GROUP}
   ```

3. **Access the application:**
   - Get the frontend URL from Terraform outputs or Azure Portal
   - Navigate to the URL in your browser
   - The application should be accessible

## Docker Deployment

For local or on-premise deployment using Docker Compose:

1. **Create a `.env` file:**
   ```bash
   # Backend Configuration
   AUTH_TOKEN=your-secure-token
   RBAC_ENABLED=true
   ARCHIVE_ENABLED=true

   # Optional: LLM Configuration
   VITE_ONPREM_LLM_ENDPOINT=https://llm.example.com/v1/chat
   VITE_ONPREM_LLM_TOKEN=your-llm-token
   ```

2. **Build and start containers:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:5000

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop containers:**
   ```bash
   docker-compose down
   ```

## Configuration

### Environment Variables

#### Frontend Configuration
- `VITE_ONPREM_LLM_ENDPOINT`: On-premise LLM endpoint URL
- `VITE_ONPREM_LLM_TOKEN`: Authentication token for LLM API
- `VITE_BACKEND_URL`: Backend API URL (for Docker deployments)

#### Backend Configuration
- `NODE_ENV`: Environment (production/development)
- `PORT`: Server port (default: 5000)
- `AUTH_TOKEN`: API authentication token
- `RBAC_ENABLED`: Enable role-based access control (true/false)
- `ARCHIVE_ENABLED`: Enable immutable archive (true/false)
- `ARCHIVE_DIR`: Directory for archive storage

### Security Configuration

1. **Use strong authentication tokens:**
   ```bash
   # Generate a secure token
   openssl rand -base64 32
   ```

2. **Enable HTTPS:**
   - AWS: Configure ACM certificate on ALB
   - Azure: Enable HTTPS in App Service settings

3. **Configure RBAC:**
   - Set `RBAC_ENABLED=true`
   - Assign appropriate roles in headers: `X-User-Role`

## Monitoring and Logging

### AWS

1. **CloudWatch Logs:**
   ```bash
   # View logs
   aws logs tail /ecs/biopharmgmp --follow

   # Filter logs
   aws logs filter-log-events --log-group-name /ecs/biopharmgmp \
     --filter-pattern "ERROR"
   ```

2. **CloudWatch Metrics:**
   - Navigate to CloudWatch Console
   - View ECS cluster metrics
   - Set up alarms for CPU/memory thresholds

3. **Container Insights:**
   - Enabled by default in Terraform configuration
   - Provides detailed container-level metrics

### Azure

1. **Application Insights:**
   ```bash
   # View logs
   az webapp log tail --name biopharmgmp-backend-production \
     --resource-group biopharmgmp-production-rg
   ```

2. **Log Analytics:**
   - Navigate to Azure Portal > Log Analytics
   - Query logs using Kusto Query Language (KQL)

3. **Metrics:**
   - View App Service metrics in Azure Portal
   - Set up alerts for CPU/memory thresholds

## Security Best Practices

1. **Network Security:**
   - Use private subnets for containers
   - Restrict security group/NSG rules to minimum required
   - Enable VPC/VNet flow logs

2. **Secrets Management:**
   - Never commit secrets to source control
   - Use AWS Secrets Manager or Azure Key Vault
   - Rotate credentials regularly

3. **Container Security:**
   - Run containers as non-root user
   - Enable image scanning in ECR/ACR
   - Use minimal base images (Alpine Linux)
   - Keep images updated

4. **Data Protection:**
   - Enable encryption at rest for EFS/Storage
   - Enable encryption in transit (HTTPS/TLS)
   - Enable versioning on storage accounts

5. **Access Control:**
   - Use IAM roles and managed identities
   - Implement least privilege principle
   - Enable MFA for cloud accounts

## Troubleshooting

### Common Issues

1. **Container fails to start:**
   - Check logs: `docker logs <container-id>`
   - Verify environment variables
   - Check resource limits (CPU/memory)

2. **Cannot connect to backend:**
   - Verify security group/NSG rules
   - Check ALB/App Service health checks
   - Verify container is running

3. **Persistent data not saved:**
   - Verify EFS/Storage mount points
   - Check permissions on data directories
   - Verify volume configuration

4. **High CPU/memory usage:**
   - Review CloudWatch/Application Insights metrics
   - Adjust container resource limits
   - Scale up App Service Plan or add ECS tasks

### Getting Help

- Check logs in CloudWatch or Application Insights
- Review Terraform state: `terraform show`
- Contact support team with error messages and logs

## Next Steps

- Configure custom domain name
- Set up SSL/TLS certificates
- Configure CI/CD pipeline
- Set up backup and disaster recovery
- Configure monitoring alerts
- Implement auto-scaling policies
- Set up multi-region deployment (for HA)
