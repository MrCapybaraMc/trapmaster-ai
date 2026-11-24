begin;
alter table public.traps add column if not exists extra_video_url text;
commit;