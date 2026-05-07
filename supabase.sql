-- SQL Schema for Wekulo Credit Officer Portal
-- Paste this into your Supabase SQL Editor

-- 1. Reset everything to ensure a clean state
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS loan_requests CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS pre_authorized_emails CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create Profiles table for RBAC
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'officer' CHECK (role IN ('developer', 'admin', 'officer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-authorized emails for role assignment
CREATE TABLE pre_authorized_emails (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'officer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Create Leads Table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'converted', 'rejected')),
  officer_id UUID REFERENCES auth.users(id)
);

-- 4. Create Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  photo_url TEXT,
  address TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Prevent FK errors if lead is deleted
  officer_id UUID REFERENCES auth.users(id)
);

-- 5. Create Loans Table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  interest_rate NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'active', 'overdue', 'closed')),
  disbursement_date DATE,
  due_date DATE,
  repayment_amount NUMERIC NOT NULL,
  officer_id UUID REFERENCES auth.users(id)
);

-- 6. Create Repeat Loan Requests Table
CREATE TABLE loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  officer_id UUID REFERENCES auth.users(id)
);

-- 7. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_authorized_emails ENABLE ROW LEVEL SECURITY;

-- 8. Security helper functions and policies
CREATE OR REPLACE FUNCTION public.authorized_role_for(user_email TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN lower(user_email) = 'mic1dev.me@gmail.com' THEN 'developer'
    ELSE (
      SELECT role
      FROM public.pre_authorized_emails
      WHERE email = lower(user_email)
      LIMIT 1
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'mic1dev.me@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'developer')
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_platform_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('officer', 'admin', 'developer')
      AND (
        email = 'mic1dev.me@gmail.com'
        OR EXISTS (
          SELECT 1
          FROM public.pre_authorized_emails
          WHERE pre_authorized_emails.email = profiles.email
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Profiles: users can see their own profile; admins can manage platform profiles.
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR public.is_platform_admin());

CREATE POLICY "Authorized users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role = public.authorized_role_for(email)
  );

CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Pre-authorized emails: authenticated users can check only their own email;
-- admins/developers can manage the allow-list.
CREATE POLICY "Users can check their own authorization" ON pre_authorized_emails
  FOR SELECT USING (email = lower(auth.jwt() ->> 'email') OR public.is_platform_admin());

CREATE POLICY "Admins can manage pre-authorizations" ON pre_authorized_emails
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Application data is available only to users with an authorized profile.
CREATE POLICY "Allow authorized leads access" ON leads
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized customers access" ON customers
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized loans access" ON loans
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized loan requests access" ON loan_requests
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE OR REPLACE FUNCTION public.authorize_user_email(target_email TEXT, target_role TEXT)
RETURNS VOID AS $$
DECLARE
  normalized_email TEXT;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can authorize users';
  END IF;

  normalized_email := lower(trim(target_email));

  IF normalized_email = '' OR normalized_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'A valid email address is required';
  END IF;

  IF target_role NOT IN ('admin', 'officer') THEN
    RAISE EXCEPTION 'Invalid role %', target_role;
  END IF;

  INSERT INTO public.pre_authorized_emails (email, role, created_by)
  VALUES (normalized_email, target_role, auth.uid())
  ON CONFLICT (email) DO UPDATE SET
    role = excluded.role,
    created_by = excluded.created_by;

  UPDATE public.profiles
  SET role = target_role
  WHERE email = normalized_email
    AND role <> 'developer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_authorized_user_role(target_email TEXT, target_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM public.authorize_user_email(target_email, target_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.revoke_user_email(target_email TEXT)
RETURNS VOID AS $$
DECLARE
  normalized_email TEXT;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke users';
  END IF;

  normalized_email := lower(trim(target_email));

  IF normalized_email = 'mic1dev.me@gmail.com' THEN
    RAISE EXCEPTION 'The developer account cannot be revoked';
  END IF;

  DELETE FROM public.pre_authorized_emails
  WHERE email = normalized_email;

  DELETE FROM public.profiles
  WHERE email = normalized_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Functions & Triggers
-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  assigned_role := public.authorized_role_for(new.email);

  IF assigned_role IS NULL THEN
    RAISE EXCEPTION 'Email % is not authorized for Wekulo Credit', new.email;
  END IF;

  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, lower(new.email), assigned_role)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Backfill existing users (Crucial to prevent 404s for users created before the trigger)
INSERT INTO public.profiles (id, email, role)
SELECT id, lower(email), public.authorized_role_for(email) FROM auth.users
WHERE public.authorized_role_for(email) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Special developer assignment
UPDATE public.profiles SET role = 'developer' WHERE email = 'mic1dev.me@gmail.com';
