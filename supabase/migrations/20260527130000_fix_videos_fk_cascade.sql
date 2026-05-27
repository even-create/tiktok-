alter table public.videos drop constraint if exists videos_account_id_fkey;

alter table public.videos
  add constraint videos_account_id_fkey
  foreign key (account_id)
  references public.accounts(id)
  on delete cascade;

drop policy if exists "Allow public delete videos" on public.videos;
create policy "Allow public delete videos"
  on public.videos
  for delete
  using (true);
