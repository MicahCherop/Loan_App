-- Non-destructive auth/security update for an existing Wekulo Credit database.
-- Paste this into Supabase SQL Editor after confirming your admin/developer email.

CREATE TABLE IF NOT EXISTS public.pre_authorized_emails (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'officer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_authorized_emails ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authorized users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can manage pre-authorizations" ON public.pre_authorized_emails;
DROP POLICY IF EXISTS "Authenticated users can see pre-authorizations" ON public.pre_authorized_emails;
DROP POLICY IF EXISTS "Users can check their own authorization" ON public.pre_authorized_emails;

DROP POLICY IF EXISTS "Allow All Authenticated Leads" ON public.leads;
DROP POLICY IF EXISTS "Allow All Authenticated Customers" ON public.customers;
DROP POLICY IF EXISTS "Allow All Authenticated Loans" ON public.loans;
DROP POLICY IF EXISTS "Allow All Authenticated Loan Requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Allow authorized leads access" ON public.leads;
DROP POLICY IF EXISTS "Allow authorized customers access" ON public.customers;
DROP POLICY IF EXISTS "Allow authorized loans access" ON public.loans;
DROP POLICY IF EXISTS "Allow authorized loan requests access" ON public.loan_requests;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_platform_admin());

CREATE POLICY "Authorized users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role = public.authorized_role_for(email)
  );

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Users can check their own authorization" ON public.pre_authorized_emails
  FOR SELECT USING (email = lower(auth.jwt() ->> 'email') OR public.is_platform_admin());

CREATE POLICY "Admins can manage pre-authorizations" ON public.pre_authorized_emails
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Allow authorized leads access" ON public.leads
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized customers access" ON public.customers
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized loans access" ON public.loans
  FOR ALL USING (public.is_platform_user())
  WITH CHECK (public.is_platform_user());

CREATE POLICY "Allow authorized loan requests access" ON public.loan_requests
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
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    role = excluded.role;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DELETE FROM public.profiles
WHERE email <> 'mic1dev.me@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.pre_authorized_emails
    WHERE pre_authorized_emails.email = profiles.email
  );
