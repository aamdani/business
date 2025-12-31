-- Fix variable stage assignments
-- research_notes_user: Should be available at outline stage (written AFTER research is done)
-- library_* variables: Should be available at draft stage (for cross-referencing during writing)

-- Move research_notes_user to outline stage
UPDATE prompt_variables
SET available_after_stage = 'outline'
WHERE variable_name = 'research_notes_user';

-- Move library variables to draft stage (they're for cross-referencing, not research input)
UPDATE prompt_variables
SET available_after_stage = 'draft'
WHERE category = 'library';
