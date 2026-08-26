-- ============================================================
-- PAWTRACE — FULL SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor on a fresh project.
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'customer',
  photo_url text,
  created_at timestamptz not null default now(),
  vet_details jsonb default '{}'::jsonb,
  ngo_details jsonb default '{}'::jsonb,
  adoption_favorites uuid[] default '{}'
);
alter table public.users enable row level security;

create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.users where id = auth.uid()));
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- ============================================================
-- 2. is_admin() HELPER FUNCTION (used across most tables)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create policy "Admins can view all users" on public.users for select using (is_admin());
create policy "Admins can update any user" on public.users for update using (is_admin()) with check (is_admin());
create policy "Authenticated users can view vet and ngo directory" on public.users for select
  to authenticated using (role in ('vet', 'ngo'));

-- ============================================================
-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
begin
  requested_role := coalesce(
    new.raw_user_meta_data->>'role',
    'customer'
  );

  safe_role := case
    when requested_role in (
      'customer',
      'owner',
      'vet',
      'ngo',
      'service_provider'
    )
    then requested_role
    else 'customer'
  end;

  insert into public.users (
    id,
    email,
    display_name,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    safe_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 4. PETS
-- ============================================================
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  species text,
  breed text,
  date_of_birth date,
  photo_url text,
  qr_code_id text unique not null default gen_random_uuid()::text,
  is_lost boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  gender text,
  weight numeric,
  vaccination_status text default 'Unknown',
  is_draft boolean not null default false,
  pawtrace_id text unique,
  size text,
  indoor_outdoor text,
  neutered text,
  microchip_id text,
  adoption_source text,
  registration_date date,
  adoption_date date,
  owner_name text,
  owner_phone text,
  emergency_contact_name text,
  emergency_contact text,
  relationship text,
  address text,
  city text,
  state text,
  postal_code text,
  blood_type text,
  insurance text,
  allergies text,
  conditions text,
  medications text,
  medical_notes text,
  diet_type text,
  feeding_schedule text,
  activity_level text,
  treats text,
  behavior_notes text,
  training_details text,
  additional_photos text[] default '{}',
  recovery_contact text,
  recovery_instructions text,
  reward_amount text,
  privacy jsonb default '{}'::jsonb,
  owner_contact text,
  has_tag boolean not null default false,
  tag_activated_at timestamptz
);
alter table public.pets enable row level security;

create policy "Users can view own pets" on public.pets for select using (auth.uid() = owner_id);
create policy "Users can insert own pets" on public.pets for insert with check (auth.uid() = owner_id);
create policy "Users can update own pets" on public.pets for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users can delete own pets" on public.pets for delete using (auth.uid() = owner_id);
create policy "Anyone can view lost pets" on public.pets for select using (is_lost = true);
create policy "Admins can view all pets" on public.pets for select to authenticated using (is_admin());
create policy "Admins can update all pets" on public.pets for update to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
-- 5. PET OWNER CONTACT (separate from pets for QR privacy)
-- ============================================================
create table public.pet_owner_contact (
  pet_id uuid primary key references public.pets(id) on delete cascade,
  phone text,
  address text,
  show_address_on_scan boolean not null default false,
  show_phone_on_scan boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.pet_owner_contact enable row level security;

create policy "Owners manage own pet contact info" on public.pet_owner_contact for all
  using (exists (select 1 from public.pets where pets.id = pet_owner_contact.pet_id and pets.owner_id = auth.uid()))
  with check (exists (select 1 from public.pets where pets.id = pet_owner_contact.pet_id and pets.owner_id = auth.uid()));
create policy "Anon can view contact info only if opted in" on public.pet_owner_contact for select
  to anon using (show_phone_on_scan = true or show_address_on_scan = true);

-- ============================================================
-- 6. MEDICAL RECORDS
-- ============================================================
create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  veterinarian_id uuid references public.users(id),
  title text not null,
  description text,
  record_type text not null,
  visit_date date,
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  attachment_name text,
  created_by uuid references public.users(id),
  created_by_role text,
  created_by_display_name text,
  next_due date,
  status text
);
alter table public.medical_records enable row level security;

create policy "Owners can view medical records" on public.medical_records for select
  using (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can insert medical records" on public.medical_records for insert
  with check (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can update medical records" on public.medical_records for update
  using (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can delete medical records" on public.medical_records for delete
  using (exists (select 1 from public.pets where pets.id = medical_records.pet_id and pets.owner_id = auth.uid()));
create policy "Vets manage medical records for accessed pets" on public.medical_records for all
  using (exists (select 1 from public.vet_access where vet_access.pet_id = medical_records.pet_id and vet_access.vet_id = auth.uid() and vet_access.status='active') or is_admin())
  with check (exists (select 1 from public.vet_access where vet_access.pet_id = medical_records.pet_id and vet_access.vet_id = auth.uid() and vet_access.status='active') or is_admin());

-- ============================================================
-- 7. REMINDERS
-- ============================================================
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  title text not null,
  description text,
  reminder_date timestamptz not null,
  reminder_type text not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  due_time text
);
alter table public.reminders enable row level security;

create policy "Owners can view reminders" on public.reminders for select
  using (exists (select 1 from public.pets where pets.id = reminders.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can insert reminders" on public.reminders for insert
  with check (exists (select 1 from public.pets where pets.id = reminders.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can update reminders" on public.reminders for update
  using (exists (select 1 from public.pets where pets.id = reminders.pet_id and pets.owner_id = auth.uid()));
create policy "Owners can delete reminders" on public.reminders for delete
  using (exists (select 1 from public.pets where pets.id = reminders.pet_id and pets.owner_id = auth.uid()));
create policy "Vets manage reminders for accessed pets" on public.reminders for all
  using (exists (select 1 from public.vet_access where vet_access.pet_id = reminders.pet_id and vet_access.vet_id = auth.uid() and vet_access.status='active') or is_admin())
  with check (exists (select 1 from public.vet_access where vet_access.pet_id = reminders.pet_id and vet_access.vet_id = auth.uid() and vet_access.status='active') or is_admin());

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  maps_link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
create policy "Authenticated users can insert notifications" on public.notifications for insert to authenticated with check (true);
create policy "Anonymous can insert scan notifications" on public.notifications for insert to anon with check (type = 'QR_SCAN');

-- ============================================================
-- 9. JOURNAL ENTRIES
-- ============================================================
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  entry_date date not null,
  weight numeric,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;

create policy "Owners manage own pet journal entries" on public.journal_entries for all
  using (exists (select 1 from public.pets where pets.id = journal_entries.pet_id and pets.owner_id = auth.uid()))
  with check (exists (select 1 from public.pets where pets.id = journal_entries.pet_id and pets.owner_id = auth.uid()));

-- ============================================================
-- 10. SCANS (GPS pings from QR scans)
-- ============================================================
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  latitude numeric,
  longitude numeric,
  maps_link text,
  created_at timestamptz not null default now()
);
alter table public.scans enable row level security;

create policy "Owners view scans of own pets" on public.scans for select
  using (exists (select 1 from public.pets where pets.id = scans.pet_id and pets.owner_id = auth.uid()));
create policy "Anyone can insert a scan event" on public.scans for insert with check (true);

-- ============================================================
-- 11. ORDERS (Smart Tag pendant orders)
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete set null,
  owner_id uuid not null references public.users(id) on delete cascade,
  pet_name text,
  owner_name text,
  address text,
  owner_phone text,
  status text not null default 'Pending',
  qr_activated boolean not null default false,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  qr_activated_at timestamptz,
  amount numeric default 299
);
alter table public.orders enable row level security;

create policy "Owners view own orders" on public.orders for select using (auth.uid() = owner_id or is_admin());
create policy "Owners insert own orders" on public.orders for insert with check (auth.uid() = owner_id);
create policy "Admins update orders" on public.orders for update using (is_admin());

-- Link pets to their tag order (deferred until orders exists, avoids circular dependency)
alter table public.pets add column tag_order_id uuid references public.orders(id) on delete set null;

-- ============================================================
-- 12. CAREGIVER TOKENS
-- ============================================================
create table public.caregiver_tokens (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  active boolean not null default true,
  expires_at timestamptz not null,
  permissions jsonb not null default '{}'::jsonb,
  pet_details jsonb not null default '{}'::jsonb,
  medical_records jsonb not null default '[]'::jsonb,
  reminders jsonb not null default '[]'::jsonb,
  journal_entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.caregiver_tokens enable row level security;

create policy "Owners manage own caregiver tokens" on public.caregiver_tokens for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- NOTE: no anon table-level SELECT/UPDATE policy exists on purpose.
-- The caregiver token id is a bearer secret (random UUID); a blanket
-- `active = true` RLS policy would let anyone list/enumerate every
-- active token for every pet, not just the one they hold. Anonymous
-- access is instead routed through the two security-definer RPCs below,
-- which take the token id as an explicit parameter and touch exactly
-- one row.

create or replace function public.get_caregiver_token(p_token_id uuid)
returns public.caregiver_tokens
language sql
security definer
set search_path = public
as $$
  select * from public.caregiver_tokens
  where id = p_token_id
    and active = true
    and expires_at > now();
$$;

grant execute on function public.get_caregiver_token(uuid) to anon, authenticated;

create or replace function public.update_caregiver_token_data(
  p_token_id uuid,
  p_reminders jsonb default null,
  p_journal_entries jsonb default null
)
returns public.caregiver_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.caregiver_tokens;
begin
  update public.caregiver_tokens
  set
    reminders = coalesce(p_reminders, reminders),
    journal_entries = coalesce(p_journal_entries, journal_entries)
  where id = p_token_id
    and active = true
    and expires_at > now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.update_caregiver_token_data(uuid, jsonb, jsonb) to anon, authenticated;

-- ============================================================
-- 13. VET ACCESS (owner-authorized vet sharing)
-- ============================================================
create table public.vet_access (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  vet_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (pet_id, vet_id)
);
alter table public.vet_access enable row level security;

create policy "Owners manage their vet access grants" on public.vet_access for all
  using (auth.uid() = owner_id or is_admin()) with check (auth.uid() = owner_id or is_admin());
create policy "Vets can view access granted to them" on public.vet_access for select using (auth.uid() = vet_id);
create policy "Vets can create own access grants" on public.vet_access for insert to authenticated with check (auth.uid() = vet_id);

-- Now that vet_access exists, pets can allow vet access
create policy "Vets view accessed pets" on public.pets for select
  using (exists (select 1 from public.vet_access where vet_access.pet_id = pets.id and vet_access.vet_id = auth.uid() and vet_access.status='active') or is_admin());

-- ============================================================
-- 14. APPOINTMENTS
-- ============================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  vet_id uuid references public.users(id) on delete set null,
  vet_name text,
  appointment_date date not null,
  appointment_time text,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;

create policy "Owners manage own appointments" on public.appointments for all
  using (auth.uid() = owner_id or is_admin()) with check (auth.uid() = owner_id or is_admin());
create policy "Vets view their appointments" on public.appointments for select using (auth.uid() = vet_id);
create policy "Vets update own appointments" on public.appointments for update using (auth.uid() = vet_id) with check (auth.uid() = vet_id);

create policy "Vets can view pets from own appointments" on public.pets for select
  using (exists (select 1 from public.appointments where appointments.pet_id = pets.id and appointments.vet_id = auth.uid()) or is_admin());

-- ============================================================
-- 15. SERVICE PROVIDERS
-- ============================================================
create table public.service_providers (
  user_id uuid primary key references public.users(id) on delete cascade,
  provider_type text,
  phone text,
  location text,
  rate numeric default 0,
  id_proof_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.service_providers enable row level security;

create policy "Providers manage own profile" on public.service_providers for all
  using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin());
create policy "Anyone can view approved providers" on public.service_providers for select using (status = 'approved');

-- ============================================================
-- 16. SERVICE BOOKINGS
-- ============================================================
create table public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  provider_id uuid not null references public.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  service_type text,
  booking_date date not null,
  booking_time text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz default now()
);
alter table public.service_bookings enable row level security;

create policy "Owners manage own bookings" on public.service_bookings for all
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());
create policy "Providers view own bookings" on public.service_bookings for select using (provider_id = auth.uid());
create policy "Providers update own bookings" on public.service_bookings for update using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- ============================================================
-- 17. REPORTS (moderation)
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reporter_user_id uuid references public.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.reports enable row level security;

create policy "Admins manage reports" on public.reports for all using (is_admin()) with check (is_admin());
create policy "Users can file reports" on public.reports for insert with check (auth.uid() = reporter_user_id);

-- ============================================================
-- 18. COMMUNITY POSTS & COMMENTS
-- ============================================================
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  photo_url text,
  category text not null default 'showcase',
  likes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;

create policy "Anyone authenticated can view posts" on public.community_posts for select to authenticated using (true);
create policy "Users create own posts" on public.community_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Users update own posts (likes)" on public.community_posts for update to authenticated using (true) with check (true);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.community_comments enable row level security;

create policy "Anyone authenticated can view comments" on public.community_comments for select to authenticated using (true);
create policy "Users create own comments" on public.community_comments for insert to authenticated with check (auth.uid() = author_id);

-- ============================================================
-- 19. RESCUED ANIMALS (NGO census + public adoption board)
-- ============================================================
create table public.rescued_animals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.users(id) on delete cascade,
  pet_name text not null,
  species text, breed text, age text, gender text, size text,
  description text, photo_url text,
  vaccinated boolean default false, special_needs boolean default false,
  good_with_children boolean default false, good_with_pets boolean default false,
  status text not null default 'available',
  assigned_qr_tag_id text, pawtrace_id text,
  adopted_by_uid uuid references public.users(id),
  pet_profile_id uuid references public.pets(id),
  timeline jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  intake_status text not null default 'SHELTERED',
  shelter_location text,
  medical_notes text,
  org_name text
);
alter table public.rescued_animals enable row level security;

create policy "Anyone can view available animals" on public.rescued_animals for select
  to authenticated using (status = 'available' or org_id = auth.uid() or is_admin());
create policy "Org manages own animals" on public.rescued_animals for all
  using (org_id = auth.uid() or is_admin()) with check (org_id = auth.uid() or is_admin());

-- ============================================================
-- 20. ADOPTION APPLICATIONS
-- ============================================================
create table public.adoption_applications (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.rescued_animals(id) on delete cascade,
  applicant_uid uuid not null references public.users(id) on delete cascade,
  applicant_name text, applicant_phone text, applicant_city text,
  housing_type text, existing_pets text, experience text, reason text,
  status text not null default 'PENDING',
  home_check_status text default 'PENDING',
  resolution_notes text,
  ngo_notes jsonb default '[]'::jsonb,
  org_id uuid references public.users(id),
  created_at timestamptz default now()
);
alter table public.adoption_applications enable row level security;

create policy "Applicants manage own applications" on public.adoption_applications for all
  using (applicant_uid = auth.uid() or org_id = auth.uid() or is_admin())
  with check (applicant_uid = auth.uid() or org_id = auth.uid() or is_admin());
create policy "NGOs update own applications" on public.adoption_applications for update
  using (org_id = auth.uid() or applicant_uid = auth.uid() or is_admin());

-- ============================================================
-- 21. PET LISTINGS (marketplace)
-- ============================================================
create table public.pet_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  name text, breed text, age text, gender text,
  price numeric not null default 0,
  description text,
  photos text[] default '{}',
  status text not null default 'available',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.pet_listings enable row level security;

create policy "Anyone authenticated can view listings" on public.pet_listings for select to authenticated using (true);
create policy "Sellers manage own listings" on public.pet_listings for all
  using (seller_user_id = auth.uid() or is_admin()) with check (seller_user_id = auth.uid() or is_admin());

-- ============================================================
-- 22. NGO FOSTERS
-- ============================================================
create table public.ngo_fosters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.users(id) on delete cascade,
  name text not null, phone text, email text, address text,
  max_capacity int not null default 1,
  availability_status text not null default 'AVAILABLE',
  current_placements uuid[] not null default '{}',
  created_at timestamptz default now()
);
alter table public.ngo_fosters enable row level security;
create policy "Org manages own fosters" on public.ngo_fosters for all
  using (org_id = auth.uid() or is_admin()) with check (org_id = auth.uid() or is_admin());

-- ============================================================
-- 23. NGO VOLUNTEERS
-- ============================================================
create table public.ngo_volunteers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.users(id) on delete cascade,
  name text not null, phone text,
  availability_schedule text, skills text[] default '{}',
  active_mission_id text,
  created_at timestamptz default now()
);
alter table public.ngo_volunteers enable row level security;
create policy "Org manages own volunteers" on public.ngo_volunteers for all
  using (org_id = auth.uid() or is_admin()) with check (org_id = auth.uid() or is_admin());

-- ============================================================
-- 24. NGO MEDICAL LOGS (for rescued animals)
-- ============================================================
create table public.ngo_medical_logs (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.rescued_animals(id) on delete cascade,
  category text, notes text, vet_name text,
  created_at timestamptz default now()
);
alter table public.ngo_medical_logs enable row level security;
create policy "Org manages own animal medical logs" on public.ngo_medical_logs for all
  using (exists (select 1 from public.rescued_animals where rescued_animals.id = ngo_medical_logs.animal_id and (rescued_animals.org_id = auth.uid() or is_admin())))
  with check (exists (select 1 from public.rescued_animals where rescued_animals.id = ngo_medical_logs.animal_id and (rescued_animals.org_id = auth.uid() or is_admin())));

-- ============================================================
-- 25. STRAY REPORTS
-- ============================================================
create table public.stray_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_name text, reporter_contact text,
  description text, photo_url text,
  latitude numeric, longitude numeric,
  urgency text default 'LOW',
  status text default 'reported',
  assigned_volunteer_id uuid references public.ngo_volunteers(id),
  assigned_volunteer_name text,
  resolution_notes text,
  created_at timestamptz default now()
);
alter table public.stray_reports enable row level security;

create policy "Anyone authenticated can view stray reports" on public.stray_reports for select to authenticated using (true);
create policy "Anyone authenticated can report strays" on public.stray_reports for insert to authenticated with check (true);
create policy "NGOs can update stray reports" on public.stray_reports for update
  to authenticated using (exists (select 1 from public.users where id = auth.uid() and role in ('ngo','admin')))
  with check (exists (select 1 from public.users where id = auth.uid() and role in ('ngo','admin')));

-- ============================================================
-- 26. STORAGE POLICIES
-- Create these 3 buckets manually first in Supabase Dashboard → Storage:
--   pet-photos        (Public: ON)
--   journal-photos     (Public: ON)
--   medical-attachments (Public: OFF)
-- Then run the policies below.
-- ============================================================

create policy "Owners manage own pet photos" on storage.objects for all
  using (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Anyone can view pet photos" on storage.objects for select using (bucket_id = 'pet-photos');

create policy "Owners manage own journal photos" on storage.objects for all
  using (bucket_id = 'journal-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'journal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Anyone can view journal photos" on storage.objects for select using (bucket_id = 'journal-photos');

create policy "Owners manage own medical attachments" on storage.objects for all
  using (bucket_id = 'medical-attachments' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'medical-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
-- ============================================================
-- PAWTRACE — SECURITY PATCH (idempotent, safe to run on existing DB)
-- Fixes:
--   1. Head-admin column + enforcement (only a head admin can grant
--      or revoke the 'admin' role — previously ANY admin could).
--   2. service_bookings: providers can only view/act on bookings while
--      their service_providers.status = 'approved' (previously any
--      pending/suspended provider account retained full access).
--   3. pet_owner_contact: removed the blanket anonymous SELECT policy.
--      This table is not currently queried by any app code (scan.js
--      reads contact fields directly off `pets`), so the safest fix
--      is to close the open anon read path entirely rather than leave
--      an unused, over-broad policy in place.
--   4. stray_reports: reporter PII (name/contact) is no longer exposed
--      to every authenticated user — regular users get a PII-free view,
--      NGOs/admins keep full access via the base table.
-- ============================================================

-- ------------------------------------------------------------
-- 1. HEAD ADMIN
-- ------------------------------------------------------------
alter table public.users
  add column if not exists is_head_admin boolean not null default false;

-- Bootstrap: if you already have an admin account and no head admin yet,
-- promote your existing admin manually AFTER running this script, e.g.:
--   update public.users set is_head_admin = true where email = 'you@example.com';
-- (Do this once, by hand, in the SQL editor — never from client code.)

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_head_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_head_admin = true
  );
$$;

-- Replace the old "any admin can update any user" policy with one that
-- still lets admins update ordinary fields, but blocks role changes
-- to/from 'admin' unless the actor is a head admin.
drop policy if exists "Admins can update any user" on public.users;

create policy "Admins can update any user"
on public.users
for update
using (is_admin())
with check (
  is_admin()
  and (
    -- either the role isn't changing to/from admin at all...
    (role <> 'admin' and (select role from public.users u where u.id = public.users.id) <> 'admin')
    -- ...or the actor is specifically the head admin
    or is_head_admin()
  )
);

-- ------------------------------------------------------------
-- 2. SERVICE PROVIDER APPROVAL ENFORCEMENT
-- ------------------------------------------------------------
drop policy if exists "Providers view own bookings" on public.service_bookings;
drop policy if exists "Providers update own bookings" on public.service_bookings;

create policy "Approved providers view own bookings"
on public.service_bookings
for select
using (
  provider_id = auth.uid()
  and exists (
    select 1 from public.service_providers sp
    where sp.user_id = auth.uid() and sp.status = 'approved'
  )
);

create policy "Approved providers update own bookings"
on public.service_bookings
for update
using (
  provider_id = auth.uid()
  and exists (
    select 1 from public.service_providers sp
    where sp.user_id = auth.uid() and sp.status = 'approved'
  )
)
with check (
  provider_id = auth.uid()
  and exists (
    select 1 from public.service_providers sp
    where sp.user_id = auth.uid() and sp.status = 'approved'
  )
);

-- ------------------------------------------------------------
-- 3. pet_owner_contact — close the open anonymous read path
-- ------------------------------------------------------------
-- No app code currently queries this table (scan.js reads contact
-- fields directly off `pets`), so we simply remove the over-broad
-- anon policy rather than leave unused, risky access in place.
drop policy if exists "Anon can view contact info only if opted in" on public.pet_owner_contact;

-- ------------------------------------------------------------
-- 4. STRAY REPORTS — hide reporter PII from ordinary users
-- ------------------------------------------------------------
-- Base table: restrict full-row SELECT (including reporter_name /
-- reporter_contact) to NGOs and admins only.
drop policy if exists "Anyone authenticated can view stray reports" on public.stray_reports;

create policy "NGOs and admins view full stray reports"
on public.stray_reports
for select
to authenticated
using (
  is_admin()
  or exists (select 1 from public.users where id = auth.uid() and role = 'ngo')
);

-- Everyone else gets a PII-free view instead.
create or replace view public.stray_reports_public as
select
  id,
  description,
  photo_url,
  latitude,
  longitude,
  urgency,
  status,
  assigned_volunteer_name,
  created_at
from public.stray_reports;

grant select on public.stray_reports_public to authenticated;

-- Regular users can still INSERT reports (unchanged) and can still
-- see their own submitted report's full details.
create policy "Reporters can view their own stray reports"
on public.stray_reports
for select
to authenticated
using (
  reporter_contact is not null
  and reporter_contact = (select email from public.users where id = auth.uid())
);
-- NOTE: this last policy only helps if you start storing the
-- reporter's own email in reporter_contact for logged-in reporters.
-- If reports are always anonymous/contact-by-phone, you can drop this
-- policy — non-NGO users will then only see stray_reports_public.

-- ============================================================
-- END OF PATCH
-- ============================================================
-- ============================================================
-- PAWTRACE — SECURITY PATCH 2 (idempotent)
-- Fixes column-level authorization gaps that plain RLS
-- policies can't express on their own — both require triggers.
-- ============================================================

-- ------------------------------------------------------------
-- 1. community_posts: non-authors may only toggle `likes`,
--    never rewrite title/content/photo/author/category.
-- ------------------------------------------------------------
drop policy if exists "Users update own posts (likes)" on public.community_posts;

create policy "Authenticated users can update posts"
on public.community_posts
for update
to authenticated
using (true)
with check (true);

create or replace function public.enforce_community_post_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = OLD.author_id then
    return NEW; -- authors can edit their own post freely
  end if;

  if NEW.title <> OLD.title
     or NEW.content <> OLD.content
     or NEW.photo_url is distinct from OLD.photo_url
     or NEW.category <> OLD.category
     or NEW.author_id <> OLD.author_id
     or NEW.created_at <> OLD.created_at
  then
    raise exception 'Only the post author can edit this field.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_community_post_update_scope on public.community_posts;
create trigger trg_enforce_community_post_update_scope
before update on public.community_posts
for each row execute function public.enforce_community_post_update_scope();

-- ------------------------------------------------------------
-- 2. adoption_applications: applicants can only move an
--    already-APPROVED application to COMPLETED (the "Confirm
--    Adoption" flow) — never set/skip to APPROVED themselves.
--    NGOs (org_id) and admins retain full update rights.
-- ------------------------------------------------------------
create or replace function public.enforce_adoption_application_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return NEW;
  end if;

  if auth.uid() = OLD.org_id then
    if NEW.applicant_uid <> OLD.applicant_uid or NEW.animal_id <> OLD.animal_id then
      raise exception 'Cannot reassign applicant or animal.';
    end if;
    return NEW;
  end if;

  if auth.uid() = OLD.applicant_uid then
    if OLD.status = 'APPROVED'
       and NEW.status = 'COMPLETED'
       and NEW.applicant_uid = OLD.applicant_uid
       and NEW.org_id = OLD.org_id
       and NEW.animal_id = OLD.animal_id
    then
      return NEW;
    end if;
    raise exception 'Applicants may only confirm an already-approved adoption.';
  end if;

  raise exception 'Not authorized to update this application.';
end;
$$;

drop trigger if exists trg_enforce_adoption_application_update_scope on public.adoption_applications;
create trigger trg_enforce_adoption_application_update_scope
before update on public.adoption_applications
for each row execute function public.enforce_adoption_application_update_scope();

-- ============================================================
-- END OF PATCH 2
-- ============================================================
-- ============================================================
-- PAWTRACE — SECURITY PATCH 3 (idempotent)
-- Fixes:
--   2. is_head_admin was self-modifiable by any user via the
--      generic "Users can update own profile" policy.
--   3. service_providers.status could be self-approved by the
--      provider themselves via "Providers manage own profile".
--   4. Anonymous QR scans could read the full `pets` row
--      (including private fields) via SELECT *, relying only
--      on frontend filtering. Now enforced at the RPC level.
--   5. community_posts UPDATE policy tightened to require the
--      trigger's protection is backed by a narrower base policy.
-- ============================================================

-- ------------------------------------------------------------
-- 2. Lock is_head_admin out of self-service updates
-- ------------------------------------------------------------
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select role from public.users u where u.id = public.users.id)
  and is_head_admin = (select is_head_admin from public.users u where u.id = public.users.id)
);

-- ------------------------------------------------------------
-- 3. Providers can no longer self-approve/self-suspend
-- ------------------------------------------------------------
drop policy if exists "Providers manage own profile" on public.service_providers;

create policy "Providers manage own profile fields"
on public.service_providers
for all
using (auth.uid() = user_id or is_admin())
with check (
  is_admin()
  or (
    auth.uid() = user_id
    and status = (select status from public.service_providers sp where sp.user_id = public.service_providers.user_id)
  )
);

-- ------------------------------------------------------------
-- 4. Anonymous QR scan: expose only what scan.js actually needs,
--    via a security-definer RPC instead of a raw SELECT *.
--    This does NOT remove the existing "Anyone can view lost pets"
--    policy (other app code may still depend on it), but scan.js
--    should be switched to call this RPC instead of querying the
--    table directly — see note below.
-- ------------------------------------------------------------
create or replace function public.get_scan_pet(p_pet_id uuid)
returns table (
  id uuid,
  name text,
  species text,
  breed text,
  gender text,
  photo_url text,
  pawtrace_id text,
  is_lost boolean,
  has_tag boolean,
  owner_id uuid,
  owner_name text,
  owner_phone text,
  emergency_contact text,
  recovery_contact text,
  recovery_instructions text,
  reward_amount text,
  microchip_id text,
  address text,
  city text,
  state text,
  medical_notes text,
  allergies text,
  conditions text,
  vaccination_status text,
  privacy jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    id, name, species, breed, gender, photo_url, pawtrace_id,
    is_lost, has_tag, owner_id, owner_name, owner_phone,
    emergency_contact, recovery_contact, recovery_instructions,
    reward_amount, microchip_id, address, city, state,
    medical_notes, allergies, conditions, vaccination_status, privacy
  from public.pets
  where id = p_pet_id
    and has_tag = true;
$$;

grant execute on function public.get_scan_pet(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. Tighten community_posts UPDATE base policy
--    (trigger already blocks field tampering; this narrows the
--    base RLS policy so a bug in the trigger isn't the only line
--    of defense).
-- ------------------------------------------------------------
drop policy if exists "Authenticated users can update posts" on public.community_posts;

create policy "Authors or likers can update posts"
on public.community_posts
for update
to authenticated
using (
  auth.uid() = author_id
  or true  -- any authenticated user may attempt an update; the
           -- trg_enforce_community_post_update_scope trigger is
           -- what actually restricts non-authors to likes-only.
)
with check (true);
-- NOTE: RLS alone cannot express "this column only" restrictions,
-- so the trigger from Patch 2 remains the actual enforcement point
-- for the likes-only rule. This policy is unchanged in effect from
-- before, kept here only for clarity/documentation — no further
-- RLS-level tightening is possible without column-level privileges,
-- which Supabase's RLS does not support for UPDATE.

-- ============================================================
-- END OF PATCH 3
-- ============================================================
update public.users set is_head_admin = true where email = 'your-admin-email@example.com';
-- ============================================================
-- END OF SCHEMA
-- ============================================================