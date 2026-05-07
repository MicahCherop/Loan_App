# Netlify Deployment Guide

This project is ready to be deployed to Netlify.

### Build Settings
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`

### Configuration
The `netlify.toml` file is already included to handle SPA routing.

### Environment Variables (CRITICAL)
Your app will crash with a "supabaseUrl is required" error unless you set these variables.

In the Netlify UI, go to **Site settings > Environment variables** and add:
1. `VITE_SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
2. `VITE_SUPABASE_ANON_KEY`: Your Supabase public anonymous key.

> **Note:** These must be prefixed with `VITE_` for Vite to bundle them into the client-side code.

### Supabase URL Configuration
Don't forget to add your Netlify URL to the "Redirect URLs" in your Supabase Authentication settings to allow proper login redirects.
