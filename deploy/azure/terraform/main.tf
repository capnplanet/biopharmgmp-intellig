# Azure Terraform Configuration for BioPharm GMP Intelligence Platform
# This configuration deploys the application to Azure Container Instances or Azure Kubernetes Service

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Configure backend for state storage
  # backend "azurerm" {
  #   resource_group_name  = "biopharmgmp-terraform-state"
  #   storage_account_name = "biopharmgmptfstate"
  #   container_name       = "tfstate"
  #   key                  = "production.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# Variables
variable "location" {
  description = "Azure region for deployment"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "biopharmgmp"
}

variable "auth_token" {
  description = "Backend authentication token"
  type        = string
  sensitive   = true
}

variable "llm_token" {
  description = "LLM API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "llm_endpoint" {
  description = "On-premise LLM endpoint"
  type        = string
  default     = ""
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.app_name}-${var.environment}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.app_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Environment = var.environment
  }
}

# Subnets
resource "azurerm_subnet" "app" {
  name                 = "${var.app_name}-app-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "app-service-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "db" {
  name                 = "${var.app_name}-db-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
  
  service_endpoints = ["Microsoft.Storage"]
}

# Network Security Group
resource "azurerm_network_security_group" "main" {
  name                = "${var.app_name}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
  }
}

# Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${var.app_name}${var.environment}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  admin_enabled       = true

  tags = {
    Environment = var.environment
  }
}

# Storage Account for persistent data
resource "azurerm_storage_account" "main" {
  name                     = "${var.app_name}${var.environment}storage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  blob_properties {
    versioning_enabled = true
  }

  tags = {
    Environment = var.environment
  }
}

# Storage Containers
resource "azurerm_storage_container" "audit" {
  name                  = "audit-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "metrics" {
  name                  = "metrics-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "archive" {
  name                  = "archive-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# File Share for persistent volumes
resource "azurerm_storage_share" "data" {
  name                 = "app-data"
  storage_account_name = azurerm_storage_account.main.name
  quota                = 100
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                       = "${var.app_name}-${var.environment}-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  tags = {
    Environment = var.environment
  }
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "auth_token" {
  name         = "auth-token"
  value        = var.auth_token
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "llm_token" {
  name         = "llm-token"
  value        = var.llm_token != "" ? var.llm_token : "placeholder"
  key_vault_id = azurerm_key_vault.main.id
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "P1v2"

  tags = {
    Environment = var.environment
  }
}

# Backend App Service
resource "azurerm_linux_web_app" "backend" {
  name                = "${var.app_name}-backend-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
    
    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/biopharmgmp-backend"
      docker_image_tag = "latest"
    }

    health_check_path = "/api/health"
  }

  app_settings = {
    "DOCKER_REGISTRY_SERVER_URL"      = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME" = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD" = azurerm_container_registry.main.admin_password
    "NODE_ENV"                        = "production"
    "PORT"                            = "5000"
    "RBAC_ENABLED"                    = "true"
    "ARCHIVE_ENABLED"                 = "true"
    "ARCHIVE_DIR"                     = "/app/data/archive"
    "VITE_ONPREM_LLM_ENDPOINT"       = var.llm_endpoint
    "WEBSITES_PORT"                   = "5000"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }

  connection_string {
    name  = "StorageAccount"
    type  = "Custom"
    value = azurerm_storage_account.main.primary_connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
  }
}

# Frontend App Service (Static Web App alternative)
resource "azurerm_linux_web_app" "frontend" {
  name                = "${var.app_name}-frontend-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
    
    application_stack {
      docker_image     = "${azurerm_container_registry.main.login_server}/biopharmgmp-frontend"
      docker_image_tag = "latest"
    }
  }

  app_settings = {
    "DOCKER_REGISTRY_SERVER_URL"      = "https://${azurerm_container_registry.main.login_server}"
    "DOCKER_REGISTRY_SERVER_USERNAME" = azurerm_container_registry.main.admin_username
    "DOCKER_REGISTRY_SERVER_PASSWORD" = azurerm_container_registry.main.admin_password
    "WEBSITES_PORT"                   = "80"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
  }
}

# Key Vault Access Policy for Backend App Service
resource "azurerm_key_vault_access_policy" "backend" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.backend.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.app_name}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"

  tags = {
    Environment = var.environment
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.app_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Environment = var.environment
  }
}

# Data source
data "azurerm_client_config" "current" {}

# Outputs
output "backend_url" {
  description = "URL of the backend App Service"
  value       = "https://${azurerm_linux_web_app.backend.default_hostname}"
}

output "frontend_url" {
  description = "URL of the frontend App Service"
  value       = "https://${azurerm_linux_web_app.frontend.default_hostname}"
}

output "container_registry_url" {
  description = "URL of the Container Registry"
  value       = azurerm_container_registry.main.login_server
}

output "storage_account_name" {
  description = "Name of the Storage Account"
  value       = azurerm_storage_account.main.name
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "application_insights_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}
