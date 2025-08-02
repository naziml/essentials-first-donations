targetScope = 'resourceGroup'

@minLength(1)
@maxLength(64)
@description('Name of the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Environment variables for the container app')
@secure()
param port string

// Calculate resource token based on the environment name and location
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location, environmentName)

// Define resource prefix (max 3 characters)
var resourcePrefix = 'app'

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'az-${resourcePrefix}-${resourceToken}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'az-${resourcePrefix}-${resourceToken}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'plan-${resourcePrefix}-${resourceToken}'
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
    size: 'F1'
    family: 'F'
    capacity: 1
  }
  kind: 'app'
  properties: {
    reserved: false
  }
}

// User-assigned managed identity
resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'mi-${resourcePrefix}-${resourceToken}'
  location: location
}

// App Service Web App
resource webApp 'Microsoft.Web/sites@2024-04-01' = {
  name: 'essentials-first-donations'
  location: location
  tags: {
    'azd-service-name': 'donation-meter'
    'azd-env-name': environmentName
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    reserved: false
    siteConfig: {
      nodeVersion: '18-lts'
      appCommandLine: 'npm start'
      httpLoggingEnabled: true
      detailedErrorLoggingEnabled: true
      requestTracingEnabled: true
      cors: {
        allowedOrigins: ['*']
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'PORT'
          value: port
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

// Outputs
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output RESOURCE_GROUP_ID string = resourceGroup().id
output SERVICE_WEB_URI string = 'https://${webApp.properties.defaultHostName}'
output SERVICE_DONATION_METER_NAME string = webApp.name
output SERVICE_DONATION_METER_URI string = 'https://${webApp.properties.defaultHostName}'
output WEBAPP_DEFAULT_HOSTNAME string = webApp.properties.defaultHostName
