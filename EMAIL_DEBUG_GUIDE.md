# Email Verification Debug Guide

## Common Issues and Solutions

### 1. "Email Verification Failed" Error

**Check these console logs in order:**

1. **Signup Form Logs** (`/signup`)
   ```
   🔍 Look for: "Attempting signup with:"
   - Verify email and redirectTo URL are correct
   - Check if Supabase URL is present
   ```

2. **Auth Callback Logs** (`/auth/callback`)
   ```
   🔍 Look for: "Auth callback received:"
   - Verify 'code' parameter is present
   - Check for any 'error' parameters from Supabase
   - Confirm user email and confirmation status
   ```

### 2. No Verification Email Received

**Possible causes:**
- Supabase email settings not configured
- Email provider blocking automated emails
- Wrong email address entered
- SMTP configuration issues in Supabase

**Debug steps:**
1. Check Supabase dashboard → Authentication → Settings
2. Verify email templates are enabled
3. Check spam/junk folder
4. Test with different email provider (Gmail, Outlook, etc.)

### 3. Link Expires or Already Used

**Error codes to look for:**
- `no_code`: Link missing authorization code
- `no_session`: Token exchange failed
- `configuration_error`: Supabase not configured
- `pkce_failed`: PKCE code verifier missing or invalid (cookie issue)

### 4. Console Log Patterns

**Successful Flow:**
```
✅ Attempting signup with: { email, redirectTo, supabaseUrl }
✅ Signup response: { user, confirmation_sent_at }
🔐 PKCE cookies after signup: { pkceCookies: ["sb-pkce-code-verifier=..."] }
✅ Auth callback received: { code: "abc123...", type: "signup" }
🔄 PKCE Debug - Available cookies: { supabasePkceCv: "present" }
✅ Code exchange result: { hasSession: true, hasUser: true, userConfirmed: true }
✅ Email verification successful, redirecting to: /onboard
```

**Failed Flow Examples:**
```
❌ No authorization code provided in callback
❌ Code exchange failed: { message: "Invalid code", status: 400 }
❌ User email not confirmed: { emailConfirmed: null }
🔐 PKCE Verification Failed - this is likely a cookie/session issue
🔄 PKCE Debug - Available cookies: { supabasePkceCv: "missing" }
```

### 5. Testing Steps

1. **Clear all browser data** (cookies, localStorage)
2. **Delete user from Supabase** (Authentication → Users)
3. **Sign up with fresh email**
4. **Monitor browser console** for debug logs
5. **Check email and click verification link**
6. **Monitor callback logs**

### 6. Supabase Configuration Checklist

- ✅ Email auth enabled in dashboard
- ✅ Email templates configured
- ✅ Site URL matches your domain
- ✅ Redirect URLs include `/auth/callback`
- ✅ SMTP provider configured (or using Supabase default)

### 7. PKCE (Security) Issues

**"both auth code and code verifier should be non-empty"**

This error means PKCE cookies are missing. Common causes:

1. **Browser blocks cookies** (incognito mode, strict privacy settings)
2. **Different browser/device** than signup
3. **Cookies cleared** between signup and email click
4. **Third-party cookie blocking**

**Debug steps:**
1. Check console for "🔐 PKCE cookies after signup"
2. Verify cookies persist when clicking email link
3. Try in different browser or incognito mode
4. Check browser cookie settings

### 8. Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```