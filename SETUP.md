# Setup Guide

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm (recommended) or npm/yarn
- Convex account (optional)

## Installation Steps

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set Up Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your environment variables:
     - `BONS_AI_API_KEY` - Already configured: `sk_cr_CLACzLNP4e7FGgNFLZ3NuaT25vaJQj3hMPufwsYZG4oG`
     - `BONS_AI_BASE_URL` - Already configured: `https://go.trybons.ai`
     - `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL (optional)

3. **Run Development Server**
   ```bash
   pnpm dev
   ```

4. **Build for Production**
   ```bash
   pnpm build
   pnpm start
   ```

## API Configuration

### Bons.ai API
The application is configured to use Bons.ai as the primary AI provider:

- **Base URL**: `https://go.trybons.ai`
- **API Path**: `/v1/chat/completions`
- **API Key**: Configured in `.env.local` as `BONS_AI_API_KEY`

### Supported Models

All these models are configured to use Bons.ai:

- `anthropic/claude-sonnet-4`
- `anthropic/claude-opus-4.1`
- `anthropic/claude-sonnet-4.5`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5-codex`
- `openai/gpt-5.1-codex-max`
- `gemini-3-pro-preview`

## Project Structure

- `app/` - Next.js app router pages and API routes
- `components/` - React components
- `lib/` - Utility functions and AI providers
- `types/` - TypeScript type definitions
- `convex/` - Convex backend functions
- `db/` - Database utilities
- `public/` - Static assets

## Key Features

- ✅ Multi-model AI chat support via Bons.ai
- ✅ Real-time streaming chat interface
- ✅ Model selection dropdown
- ✅ Responsive design
- ✅ Dark mode support

## Development

- Run type checking: `pnpm type-check`
- Run linting: `pnpm lint`
- Format code: `pnpm format`
- Run tests: `pnpm test`

