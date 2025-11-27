# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the database to initialize

## 2. Create the Database Table

Run this SQL in your Supabase SQL Editor:

\`\`\`sql
-- Create the pdf_flashcards table
CREATE TABLE pdf_flashcards (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
pdf_hash VARCHAR(64) UNIQUE NOT NULL,
file_name TEXT NOT NULL,
flashcards TEXT NOT NULL,
file_size INTEGER,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on pdf_hash for fast lookups
CREATE INDEX idx_pdf_hash ON pdf_flashcards(pdf_hash);
\`\`\`

## 3. Get Your Supabase Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL** → Put in `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Put in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Update `.env.local`

Replace the placeholders in `.env.local` with your actual Supabase credentials:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

## 5. Restart Your Dev Server

After updating `.env.local`, restart your Next.js dev server.

## How It Works

- **First upload**: PDF is sent to Gemini, flashcards are generated and stored in Supabase
- **Subsequent uploads**: Same PDF is detected via hash, flashcards are retrieved instantly from Supabase (no Gemini API call!)
- This dramatically reduces API costs and response time for duplicate PDFs

## Benefits

✅ Instant responses for previously processed PDFs
✅ Reduced Gemini API usage and costs
✅ No rate limit issues for cached PDFs
✅ Scalable storage for thousands of PDFs
