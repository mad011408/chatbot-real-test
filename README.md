# Chatbot Real

A modern, full-featured chatbot application built with Next.js, React, and TypeScript.

## Features

- 🤖 Multi-model AI chat support (Anthropic, OpenAI, Google, Bons.ai)
- 💬 Real-time chat interface
- 📁 File upload and processing
- 💳 Subscription management with Stripe
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Convex account (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy `.env.local.example` to `.env.local` and fill in your environment variables

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Configuration

This project uses Bons.ai as the primary AI provider:

- **Base URL**: https://go.trybons.ai
- **API Path**: /v1/chat/completions
- **API Key**: Configure in `.env.local` as `BONS_AI_API_KEY`

## Supported Models

- anthropic/claude-sonnet-4
- anthropic/claude-opus-4.1
- openai/gpt-5-codex
- anthropic/claude-sonnet-4.5
- openai/gpt-5.1-codex-max
- anthropic/claude-opus-4.5
- gemini-3-pro-preview

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Convex
- **AI SDK**: Vercel AI SDK
- **UI Components**: Radix UI

## License

See LICENSE file for details.

