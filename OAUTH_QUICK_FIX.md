# OAuth Quick Fix Checklist

## ⚡ Quick Diagnostics (5 minutes)

### 1. Test Locally First
```bash
cd wekulo-credit
npm run dev
# Visit http://localhost:5173/login
# Try Google sign-in
# Check browser console (F12) for errors
```

**Expected:** Either works locally OR shows specific error message

---

### 2. Check Supabase Google OAuth Settings

**Path:** Supabase Dashboard → Authentication → Providers → Google

```
☐ Google OAuth is ENABLED (toggle is ON)
☐ Client ID field is NOT empty
☐ Client secret field is NOT empty
☐ Redirect URI includes: https://loan-app-two-tau.vercel.app/auth/callback
```

**If redirect URI is missing:**
```
Add this line to OAuth settings:
https://loan-app-two-tau.vercel.app/auth/callback
```

---

### 3. Check Google Cloud Console

**Path:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

```
☐ Client ID matches what's in Supabase
☐ Client secret matches what's in Supabase
☐ Authorized redirect URIs includes:
   https://loan-app-two-tau.vercel.app/auth/callback
☐ Authorized JavaScript origins includes:
   https://loan-app-two-tau.vercel.app
   https://your-supabase-project.supabase.co
```

---

### 4. Check Vercel Environment Variables

**Path:** Vercel Project → Settings → Environment Variables

```
☐ VITE_SUPABASE_URL is set
☐ VITE_SUPABASE_ANON_KEY is set
☐ Values match what's in your Supabase dashboard
```

**To fix:**
1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add/update these variables
5. Redeploy (Deployments → three dots → Redeploy)

---

### 5. Verify Format (Most Common Issue!)

**Redirect URL must be:**
- ✅ `https://loan-app-two-tau.vercel.app/auth/callback`
- ✅ All lowercase
- ✅ No trailing slash
- ✅ HTTPS only (not HTTP)

**NOT:**
- ❌ `https://loan-app-two-tau.vercel.app/auth/callback/`
- ❌ `HTTP://...`
- ❌ `https://Loan-App-Two-Tau.Vercel.app/...`

---

### 6. Check Browser Console

**Steps:**
1. Open your app: https://loan-app-two-tau.vercel.app/login
2. Press F12 to open DevTools
3. Go to Console tab
4. Click "Sign in with Google"
5. Look for error messages

**Expected error if misconfigured:**
```
Google OAuth Error: {error: "server_error", code: "unexpected_failure", ...}
```

---

### 7. Try These One-at-a-Time

**If still getting "Unable to exchange external code: 4/0A":**

**A. Clear browser cache**
- Ctrl+Shift+Delete (Windows/Linux)
- Cmd+Shift+Delete (Mac)
- Clear all cookies and site data
- Try again

**B. Regenerate Google OAuth credentials**
- Google Cloud Console
- Delete old OAuth 2.0 Client ID
- Create new one
- Copy credentials to Supabase
- Redeploy Vercel

**C. Test with fresh incognito window**
- Ctrl+Shift+N (Windows) / Cmd+Shift+N (Mac)
- Go to login page
- Try sign-in
- Check console for errors

---

## 🔧 Complete Fix Process (If Above Doesn't Work)

### Step 1: Delete and Recreate Google OAuth Credentials

1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Find your OAuth 2.0 Client ID
4. Click delete (trash icon)
5. Click "Create Credentials" → OAuth client ID
6. Select "Web application"
7. Add Name: "Wekulo Credit App"
8. Add Authorized redirect URIs:
   ```
   https://loan-app-two-tau.vercel.app/auth/callback
   http://localhost:5173/auth/callback
   ```
9. Add Authorized JavaScript origins:
   ```
   https://loan-app-two-tau.vercel.app
   https://your-supabase-project.supabase.co
   http://localhost:5173
   ```
10. Click Create
11. Copy Client ID and Client secret

### Step 2: Update Supabase OAuth Settings

1. Supabase Dashboard → Authentication → Providers → Google
2. Paste Client ID
3. Paste Client secret
4. Make sure redirect URI includes: `https://loan-app-two-tau.vercel.app/auth/callback`
5. Click Enable (if not already)
6. Click Save

### Step 3: Update Vercel Environment Variables

1. Go to Vercel project settings
2. Environment Variables
3. Make sure these are set:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Click "Redeploy" on Deployments page

### Step 4: Test

- Local: `npm run dev` → `http://localhost:5173/login`
- Production: `https://loan-app-two-tau.vercel.app/login`
- Try Google sign-in
- Check browser console (F12) for errors

---

## 📋 URL Examples

Replace these with your actual values:

```
Your Supabase Project URL: 
  https://your-supabase-project.supabase.co

Your Redirect URL: 
  https://loan-app-two-tau.vercel.app/auth/callback

Local Redirect URL: 
  http://localhost:5173/auth/callback

Google OAuth Redirect URIs (should have BOTH):
  https://loan-app-two-tau.vercel.app/auth/callback
  http://localhost:5173/auth/callback
```

---

## 🐛 Error Messages & Meanings

| Error | Meaning | Fix |
|-------|---------|-----|
| `Unable to exchange external code: 4/0A` | Supabase can't talk to Google | Check credentials + redirect URL |
| `invalid_grant` | Google says credentials invalid | Regenerate OAuth credentials |
| `redirect_uri_mismatch` | URL doesn't match Google config | Check exact URL format |
| `access_denied` | User rejected OAuth | Normal, try again |
| `unexpected_failure` | Generic backend error | Check Supabase logs |

---

## 📞 Still Stuck?

Check these in order:

1. **Browser console (F12)** - Does it show a specific error?
2. **Supabase Logs** - Auth → Logs, any errors?
3. **Google Cloud Logs** - Any OAuth errors?
4. **Local testing** - Does it work on `localhost:5173`?
5. **URL format** - Exact match, lowercase, no trailing slash?

Good luck! 🚀
