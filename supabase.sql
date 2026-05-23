-- SQL Schema for Wekulo Credit Officer Portal
-- Paste this into your Supabase SQL Editor

-- 1. Reset everything to ensure a clean state
DROP TABLE IF EXISTS repayments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS loan_requests CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create Profiles table for RBAC
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'officer' CHECK (role IN ('developer', 'admin', 'officer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- 6. Create Repayments Table
CREATE TABLE repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  method TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'mpesa', 'bank', 'cheque')),
  reference TEXT,
  note TEXT,
  officer_id UUID REFERENCES auth.users(id)
);

-- 6.b Create Push Payment Requests Table
CREATE TABLE push_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  customer_name TEXT,
  purpose TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  initiated_by UUID REFERENCES auth.users(id),
  daraja_checkout_request_id TEXT,
  daraja_response_code TEXT,
  daraja_response JSONB
);

ALTER TABLE push_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push payment requests" ON public.push_payment_requests
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Users can update their own push payment requests" ON public.push_payment_requests
  FOR UPDATE USING (auth.uid() = initiated_by)
  WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Users can view their own push payment requests" ON public.push_payment_requests
  FOR SELECT USING (auth.uid() = initiated_by);

CREATE POLICY "Admins can manage push payment requests" ON public.push_payment_requests
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 7. Create Repeat Loan Requests Table
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
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;

-- 8. Security helper functions and policies
CREATE OR REPLACE FUNCTION public.normalized_email(input_email TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN strpos(trim(input_email), '@') = 0 THEN lower(trim(input_email))
    ELSE lower(regexp_replace(split_part(trim(input_email), '@', 1), '\+.*$', '')) || '@' || lower(split_part(trim(input_email), '@', 2))
  END;
$$ LANGUAGE sql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION public.authorized_role_for(user_email TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN public.normalized_email(user_email) = 'mic1dev.me@gmail.com' THEN 'developer'
    ELSE 'officer'
  END;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT public.normalized_email(coalesce(auth.jwt() ->> 'email', '')) = 'mic1dev.me@gmail.com'
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



CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.authorized_role_for(email));

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

CREATE POLICY "Allow authorized repayments access" ON repayments
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized loan requests access" ON loan_requests
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

-- User role management (admins can update profiles directly)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, target_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  IF target_role NOT IN ('admin', 'officer', 'developer') THEN
    RAISE EXCEPTION 'Invalid role %', target_role;
  END IF;

  UPDATE public.profiles
  SET role = target_role
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke user access (delete profile)
CREATE OR REPLACE FUNCTION public.revoke_user_access(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke user access';
  END IF;

  DELETE FROM public.profiles
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Functions & Triggers
-- Create profile on signup with auto-assigned role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, lower(new.email), public.authorized_role_for(new.email))
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
ON CONFLICT (id) DO NOTHING;
