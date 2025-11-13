# Cloud Deployment Quick Start Guide

This quick start guide will help you deploy the BioPharm GMP Intelligence Platform to AWS or Azure in minutes.

## Prerequisites

- Docker installed and running
- AWS CLI or Azure CLI configured
- Basic understanding of cloud services

## Option 1: Local Docker Deployment (Fastest)

Perfect for testing or on-premise deployment:

```bash
# 1. Clone the repository
git clone https://github.com/capnplanet/biopharmgmp-intellig.git
cd biopharmgmp-intellig

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Start the application
docker-compose up -d

# 4. Access the application
open http://localhost
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:5000

## Option 2: AWS Deployment (Automated)

Deploy to AWS ECS Fargate with one command:

```bash
# 1. Ensure AWS CLI is configured
aws configure

# 2. Deploy infrastructure with Terraform
cd deploy/aws/terraform
terraform init
terraform apply -var="auth_token=$(openssl rand -base64 32)"

# Note the outputs (ALB DNS, ECR URLs)

# 3. Build and deploy application
cd ../../..
./deploy/scripts/deploy-aws.sh

# 4. Access your application
# Use the ALB DNS name from Terraform outputs
```

**What gets deployed:**
- VPC with public/private subnets
- ECS Fargate cluster
- Application Load Balancer
- EFS for persistent storage
- CloudWatch for logging
- Auto-scaling enabled

**Estimated cost:** ~$50-100/month depending on usage

## Option 3: Azure Deployment (Automated)

Deploy to Azure App Service with one command:

```bash
# 1. Login to Azure
az login

# 2. Deploy infrastructure with Terraform
cd deploy/azure/terraform
terraform init
terraform apply -var="auth_token=$(openssl rand -base64 32)"

# Note the outputs (App Service URLs, ACR URL)

# 3. Build and deploy application
cd ../../..
./deploy/scripts/deploy-azure.sh

# 4. Access your application
# Use the Frontend URL from Terraform outputs
```

**What gets deployed:**
- Resource Group
- Container Registry
- App Service Plan
- Frontend and Backend Web Apps
- Storage Account for persistent data
- Key Vault for secrets
- Application Insights for monitoring

**Estimated cost:** ~$70-120/month depending on usage

## Environment Configuration

### Required Variables

```bash
# Backend authentication (REQUIRED)
AUTH_TOKEN=your-secure-token-here  # Generate with: openssl rand -base64 32
```

### Optional Variables

```bash
# On-premise LLM integration
VITE_ONPREM_LLM_ENDPOINT=https://llm.yourcompany.com/v1/chat
VITE_ONPREM_LLM_TOKEN=your-llm-api-token

# RBAC (recommended for production)
RBAC_ENABLED=true

# Audit archiving (recommended for compliance)
ARCHIVE_ENABLED=true
```

## Verification Steps

After deployment, verify the application is working:

### 1. Check Health Endpoint

```bash
# AWS
curl http://<alb-dns-name>/api/health

# Azure
curl https://<backend-url>/api/health

# Local
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "ok": true,
  "service": "biopharmgmp-api",
  "time": "2025-11-13T19:00:00.000Z",
  "version": "0.1.0"
}
```

### 2. Access the Dashboard

Navigate to your application URL in a web browser:
- AWS: `http://<alb-dns-name>`
- Azure: `https://<frontend-url>`
- Local: `http://localhost`

You should see the BioPharm GMP Intelligence Platform dashboard.

### 3. Test the Operations Assistant

1. Click on "Operations Assistant" in the navigation
2. Ask a question like "What is the status of current batches?"
3. Verify you get a response (mock or from your LLM)

## Monitoring

### AWS CloudWatch

```bash
# View logs
aws logs tail /ecs/biopharmgmp --follow

# View metrics
aws cloudwatch get-metric-statistics --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=biopharmgmp-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 --statistics Average
```

### Azure Application Insights

```bash
# View logs
az webapp log tail --name biopharmgmp-backend-production \
  --resource-group biopharmgmp-production-rg

# View in portal
az portal open --resource-group biopharmgmp-production-rg
```

### Docker Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Scaling

### AWS Auto Scaling

Auto-scaling is configured by default in Terraform:
- Min: 2 tasks
- Max: 10 tasks
- CPU threshold: 70%
- Memory threshold: 80%

### Azure Auto Scaling

```bash
# Enable auto-scale
az monitor autoscale create \
  --resource-group biopharmgmp-production-rg \
  --resource biopharmgmp-plan \
  --resource-type Microsoft.Web/serverFarms \
  --min-count 2 \
  --max-count 10 \
  --count 2

# Add CPU-based rule
az monitor autoscale rule create \
  --resource-group biopharmgmp-production-rg \
  --autoscale-name biopharmgmp-autoscale \
  --scale out 1 \
  --condition "Percentage CPU > 70 avg 5m"
```

### Docker Scaling

```bash
# Scale backend service
docker-compose up -d --scale backend=3

# Scale frontend service
docker-compose up -d --scale frontend=2
```

## Troubleshooting

### Application won't start

```bash
# Check container status
docker ps -a

# Check logs for errors
docker-compose logs backend | grep -i error
docker-compose logs frontend | grep -i error
```

### Cannot access frontend

1. Verify containers are running: `docker ps`
2. Check firewall/security group rules
3. Verify load balancer health checks are passing
4. Check nginx configuration: `docker-compose logs frontend`

### Database/storage issues

```bash
# Check volume mounts
docker volume ls
docker volume inspect biopharmgmp-intellig_audit-data

# Verify permissions
docker-compose exec backend ls -la /app/data
```

## Clean Up

### AWS

```bash
# Destroy all resources
cd deploy/aws/terraform
terraform destroy

# Optionally delete ECR images
aws ecr batch-delete-image \
  --repository-name biopharmgmp-backend \
  --image-ids imageTag=latest
```

### Azure

```bash
# Destroy all resources
cd deploy/azure/terraform
terraform destroy

# Optionally delete resource group
az group delete --name biopharmgmp-production-rg --yes
```

### Docker

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Clean up images
docker rmi biopharmgmp-backend:latest biopharmgmp-frontend:latest
```

## Next Steps

1. **Configure Custom Domain**: Set up a custom domain name and SSL certificate
2. **Set Up CI/CD**: Automate deployments with GitHub Actions or Azure DevOps
3. **Configure Backup**: Set up automated backups for audit data
4. **Enable Monitoring Alerts**: Configure alerts for critical metrics
5. **Review Security**: Audit security groups, IAM roles, and access controls

## Support

For detailed documentation, see:
- [Cloud Deployment Guide](../docs/CLOUD_DEPLOYMENT.md)
- [Technical Guide](../docs/TECHNICAL_GUIDE.md)
- [Platform Abstraction Layer](../docs/platform-abstraction-layer.md)

## Estimated Costs

### AWS Monthly Costs
- ECS Fargate (2 tasks): ~$25-35
- Application Load Balancer: ~$20-25
- EFS Storage (10GB): ~$3
- CloudWatch Logs: ~$5
- **Total: ~$53-68/month**

### Azure Monthly Costs
- App Service Plan (P1v2): ~$70-85
- Container Registry: ~$5
- Storage (10GB): ~$2
- Application Insights: ~$5
- **Total: ~$82-97/month**

### Docker (On-Premise)
- Infrastructure costs only
- No cloud service fees
- **Total: $0/month (infrastructure costs separate)**

*Costs are estimates and may vary based on actual usage, data transfer, and region.*
