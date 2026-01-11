-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false);

-- RLS for storage
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
