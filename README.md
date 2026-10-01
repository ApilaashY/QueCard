# QueCard

### Turn your course material into something you can actually study.

QueCard is an AI-assisted study workspace that turns documents and YouTube lessons into source-grounded study material. Bring your own learning resources, generate flashcards, ask questions against the material, or listen to an audio recap. Keep the work organized by book, then move between reading, retrieval practice, and conversation without losing the source context.

Instead of starting with a blank chat window, QueCard starts with what you are learning. Its document pipeline extracts and indexes your material; its study tools build on that shared content.

## What You Can Do

- **Build a library around a subject.** Create separate books for courses, chapters, projects, or topics, then add one or more sources to each.
- **Bring in PDFs.** Extract text locally and split it into searchable chunks. An optional AWS Textract path supports OCR-oriented extraction for PDFs that need it.
- **Learn from YouTube.** Add a video URL and QueCard imports its available transcript. Videos without an accessible transcript cannot be processed through this path.
- **Generate flashcards from your sources.** Create a question-and-answer set from the material in a book, then open it in a focused study view with flip, previous/next, and progress controls. LaTeX expressions are rendered in cards.
- **Shape a card set with a prompt.** Ask QueCard to revise an existing set in natural language; the generation prompt asks the model to keep the card count unchanged. Review generated changes: AI output can still be incomplete or incorrect.
- **Ask questions in context.** Chat with the material in a book. QueCard finds the five most semantically relevant stored chunks and streams an answer as it is generated. The assistant is instructed to distinguish source-backed answers from general knowledge when the excerpts do not contain an answer.
- **Listen to a recap.** Generate a conversational, two-host podcast script and synthesized WAV audio from a book's source material, then play it in the workspace.
- **Keep related learning together.** Books contain their documents, conversations, card sets, and podcasts, so the different study formats stay tied to the same material.

## How It Works

1. Create a book and add a PDF or a YouTube URL.
2. QueCard extracts source text and splits it into chunks. PDF text extraction is local by default; YouTube text comes from the video's transcript.
3. The app creates normalized 384-dimensional embeddings with `Xenova/bge-small-en-v1.5` and stores the chunks and vectors in PostgreSQL with `pgvector`.
4. Ask for flashcards or a podcast, or start a chat. Generation uses the stored source chunks; chat embeds the question and retrieves the closest five chunks before calling Gemini.
5. Study the resulting cards, listen to the generated audio, or continue asking questions from the same book.

## Built With

| Area | Technologies |
| --- | --- |
| Web app and API | Next.js App Router, React, TypeScript |
| Database and models | PostgreSQL, Prisma, `pgvector` |
| Authentication and object storage | Supabase Auth, Supabase Storage |
| Language and speech generation | Google Gemini API |
| Embeddings and retrieval | Transformers.js, `Xenova/bge-small-en-v1.5`, vector similarity search |
| Request controls and cache | Redis, `ioredis` |
| PDF / video ingestion | `pdfreader`, LangChain text splitters, YouTube transcript retrieval |
| Optional OCR | AWS Textract and S3 |
| Tests and linting | Jest, React Testing Library, ESLint |

## Repository Map

```text
app/
	api/                 Next.js route handlers for books, documents, AI, and audio
	app/                 Authenticated workspace, book view, and flashcard study view
	login/ signup/       Supabase Auth screens
components/            Shared UI, including the navigation bar
lib/                   Prisma, Supabase, Redis, parsing, embeddings, and audio helpers
prisma/                PostgreSQL data model and migrations
docker/                Container image and startup scripts
```

Key API route groups:

| Route group | Purpose |
| --- | --- |
| `/api/queue-card/*` | Create, list, fetch, edit, and delete books and flashcard sets |
| `/api/documents/*` | Upload, process, check, and remove source documents |
| `/api/ai/*` | Generate flashcards, generate podcasts, and stream book chat |
| `/api/convos/*` | Retrieve book conversation metadata |
| `/api/podcasts/audio/[id]` | Stream a stored podcast WAV file |

## Run Locally

### Prerequisites

- Node.js 20.9 or newer and npm
- A Supabase project with a PostgreSQL database that supports `pgvector`
- A Google Gemini API key
- A Redis server
- A Supabase Storage bucket named `Podcasts` if you want podcast audio generation

AWS credentials and an S3 bucket are only needed when opting into AWS Textract for PDF processing.

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment variables

Create `.env.local` in the project root. It is git-ignored. Add the values for the services you will use:

```dotenv
# Supabase project and browser authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase PostgreSQL connections. Use the pooled URL at runtime where available.
DATABASE_URL=your-postgres-connection-url
DIRECT_URL=your-direct-postgres-connection-url

# Server-side Gemini and privileged Supabase access
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-service-role-key

# Local service endpoints
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

`DIRECT_URL` falls back to `DATABASE_URL` in the Prisma config. `SUPABASE_URL` falls back to `NEXT_PUBLIC_SUPABASE_URL` in the server client. The server code currently reads the Supabase **service-role key** from the variable named `SUPABASE_ANON_KEY`; despite that variable name, use the privileged service-role key there. Keep it server-only: never prefix it with `NEXT_PUBLIC_`, commit it, or expose it to browser code. The browser-facing `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be the project's anon/public key.

When `USE_AWS_OCR=true`, also configure:

```dotenv
USE_AWS_OCR=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket
```

The app defaults to local PDF text extraction when `USE_AWS_OCR` is unset or not `true`. Do not add real credentials to this README or source control.

### 3. Prepare Supabase

Enable the vector extension in the Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then generate Prisma Client and apply the Prisma schema to the database:

```bash
npm run db:generate
npm run db:push
```

The schema includes the application tables and a `vector` embedding field. To use sign-up and sign-in, enable email authentication in Supabase and configure its site URL / redirect settings for your local origin. To generate podcasts, create a Supabase Storage bucket named exactly `Podcasts`; the server-side service-role key is used to store and retrieve audio.

### 4. Start Redis

Start the included Redis service with Docker Compose:

```bash
docker compose up -d my-redis-cache
```

The Compose file also defines the application container; targeting `my-redis-cache` starts only Redis. The local `REDIS_URL` above connects to its published port.

### 5. Start QueCard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start a book. For local signup, make sure your Supabase Auth settings allow the local site URL.

## Environment Variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sign-up and sign-in | Supabase project URL used by the browser client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sign-up and sign-in | Supabase anon/public key; safe to expose as a public project key. |
| `DATABASE_URL` | Database access | PostgreSQL connection used by Prisma at runtime. |
| `DIRECT_URL` | Prisma CLI / direct DB connection | Optional if `DATABASE_URL` is usable directly; Prisma config falls back to it. |
| `GEMINI_API_KEY` | Flashcards, edits, chat, podcasts | Server-side key for Gemini text and audio generation. |
| `REDIS_URL` | AI generation and book-list cache | Required by the Redis client; use `redis://localhost:6379` for the Compose service locally. |
| `NEXT_PUBLIC_BASE_URL` | Browser-side API requests | Set to the app origin, e.g. `http://localhost:3000`. |
| `SUPABASE_URL` | Podcast audio storage | Optional if `NEXT_PUBLIC_SUPABASE_URL` is set. |
| `SUPABASE_ANON_KEY` | Podcast audio storage and server auth helper | Despite the name, this server variable must contain the Supabase service-role key. Treat it as a secret. |
| `USE_AWS_OCR` | AWS PDF OCR | Set to `true` to select the Textract/S3 path. |
| `AWS_REGION` | AWS PDF OCR | Defaults to `us-east-1` in the AWS clients. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS PDF OCR | AWS credentials with only the permissions the app needs. |
| `AWS_S3_BUCKET_NAME` | AWS PDF OCR | Bucket used for the uploaded source PDFs. |

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production app. |
| `npm start` | Serve a production build. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Jest suite. |
| `npm run test:watch` | Run Jest in watch mode. |
| `npm run test:coverage` | Run Jest with coverage collection. |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:push` | Synchronize the Prisma schema with the configured database. |
| `npm run db:studio` | Open Prisma Studio. |

`docker compose up --build` builds and starts both the application and Redis. The Compose app service currently forwards database, Supabase, and Redis settings, but does not include every setting QueCard needs (including `GEMINI_API_KEY` and `NEXT_PUBLIC_BASE_URL`). Extend the service configuration and provide any public variables required at build time before relying on the container for a complete app workflow. The application container's entrypoint enables `pgvector`, runs `prisma db push --accept-data-loss`, and then starts Next.js. Review that schema-sync behavior carefully before using the provided container flow against a production database; use a deliberate migration process for production deployments.

## Quality Checks

Run the checks before submitting changes:

```bash
npm run lint
npm test -- --runInBand
```

Tests use Jest with the `jest-environment-jsdom` environment and are colocated in `__tests__` directories. External services should be mocked in tests; a working Supabase, Redis, or Gemini account is not a substitute for deterministic test coverage.

## Project Status and Deployment Notes

QueCard is an evolving project. Generated study content should be checked against its source, and the YouTube import path depends on a transcript being available. AI usage is subject to Google Gemini quotas and pricing; Redis also enforces rate limits on generation endpoints.

Authentication is integrated with Supabase, and some book-list operations validate the user's token. However, authentication and book-ownership checks are **not yet applied consistently across every API route**. Before making an instance available to untrusted users, review and enforce authorization on every route that reads or mutates books, documents, chats, card sets, or podcasts. Do not treat the current app as production-hardened solely because sign-in is present.

For a deployment, configure the same server-side integrations and public Supabase values in the hosting environment, use durable PostgreSQL and Redis services, create the `Podcasts` storage bucket if audio is enabled, and protect privileged credentials. The app uses Next.js standalone output; the included Dockerfile builds that output. See the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying) for hosting-specific options.

## Contributing

Issues and focused pull requests are welcome. For code changes, include or update tests around the behavior being changed, run ESLint and Jest, and avoid committing local environment files or generated secrets.
