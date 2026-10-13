# CardWise — Google login setup (free)

Do this once. Takes ~10 minutes.

## 1. Run auth SQL in Supabase

1. Supabase → **SQL** → New query  
2. Open `db/auth.sql` → copy all → paste → **Run**

## 2. Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/)  
2. Create or pick a project (e.g. `cardwise`)  
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `CardWise`
   - Support email: yours
   - Save (you can leave scopes at default email/profile)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `CardWise Web`
   - **Authorized JavaScript origins**
     - `https://cardwise-xi-ivory.vercel.app`
     - `http://localhost:5180` (optional, for local testing)
   - **Authorized redirect URIs** (important)
     - `https://givtbcrjkivkqeffrzxl.supabase.co/auth/v1/callback`
   - Create → copy **Client ID** and **Client Secret**

## 3. Turn on Google in Supabase

1. Supabase → **Authentication → Providers → Google**  
2. Enable  
3. Paste Client ID + Client Secret  
4. Save  

## 4. Allow your site URLs

Supabase → **Authentication → URL Configuration**

- **Site URL:** `https://cardwise-xi-ivory.vercel.app`  
- **Redirect URLs** (add all):
  - `https://cardwise-xi-ivory.vercel.app/**`
  - `https://cardwise-xi-ivory.vercel.app/`
  - `http://localhost:5180/**` (optional)

## 5. Test

1. Open https://cardwise-xi-ivory.vercel.app  
2. Click **Sign in with Google**  
3. After login, add a card → **My Cards**  
4. Open the same site on another browser/device → same My Cards  

## Notes

- Google Sign-In is free for this use  
- Supabase Free includes Auth (50k MAU)  
- We never store card numbers — only product ids like `hdfc-swiggy`  
