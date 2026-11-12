-- Let users list (and therefore tidy up) their own avatar files.
drop policy if exists "avatars owner select" on storage.objects;
create policy "avatars owner select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
