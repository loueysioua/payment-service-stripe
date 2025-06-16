This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

## Project Structure

This document outlines the organization of the project, designed to maintain a clean, modular, and scalable codebase. The structure is built around a Next.js application using the App Router, with clear separation of concerns for components, utilities, services, types, and configurations.
src/
├── app/                          # Next.js App Router for routing and pages
│   ├── api/                      # API routes for backend functionality
│   │   ├── checkout-sessions/    # Handles checkout session creation
│   │   ├── portal-session/       # Manages billing portal sessions
│   │   ├── products/             # Product-related API endpoints
│   │   └── webhooks/             # Webhook handlers for external services
│   ├── components/               # Page-specific React components
│   ├── (routes)/                # Grouped routes for page organization
│   │   ├── checkout/             # Checkout page and related logic
│   │   ├── success/              # Success page for completed actions
│   │   └── credits-purchase/     # Credits purchase page and logic
│   └── globals.css               # Global CSS styles
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components (e.g., buttons, modals)
│   ├── forms/                    # Form components for user input
│   └── layouts/                  # Layout components for page structure
├── lib/                          # Utility libraries and helpers
│   ├── stripe/                   # Stripe-related utility functions
│   ├── validators/               # Input validation logic
│   ├── utils/                    # General-purpose utility functions
│   └── constants/                # Application-wide constants
├── services/                     # Business logic layer
│   ├── stripe/                   # Stripe service integrations
│   ├── customer/                 # Customer management logic
│   ├── invoice/                  # Invoice handling and processing
│   └── subscription/             # Subscription management logic
├── types/                        # TypeScript type definitions
│   ├── api/                      # Types for API requests/responses
│   ├── stripe/                   # Types for Stripe integrations
│   └── common/                   # Shared types across the application
├── config/                       # Configuration files (e.g., environment settings)
└── data/                         # Mock data for development and testing

Overview

app/: Contains the Next.js App Router structure, including API routes, page-specific components, grouped routes, and global styles.
components/: Houses reusable UI components, organized into base UI elements, forms, and layouts for modularity.
lib/: Stores utility libraries, including Stripe integrations, input validators, general utilities, and constants.
services/: Encapsulates business logic for Stripe, customer management, invoices, and subscriptions.
types/: Centralizes TypeScript type definitions for APIs, Stripe, and common data structures.
config/: Holds configuration files for environment settings and other app-wide configurations.
data/: Provides mock data to support development and testing workflows.

This structure promotes maintainability, scalability, and separation of concerns, making it easy to extend and manage the codebase.

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

# payment-service-stripe
