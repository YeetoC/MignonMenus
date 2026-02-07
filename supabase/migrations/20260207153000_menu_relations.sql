create table public.menu_tags (
  menu_id uuid not null references public.menus(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (menu_id, tag_id)
);

create index menu_tags_tag_id_idx on public.menu_tags (tag_id);

create table public.menu_locations (
  menu_id uuid not null references public.menus(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (menu_id, location_id)
);

create index menu_locations_location_id_idx on public.menu_locations (location_id);

create table public.menu_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  primary key (user_id, menu_id)
);

create index menu_favorites_menu_id_idx on public.menu_favorites (menu_id);
