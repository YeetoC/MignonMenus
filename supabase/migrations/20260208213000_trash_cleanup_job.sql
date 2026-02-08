create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Secrets for cron-triggered Edge Function invocation

do $trash_cleanup$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret(
      'https://aqjvzzkllhktpzorbnsn.supabase.co',
      'project_url',
      'Supabase project URL used for scheduled Edge Function invocations'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'trash_cleanup_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'base64'),
      'trash_cleanup_secret',
      'Shared secret header for trash cleanup Edge Function'
    );
  end if;
end
$trash_cleanup$;

create or replace function public.get_trash_cleanup_secret()
returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'trash_cleanup_secret'
  limit 1;
$$;

revoke all on function public.get_trash_cleanup_secret() from public;
grant execute on function public.get_trash_cleanup_secret() to service_role;

-- Schedule daily invocation at 03:00 UTC
select
  cron.schedule(
    'trash-cleanup-daily',
    '0 3 * * *',
    $cron$
      select
        net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/trash-cleanup',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-trash-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'trash_cleanup_secret')
          ),
          body := jsonb_build_object('invoked_at', now()),
          timeout_milliseconds := 10000
        ) as request_id;
    $cron$
  );
