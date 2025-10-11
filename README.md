# Culture AI Suite (Bhasha AI Lab)

## Overview

**Culture AI Suite** is a comprehensive platform for building and fine-tuning AI models for low-resource Indian languages. This application empowers communities to contribute linguistic content, create curated datasets, and train custom AI models while preserving cultural and linguistic diversity.

### Tech Stack
- **Frontend**: Vite, React 19, TypeScript, React Router v7
- **Styling**: Tailwind v4, Shadcn UI, Framer Motion
- **Backend & Database**: Convex (real-time serverless backend)
- **Authentication**: Convex Auth (Email OTP, Anonymous)
- **AI Integrations**: OpenAI (GPT-3.5, GPT-4), Google Gemini
- **Icons**: Lucide Icons
- **Package Manager**: pnpm

All relevant files live in the 'src' directory.

## 🚀 Key Features

### 1. Authentication & User Management
- **Email OTP Authentication**: Secure passwordless login
- **Anonymous Guest Access**: Try the platform without registration
- **Role-Based Access Control**: Admin, User, Member roles
- **Activity Logging**: Track all key user actions

### 2. Content Management
- **Content Contribution**: Add linguistic content (text, proverbs, narratives)
- **Rich Metadata**: Language, region, category, source, dialect, cultural context
- **Draft/Published Workflow**: Review before publishing
- **AI Quality Analysis**: Optional Gemini API integration for automated scoring
- **Auto-deduplication**: Prevents duplicate entries (85% similarity threshold)
- **Comprehensive Validation**:
  - Text length: 10-10,000 characters
  - Token count: max 2000 tokens
  - Supported languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia
- **Content Browser**: Search and filter by language, type, status

### 3. Dataset Creation & Management
- **Dataset Builder**: Create curated datasets from published content
- **Advanced Filtering**: By language, content type, minimum quality score
- **Tokenization Analysis**: Detailed metrics (avg, median, min, max, stdDev, percentiles)
- **Dataset Normalization**:
  - **Manual Mode**: Custom text length, quality score, duplicate removal
  - **AI-Powered Mode**: Smart cleanup (min 50 chars, quality ≥5.0, auto-dedup)
- **Data Splitting**: Configurable train/validation/test splits
- **Export Functionality**: JSONL format for training
- **Dataset Browser**: View, filter, preview, and export datasets

### 4. Fine-tuning System
- **Unified Base Model Selection**:
  - OpenAI models (GPT-3.5 Turbo, GPT-4)
  - Custom LLM connections
  - Automatic provider inference
- **AI Parameter Optimization**:
  - Dynamic learning rate based on dataset size
  - Batch size adjustment for token variance
  - Epoch recommendations
  - LoRA rank and alpha configuration (4-64 rank based on complexity)
  - Cost and time estimates
- **Smart Split Feature**:
  - **AI-Optimized Split**: Analyzes dataset size for optimal ratios
  - **Manual Split**: Custom percentage input with validation
  - Real-time sample count display
  - Reasoning and confidence scores
- **Manual Parameter Configuration**: Full control over hyperparameters
- **Auto-Fine-tuning**: Trigger training upon dataset creation

### 5. Job Monitoring & Tracking
- **Real-time Job Tracking**: Progress, metrics, status updates
- **OpenAI Integration**: Live status polling and synchronization
- **Job Metrics**: Loss history, steps, current epoch
- **Job Cancellation**: Cancel running jobs
- **Status Filtering**: View by status (pending, running, completed, failed, cancelled)
- **Cost & Time Estimates**: Display estimated costs and duration

### 6. LLM Connections Management
- **Custom LLM Integration**: Connect external LLM providers
- **Configuration Options**:
  - API endpoints
  - Authentication types (Bearer, API Key, None)
  - Data formats (JSONL, JSON, CSV)
  - Model identifiers
- **Connection Testing**: Verify LLM connections
- **Active/Inactive Toggle**: Enable/disable connections

### 7. External Dataset Import
- **Multi-source Support**: Kaggle, file upload, URL
- **Data Format Detection**: Automatic format recognition
- **Field Mapping**: Map external fields to internal schema
- **Record Validation**: Required fields, text/token length, quality, language
- **Data Transformation**: Normalization and cleaning
- **Deduplication**: Remove duplicate entries
- **Pipeline Configuration**: Automated dataset creation and fine-tuning

### 8. Results Comparison & Testing
- **Test Prompt Management**: Add test prompts to completed jobs
- **Model Evaluation**: Compare base model vs fine-tuned model outputs
- **Metrics Calculation**: BLEU score and cultural accuracy
- **Evaluation Status Tracking**: Monitor evaluation progress

### 9. Dashboard & Analytics
- **Statistics Overview**: Total content, datasets, fine-tune jobs, average quality
- **Quick Actions**: Add content, create dataset, start fine-tuning, manage LLMs, import data
- **Recent Activities**: View recent user actions
- **LLM Connection Status**: Active/total connections display
- **Real-time Progress**: Active fine-tuning job progress

### 10. Landing Page
- **Mission Statement**: Project overview and goals
- **Feature Highlights**: Content contribution, dataset creation, AI fine-tuning
- **Key Statistics**: Real-time project metrics
- **Call-to-Actions**: For authenticated and unauthenticated users
- **Status Bar**: LLM connections, datasets, active jobs

### 11. Backend Infrastructure
- **Convex Backend**: Real-time database and server functions
- **Cron Jobs**: Automated job polling (every 5 minutes)
- **Provider Integrations**:
  - OpenAI (GPT-3.5, GPT-4)
  - Google Gemini (quality analysis)
  - Custom LLM providers
- **Internal Actions**: Scheduled background tasks
- **Data Export**: JSONL format for training

## 🎨 UI/UX Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Framer Motion Animations**: Smooth page transitions and interactions
- **Shadcn UI Components**: Consistent, modern design system
- **Dark/Light Theme Support**: Using oklch color format
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Spinners and progress indicators
- **Form Validation**: Client-side and server-side validation

## 📊 Database Schema

The application uses 11 Convex tables:
- `users`: User accounts and roles
- `content`: Linguistic content entries
- `datasets`: Curated training datasets
- `finetune_jobs`: AI model training jobs
- `test_prompts`: Model evaluation prompts
- `activities`: User activity logs
- `llm_connections`: Custom LLM integrations
- `external_datasets`: Imported external data
- `import_pipelines`: Data import workflows
- `field_mappings`: Field mapping templates

## 🛣️ Application Routes

- `/` - Landing page
- `/auth` - Authentication (sign in/sign up)
- `/dashboard` - Main dashboard
- `/content` - Content browser
- `/content/new` - Add new content
- `/content/:id` - Edit content
- `/datasets` - Dataset browser
- `/datasets/create` - Create dataset
- `/finetune` - Fine-tuning jobs list
- `/finetune/new` - Start fine-tuning
- `/finetune/:id` - Job monitoring
- `/results/:id` - Results comparison
- `/llm-connections` - LLM connections management
- `/external-import` - External dataset import

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY THESE AUTH FILES: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

When protecting a page, use the auth hooks to check for authentication and redirect to /auth.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Redirect authenticated pages and sign in / sign up to /auth.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

In `src/main.tsx`, you must add a redirect after auth URL to redirect to the correct dashboard/profile/page that should be created after authentication.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
