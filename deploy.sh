#!/bin/bash

# Wegwiser Backend Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="wegwiser-backend-${ENVIRONMENT}"

echo "🚀 Starting Wegwiser Backend Deployment"
echo "Environment: $ENVIRONMENT"
echo "AWS Region: $AWS_REGION"
echo "Stack Name: $STACK_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# Step 1: Create AWS Secrets Manager secrets
echo "📝 Creating AWS Secrets Manager secrets..."
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if aws secretsmanager describe-secret --secret-id "wegwiser/$secret_name" --region $AWS_REGION &> /dev/null; then
        echo "Secret wegwiser/$secret_name already exists, updating..."
        aws secretsmanager update-secret --secret-id "wegwiser/$secret_name" --secret-string "$secret_value" --region $AWS_REGION
    else
        echo "Creating secret wegwiser/$secret_name..."
        aws secretsmanager create-secret --name "wegwiser/$secret_name" --secret-string "$secret_value" --region $AWS_REGION
    fi
}

# You'll need to set these environment variables or provide them interactively
if [ -z "$AUTH0_DOMAIN" ]; then
    read -p "Enter Auth0 Domain: " AUTH0_DOMAIN
fi
if [ -z "$AUTH0_CLIENT_ID" ]; then
    read -p "Enter Auth0 Client ID: " AUTH0_CLIENT_ID
fi
if [ -z "$AUTH0_CLIENT_SECRET" ]; then
    read -s -p "Enter Auth0 Client Secret: " AUTH0_CLIENT_SECRET
    echo
fi
if [ -z "$AUTH0_AUDIENCE" ]; then
    read -p "Enter Auth0 Audience: " AUTH0_AUDIENCE
fi
if [ -z "$FASTAPI_URL" ]; then
    read -p "Enter FastAPI RAG Service URL: " FASTAPI_URL
fi

create_secret "auth0-domain" "$AUTH0_DOMAIN"
create_secret "auth0-client-id" "$AUTH0_CLIENT_ID"
create_secret "auth0-client-secret" "$AUTH0_CLIENT_SECRET"
create_secret "auth0-audience" "$AUTH0_AUDIENCE"
create_secret "fastapi-url" "$FASTAPI_URL"

# Step 2: Deploy CloudFormation stack
echo "☁️ Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws-infrastructure.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION

# Step 3: Get ECR repository URI
ECR_REPO_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "📦 ECR Repository URI: $ECR_REPO_URI"

# Step 4: Build and push Docker image
echo "🐳 Building and pushing Docker image..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI

# Build image
docker build -t wegwiser-backend .

# Tag image
docker tag wegwiser-backend:latest $ECR_REPO_URI:latest

# Push image
docker push $ECR_REPO_URI:latest

# Step 5: Update ECS service
echo "🔄 Updating ECS service..."
CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
    --output text \
    --region $AWS_REGION)

SERVICE_NAME="${ENVIRONMENT}-wegwiser-backend-service"

# Force new deployment
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

# Step 6: Wait for service to be stable
echo "⏳ Waiting for ECS service to be stable..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION

# Step 7: Get load balancer DNS
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "✅ Deployment completed successfully!"
echo "🌐 Load Balancer DNS: $ALB_DNS"
echo "🔗 API Endpoint: http://$ALB_DNS"
echo "🏥 Health Check: http://$ALB_DNS/health"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 30  # Wait for service to be fully ready

if curl -f http://$ALB_DNS/health; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed. Please check the logs."
    echo "📋 To view logs, run:"
    echo "aws logs tail /ecs/${ENVIRONMENT}-wegwiser-backend --follow --region $AWS_REGION"
fi 