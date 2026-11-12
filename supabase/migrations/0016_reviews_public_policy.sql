-- Visitors (anon) can't run is_admin(), so keep the public rule separate from the author/admin rule.
drop policy if exists "reviews public when revealed" on public.reviews;
create policy "reviews public when revealed" on public.reviews for select to anon, authenticated
  using (revealed_at is not null and hidden_at is null);
create policy "reviews author or admin" on public.reviews for select to authenticated
  using (author_id = auth.uid() or public.is_admin());
