alter table public.tags enable row level security;
alter table public.locations enable row level security;
alter table public.menus enable row level security;
alter table public.menu_tags enable row level security;
alter table public.menu_locations enable row level security;
alter table public.menu_favorites enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.locations to authenticated;
grant select, insert, update, delete on table public.menus to authenticated;
grant select, insert, update, delete on table public.menu_tags to authenticated;
grant select, insert, update, delete on table public.menu_locations to authenticated;
grant select, insert, delete on table public.menu_favorites to authenticated;

create policy "authenticated_select_tags" on public.tags
for select to authenticated
using (true);

create policy "authenticated_insert_tags" on public.tags
for insert to authenticated
with check (true);

create policy "authenticated_update_tags" on public.tags
for update to authenticated
using (true)
with check (true);

create policy "authenticated_delete_tags" on public.tags
for delete to authenticated
using (true);

create policy "authenticated_select_locations" on public.locations
for select to authenticated
using (true);

create policy "authenticated_insert_locations" on public.locations
for insert to authenticated
with check (true);

create policy "authenticated_update_locations" on public.locations
for update to authenticated
using (true)
with check (true);

create policy "authenticated_delete_locations" on public.locations
for delete to authenticated
using (true);

create policy "authenticated_select_menus" on public.menus
for select to authenticated
using (true);

create policy "authenticated_insert_menus" on public.menus
for insert to authenticated
with check (true);

create policy "authenticated_update_menus" on public.menus
for update to authenticated
using (true)
with check (true);

create policy "authenticated_delete_menus" on public.menus
for delete to authenticated
using (true);

create policy "authenticated_select_menu_tags" on public.menu_tags
for select to authenticated
using (true);

create policy "authenticated_insert_menu_tags" on public.menu_tags
for insert to authenticated
with check (true);

create policy "authenticated_delete_menu_tags" on public.menu_tags
for delete to authenticated
using (true);

create policy "authenticated_select_menu_locations" on public.menu_locations
for select to authenticated
using (true);

create policy "authenticated_insert_menu_locations" on public.menu_locations
for insert to authenticated
with check (true);

create policy "authenticated_delete_menu_locations" on public.menu_locations
for delete to authenticated
using (true);

create policy "users_select_own_favorites" on public.menu_favorites
for select to authenticated
using (user_id = auth.uid());

create policy "users_insert_own_favorites" on public.menu_favorites
for insert to authenticated
with check (user_id = auth.uid());

create policy "users_delete_own_favorites" on public.menu_favorites
for delete to authenticated
using (user_id = auth.uid());
