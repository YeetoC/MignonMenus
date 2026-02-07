create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tags_name_idx on public.tags (name);

create trigger tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_name_idx on public.locations (name);

create trigger locations_set_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  menu_content text not null,
  price_per_person_cents integer,
  image_path text,
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menus_title_not_blank check (length(btrim(title)) > 0),
  constraint menus_menu_content_not_blank check (length(btrim(menu_content)) > 0),
  constraint menus_price_non_negative check (price_per_person_cents is null or price_per_person_cents >= 0),
  constraint menus_status_valid check (status in ('active', 'archived'))
);

create index menus_updated_at_desc_idx on public.menus (updated_at desc);
create index menus_status_idx on public.menus (status);
create index menus_deleted_at_idx on public.menus (deleted_at);

create trigger menus_set_updated_at
before update on public.menus
for each row
execute function public.set_updated_at();
