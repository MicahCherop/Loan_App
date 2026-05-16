# Google OAuth Configuration - Setup Guide

## Current Error

```
Error: server_error
Code: unexpected_failure
Message: Unable to exchange external code: 4/0A
```

This means Supabase cannot exchange your Google OAuth code for a token. This is a **backend configuration issue**, not a code issue.

---

## Root Causes (in order of likelihood)

1. ❌ **Redirect URL not whitelisted in Supabase OAuth settings**
2. ❌ **Google OAuth credentials incorrect or expired**
3. ❌ **Redirect URL mismatch between Supabase and Google**
4. ❌ **Google OAuth scope restrictions**

---

## Step 1: Verify Supabase OAuth Settings

Go to **Supabase Dashboard** → Your Project → **Authentication** → **Providers** → **Google**

### Check These:

**A. Authorized redirect URIs**
- Must include: `https://loan-app-two-tau.vercel.app/auth/callback`
- Format: `https://your-app-domain.com/auth/callback` (lowercase, exact match)
- NOT: `http://` (must be HTTPS for production)

**B. Google credentials**
- Client ID is filled
- Client secret is filled and not blank
- ✅ Credentials are enabled (toggle on)

**C. Scopes**
- At minimum: `email` and `profile`
- These should be auto-set by Supabase

---

## Step 2: Check Google OAuth App Configuration

Go to **Google Cloud Console** → Your Project → **APIs & Services** → **Credentials**

### OAuth 2.0 Client ID (Web application)

**A. Authorized redirect URIs**
```
https://loan-app-two-tau.vercel.app/auth/callback
```

**B. Authorized JavaScript origins**
```
https://loan-app-two-tau.vercel.app
https://your-supabase-project.supabase.co
```

**C. Scopes (in Google Cloud Console → OAuth consent screen)**
- openid
- email
- profile

**Example Configuration:**
```
Client ID: xxxxxxx-xxxxxxxxxxxxx.apps.googleusercontent.com
Client secret: GOCSPX-xxxxxxxxxxxxxx

Authorized redirect URIs:
  https://loan-app-two-tau.vercel.app/auth/callback
  https://your-supabase-project.supabase.co

Authorized JavaScript origins:
  https://loan-app-two-tau.vercel.app
  https://your-supabase-project.supabase.co
```

---

## Step 3: Verify Environment Variables

### In Supabase Dashboard
Check that your project has:
- ✅ VITE_SUPABASE_URL: `https://your-supabase-project.supabase.co`
- ✅ VITE_SUPABASE_ANON_KEY: (valid anon key)

### In Vercel Deployment Settings
- Go to your Vercel project
- Settings → Environment Variables
- Verify these are set:
  ```
  VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```

### In Local .env (for local testing)
```
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 4: Test Locally First

**DO NOT** deploy to production while troubleshooting. Test locally:

```bash
cd wekulo-credit
npm run dev
```

Go to `http://localhost:5173/login` and try Google sign-in.

**If it works locally but not on Vercel:**
- Environment variables are missing on Vercel
- Redirect URL needs adjustment

**If it fails locally:**
- Google OAuth credentials are wrong
- Supabase settings are wrong

---

## Step 5: Fix Common Issues

### Issue: "Unable to exchange external code: 4/0A"

**Try these in order:**

1. **Redeploy Vercel**
   - Push a small change to trigger redeploy
   - Vercel → Deployments → Redeploy

2. **Regenerate Google OAuth credentials**
   - Delete existing OAuth 2.0 Client ID
   - Create new one
   - Copy credentials to Supabase

3. **Check URL case sensitivity**
   - Ensure all URLs are lowercase
   - NO trailing slashes
   - Exact format: `https://loan-app-two-tau.vercel.app/auth/callback`

4. **Verify Supabase Project is Running**
   - Go to Supabase Dashboard
   - Check project status (should be green/active)

5. **Clear Browser Cache**
   ```bash
   # Hard refresh browser
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

---

## Step 6: Enable Debug Logging

**In `src/pages/Login.jsx`**, the handleGoogleLogin now logs errors:

```javascript
const handleGoogleLogin = async () => {
  setLoading(true);
  setError(null);
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    console.error('Google OAuth Error:', error); // ← Check browser console
    setError(error.message);
  }
};
```

**To view error details:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try Google sign-in again
4. Look for "Google OAuth Error" message

---

## Step 7: Verify the Callback Flow

**Updated callback.jsx now:**
1. ✅ Checks for error parameters in URL
2. ✅ Displays error message if OAuth fails
3. ✅ Shows loading spinner with better styling
4. ✅ Logs all errors to console

**If you see "Completing sign in..." stuck:**
- Check browser console (F12)
- Look for error messages
- Verify environment variables loaded

---

## Complete Checklist

- [ ] Supabase Google OAuth provider is **enabled**
- [ ] Redirect URI in Supabase: `https://loan-app-two-tau.vercel.app/auth/callback`
- [ ] Google OAuth Client ID copied to Supabase
- [ ] Google OAuth Client secret copied to Supabase
- [ ] Google OAuth app has redirect URI whitelisted
- [ ] Vercel has `VITE_SUPABASE_URL` env var
- [ ] Vercel has `VITE_SUPABASE_ANON_KEY` env var
- [ ] Tested locally at `http://localhost:5173`
- [ ] Redeployed to Vercel after fixes
- [ ] Cleared browser cache
- [ ] Checked browser console for errors (F12)

---

## Get Help

If still stuck:

1. **Check Supabase logs:**
   - Supabase Dashboard → Logs → Auth
   - Look for OAuth errors

2. **Check Google Cloud logs:**
   - Google Cloud Console → Logs
   - Search for OAuth errors

3. **Verify JSON format:**
   - Is your Google credentials a valid JSON?
   - Are special characters properly escaped?

4. **Test with cURL:**
   ```bash
   curl -X POST https://your-supabase-project.supabase.co/auth/v1/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "authorization_code",
       "code": "test_code",
       "redirect_uri": "https://loan-app-two-tau.vercel.app/auth/callback"
     }'
   ```

---

## After Fixing

1. Deploy to Vercel
2. Try signing in with Google
3. Should redirect to dashboard
4. If stuck on callback, check F12 console for errors

Good luck! 🚀
