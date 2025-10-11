# Vercel Deployment Guide for Culture AI Suite

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Convex Account**: Set up at [convex.dev](https://convex.dev)
3. **GitHub Repository**: Push your code to GitHub

## Environment Variables Setup

### Frontend Environment Variables (Set in Vercel Dashboard)

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_name
VITE_CONVEX_URL=https://your_convex_deployment.convex.cloud

# Optional: OpenAI API Key (if using OpenAI features)
OPENAI_API_KEY=your_openai_api_key

# Optional: Google Gemini API Key (if using Gemini features)
GEMINI_API_KEY=your_gemini_api_key
```

### Backend Environment Variables (Set in Convex Dashboard)

```bash
# Authentication Keys
JWKS=your_jwks_key
JWT_PRIVATE_KEY=your_jwt_private_key
SITE_URL=https://your-domain.vercel.app
```

## Deployment Steps

### 1. Prepare Your Repository

1. Ensure your code is pushed to GitHub
2. Make sure `vercel.json` is in the root directory
3. Verify `package.json` has the correct build script

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd Nxtwave
vercel

# Follow the prompts to configure your project
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

### 3. Configure Environment Variables

1. In Vercel Dashboard, go to your project
2. Navigate to Settings → Environment Variables
3. Add the following variables:

```
CONVEX_DEPLOYMENT=your_convex_deployment_name
VITE_CONVEX_URL=https://your_convex_deployment.convex.cloud
OPENAI_API_KEY=your_openai_api_key (optional)
GEMINI_API_KEY=your_gemini_api_key (optional)
```

### 4. Configure Convex Backend

1. In Convex Dashboard, go to your deployment
2. Navigate to Settings → Environment Variables
3. Add the backend variables:

```
JWKS=your_jwks_key
JWT_PRIVATE_KEY=your_jwt_private_key
SITE_URL=https://your-domain.vercel.app
```

### 5. Deploy Convex Backend

```bash
# Install Convex CLI
npm install -g convex

# Login to Convex
convex login

# Deploy backend
cd Nxtwave
convex deploy --prod
```

## Post-Deployment

1. **Test Authentication**: Verify email OTP and anonymous login work
2. **Test Features**: Check content creation, dataset management, fine-tuning
3. **Monitor Logs**: Check Vercel function logs for any errors
4. **Update CORS**: Ensure Convex allows your Vercel domain

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version (should be 18+)
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify Convex deployment URL is correct

3. **Authentication Issues**:
   - Verify JWT keys are set in Convex
   - Check SITE_URL matches your Vercel domain
   - Ensure CORS is configured properly

4. **API Errors**:
   - Check API keys are valid
   - Verify rate limits aren't exceeded
   - Check Convex function logs

### Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Convex Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Project Issues**: Check GitHub issues for known problems

## Production Checklist

- [ ] All environment variables configured
- [ ] Convex backend deployed
- [ ] Authentication working
- [ ] All features tested
- [ ] Error monitoring set up
- [ ] Performance optimized
- [ ] Security headers configured
- [ ] CORS properly configured
