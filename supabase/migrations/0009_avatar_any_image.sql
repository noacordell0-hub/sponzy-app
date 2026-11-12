-- Accept more image types for profile pictures (most are resized and converted in the browser first).
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
 where id = 'avatars';
