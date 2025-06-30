# Environment Setup Guide

## Database Configuration Required

The login error you're experiencing is due to missing environment variables for Supabase. Follow these steps to fix it:

### 1. Create Environment File

Create a file named `.env.local` in the root directory with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy the **Project URL** for `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the **service_role** key (NOT the anon key) for `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database Schema

Your Supabase database should have these tables:

- `projects` (name, id)
- `unit_types` (name, id, project_id)
- `units` (id, unit_number, project_id, unit_type_id, username, password, floor_plan_url)
- `color_schemes` (id, name, project_id, applicableunittypes)
- `upgrade_options` (id, name, description, category, price, max_quantity, project_id, allowed_unit_types)

### 4. Restart Development Server

After creating `.env.local`:

```bash
npm run dev
```

## Test Credentials

### Admin Login:
- Username: `admin` / Password: `admin123`
- Username: `demo` / Password: `demo`

### Client Login:
Configure in your Supabase `units` table with username/password pairs.

## Troubleshooting

If you still get JSON parsing errors:
1. Check the browser console for detailed error messages
2. Verify your Supabase credentials are correct
3. Ensure your database tables exist and have the right structure
4. Check the terminal output for specific error messages 