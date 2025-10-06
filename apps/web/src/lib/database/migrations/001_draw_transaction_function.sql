-- Create the atomic draw transaction function
-- This ensures all assignments are created atomically or none at all

CREATE OR REPLACE FUNCTION execute_draw_transaction(
  p_event_id UUID,
  p_assignments JSONB,
  p_audit_seed TEXT,
  p_skipped_horses INTEGER[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignment JSONB;
  assignment_count INTEGER := 0;
  audit_log_id UUID;
  result JSONB;
BEGIN
  -- Start transaction (implicitly handled by function)

  -- Validate event exists and is in correct state
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND status = 'lobby'
  ) THEN
    RAISE EXCEPTION 'Event not found or not in lobby state';
  END IF;

  -- Check if assignments already exist
  IF EXISTS (
    SELECT 1 FROM assignments
    WHERE event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Draw has already been executed for this event';
  END IF;

  -- Create audit log entry first
  INSERT INTO audit_logs (
    event_id,
    action,
    details,
    created_at
  ) VALUES (
    p_event_id,
    'draw_executed',
    jsonb_build_object(
      'seed', p_audit_seed,
      'assignments_created', jsonb_array_length(p_assignments),
      'skipped_horses', array_to_json(p_skipped_horses),
      'timestamp', NOW(),
      'algorithm', 'fisher_yates_crypto'
    ),
    NOW()
  ) RETURNING id INTO audit_log_id;

  -- Insert all assignments
  FOR assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    -- Validate patron entry exists
    IF NOT EXISTS (
      SELECT 1 FROM patron_entries
      WHERE id = (assignment->>'patron_entry_id')::UUID
      AND event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'Patron entry % not found', assignment->>'patron_entry_id';
    END IF;

    -- Validate horse exists and is not scratched
    IF NOT EXISTS (
      SELECT 1 FROM event_horses
      WHERE id = (assignment->>'event_horse_id')::UUID
      AND event_id = p_event_id
      AND is_scratched = false
    ) THEN
      RAISE EXCEPTION 'Horse % not found or is scratched', assignment->>'event_horse_id';
    END IF;

    -- Insert assignment
    INSERT INTO assignments (
      event_id,
      patron_entry_id,
      event_horse_id,
      draw_order,
      created_at
    ) VALUES (
      p_event_id,
      (assignment->>'patron_entry_id')::UUID,
      (assignment->>'event_horse_id')::UUID,
      (assignment->>'draw_order')::INTEGER,
      NOW()
    );

    assignment_count := assignment_count + 1;
  END LOOP;

  -- Update event status to 'drawing'
  UPDATE events
  SET status = 'drawing', updated_at = NOW()
  WHERE id = p_event_id;

  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'assignments_created', assignment_count,
    'audit_log_id', audit_log_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Any error will automatically rollback the transaction
    RAISE EXCEPTION 'Draw transaction failed: %', SQLERRM;
END;
$$;

-- Create function for undo functionality
CREATE OR REPLACE FUNCTION undo_draw_assignments(
  p_event_id UUID,
  p_assignment_count INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignments_to_delete UUID[];
  deleted_count INTEGER := 0;
  audit_log_id UUID;
  result JSONB;
BEGIN
  -- Validate event exists
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Get assignments to delete (if count specified, delete last N, otherwise all)
  IF p_assignment_count IS NOT NULL THEN
    SELECT array_agg(id) INTO assignments_to_delete
    FROM (
      SELECT id FROM assignments
      WHERE event_id = p_event_id
      ORDER BY draw_order DESC
      LIMIT p_assignment_count
    ) subq;
  ELSE
    SELECT array_agg(id) INTO assignments_to_delete
    FROM assignments
    WHERE event_id = p_event_id;
  END IF;

  -- If no assignments found, return early
  IF assignments_to_delete IS NULL OR array_length(assignments_to_delete, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'deleted_count', 0,
      'message', 'No assignments found to delete'
    );
  END IF;

  -- Create audit log for undo action
  INSERT INTO audit_logs (
    event_id,
    action,
    details,
    created_at
  ) VALUES (
    p_event_id,
    'draw_undone',
    jsonb_build_object(
      'deleted_assignments', array_length(assignments_to_delete, 1),
      'assignment_ids', array_to_json(assignments_to_delete),
      'timestamp', NOW(),
      'partial_undo', p_assignment_count IS NOT NULL
    ),
    NOW()
  ) RETURNING id INTO audit_log_id;

  -- Soft delete assignments (mark as deleted instead of hard delete for audit trail)
  UPDATE assignments
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(assignments_to_delete);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- If all assignments deleted, reset event status to lobby
  IF p_assignment_count IS NULL OR NOT EXISTS (
    SELECT 1 FROM assignments
    WHERE event_id = p_event_id
    AND deleted_at IS NULL
  ) THEN
    UPDATE events
    SET status = 'lobby', updated_at = NOW()
    WHERE id = p_event_id;
  END IF;

  -- Return result
  result := jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'audit_log_id', audit_log_id,
    'event_status_reset', p_assignment_count IS NULL
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Undo operation failed: %', SQLERRM;
END;
$$;

-- Add deleted_at column to assignments table for soft deletes
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance on deleted assignments
CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at
ON assignments (event_id, deleted_at)
WHERE deleted_at IS NULL;

-- Add audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_action
ON audit_logs (event_id, action, created_at DESC);