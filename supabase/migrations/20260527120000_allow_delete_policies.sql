drop policy if exists "Allow public delete accounts" on public.accounts;
create policy "Allow public delete accounts"
  on public.accounts
  for delete
  using (true);

drop policy if exists "Allow public delete videos" on public.videos;
create policy "Allow public delete videos"
  on public.videos
  for delete
  using (true);
