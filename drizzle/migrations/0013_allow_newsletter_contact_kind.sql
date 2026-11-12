DROP POLICY IF EXISTS "anyone can send" ON public.contact_messages;
CREATE POLICY "anyone can send" ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (phone IS NULL OR char_length(phone) <= 30)
  AND char_length(btrim(message)) BETWEEN 1 AND 2000
  AND kind IN ('contact','newsletter')
);