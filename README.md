# Wegwiser Backend API Gateway

A Node.js API gateway with JWT authentication and role-based access control that forwards requests to a FastAPI RAG service.

## 🚀 Features

- **JWT Authentication**: Secure Auth0 integration with JWT token verification
- **Role-Based Access Control**: Different user roles (product_manager, designer, engineer, user)
- **AI Chat Integration**: Role-based forwarding to FastAPI RAG service
- **Health Monitoring**: Built-in health checks and monitoring
- **AWS Ready**: Complete CI/CD pipeline with Docker containerization

## 📋 Prerequisites

- Node.js 18+
- Docker
- AWS CLI (for deployment)
- Auth0 account and application
- FastAPI RAG service

## 🛠️ Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/imadhajaz/wegwiserserver.git
cd wegwiserserver
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://wegwiser-api

# FastAPI RAG Service
FASTAPI_URL=http://localhost:8000

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 4. Start the development server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Node.js Gateway │    │  FastAPI RAG    │
│   (Next.js)     │───▶│  (Auth + Proxy)  │───▶│   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Auth0 JWT      │
                       │   Verification   │
                       └──────────────────┘
```

## 🔐 Authentication Flow

1. **Frontend** sends requests with JWT token in Authorization header
2. **Node.js Gateway** verifies JWT token using Auth0
3. **Role Extraction** from JWT token claims
4. **Role-Based Forwarding** to appropriate FastAPI endpoint
5. **Response** returned to frontend

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status and health information.

### AI Chat (Authenticated)
```
POST /api/ai/chat
```
**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "message": "Your question here",
  "context": "Optional context"
}
```

**Role-Based Endpoints:**
- `product_manager` → `/pm-ask`
- `designer` → `/designer-ask`
- `engineer` → `/engineer-ask`
- `user` → `/general-ask`

### Authentication Endpoints
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/set-password
```

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t wegwiser-backend .
```

### Run Container
```bash
docker run -p 3001:3001 --env-file .env wegwiser-backend
```

## ☁️ AWS Deployment

### Prerequisites
1. AWS CLI configured with appropriate permissions
2. Docker installed
3. Auth0 credentials ready

### Quick Deployment
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

### Manual Deployment Steps

#### 1. Create AWS Secrets
```bash
aws secretsmanager create-secret --name "wegwiser/auth0-domain" --secret-string "your-auth0-domain"
aws secretsmanager create-secret --name "wegwiser/auth0-client-id" --secret-string "your-client-id"
aws secretsmanager create-secret --name "wegwiser/auth0-client-secret" --secret-string "your-client-secret"
aws secretsmanager create-secret --name "wegwiser/auth0-audience" --secret-string "https://wegwiser-api"
aws secretsmanager create-secret --name "wegwiser/fastapi-url" --secret-string "your-fastapi-url"
```

#### 2. Deploy Infrastructure
```bash
aws cloudformation deploy \
    --template-file aws-infrastructure.yml \
    --stack-name wegwiser-backend-production \
    --parameter-overrides Environment=production \
    --capabilities CAPABILITY_NAMED_IAM
```

#### 3. Build and Push Docker Image
```bash
# Get ECR repository URI
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name wegwiser-backend-production \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text)

# Login to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI

# Build and push
docker build -t wegwiser-backend .
docker tag wegwiser-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

## 🔄 CI/CD Pipeline

The repository includes GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. **Tests** the application
2. **Builds** Docker image
3. **Pushes** to Amazon ECR
4. **Deploys** to ECS

### Required GitHub Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 📊 Monitoring

### CloudWatch Logs
```bash
aws logs tail /ecs/production-wegwiser-backend --follow
```

### Health Checks
```bash
curl http://your-alb-dns/health
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH0_DOMAIN` | Auth0 domain | Yes |
| `AUTH0_CLIENT_ID` | Auth0 client ID | Yes |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | Yes |
| `AUTH0_AUDIENCE` | Auth0 API audience | Yes |
| `FASTAPI_URL` | FastAPI RAG service URL | Yes |
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment | No (default: development) |

### Role Configuration
Roles are extracted from JWT tokens in the following order:
1. `https://wegwiser-api/roles` claim
2. `app_metadata.role` claim
3. Default to `user` role

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing
```bash
# Health check
curl http://localhost:3001/health

# AI chat (requires valid JWT)
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how can you help me?"}'
```

## 📝 API Documentation

### Swagger Documentation
If you have the swagger server running:
```bash
node swagger-server.js
```
Then visit: `http://localhost:3002`

## 🚨 Troubleshooting

### Common Issues

1. **JWT Verification Fails**
   - Check Auth0 domain and audience configuration
   - Verify JWT token is valid and not expired

2. **FastAPI Connection Fails**
   - Ensure FastAPI service is running
   - Check `FASTAPI_URL` environment variable

3. **Role-Based Access Denied**
   - Verify user has correct role in Auth0
   - Check JWT token contains role information

### Logs
```bash
# Local logs
npm run dev

# Docker logs
docker logs <container_id>

# AWS logs
aws logs tail /ecs/production-wegwiser-backend --follow
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.
