#!/bin/bash

# LandWatch Pro — Railway Deployment Helper
# This script assists in deploying the /backend to Railway via CLI

echo "◈ STARTING RAILWAY DEPLOYMENT SEQUENCE..."

# 1. Install Railway CLI if not present
if ! command -v railway &> /dev/null
then
    echo "◈ Railway CLI not found. Installing via NPM..."
    npm install -g @railway/cli
fi

# 2. Authenticate (This will open a browser window)
echo "◈ Authenticating with Railway..."
railway login

# 3. Navigate to backend
echo "◈ Preparing backend environment..."
cd backend

# 4. Initialize or Link project
# If you have an existing project ID, use: railway link [PROJECT_ID]
# Otherwise, we initialize a new one:
echo "◈ Initializing Railway project (interactive)..."
railway init

# 5. Add necessary plugins
echo "◈ Provisioning PostgreSQL and Redis..."
railway add postgres
railway add redis

# 6. Deploy
echo "◈ Uploading and building Docker container..."
railway up

echo "◈ DEPLOYMENT COMPLETE."
echo "◈ Access your dashboard at: https://railway.app/dashboard"
