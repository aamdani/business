-- Fix RLS policy for prompt_variable_selections
-- Allow all authenticated users to modify (not just admins)
-- This is a personal content creation tool - all users need this functionality

-- Drop the admin-only policy
DROP POLICY IF EXISTS "Admins can modify prompt_variable_selections" ON prompt_variable_selections;

-- Create policy allowing all authenticated users to modify
CREATE POLICY "Authenticated users can modify prompt_variable_selections"
  ON prompt_variable_selections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
