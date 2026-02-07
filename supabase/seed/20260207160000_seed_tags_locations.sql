insert into public.tags (name)
values
  ('Vegetarian'),
  ('Vegan'),
  ('Gluten Free'),
  ('Halal'),
  ('Kids'),
  ('Premium')
on conflict (name) do nothing;

insert into public.locations (name)
values
  ('Unassigned'),
  ('Main Hall'),
  ('Garden'),
  ('VIP'),
  ('Offsite')
on conflict (name) do nothing;
