-- Migration: Draw Functions
-- Description: Server-side functions for fair horse assignment draws

-- Function to perform a single random assignment
CREATE OR REPLACE FUNCTION perform_random_assignment(event_uuid UUID)
RETURNS TABLE(
  assignment_id UUID,
  participant_name TEXT,
  horse_number INTEGER,
  horse_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  random_participant_id UUID;
  random_horse_id UUID;
  new_assignment_id UUID;
  participant_name TEXT;
  horse_num INTEGER;
  horse_name TEXT;
BEGIN
  -- Get a random unassigned participant
  SELECT pe.id INTO random_participant_id
  FROM patron_entries pe
  WHERE pe.event_id = event_uuid
    AND NOT EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.patron_entry_id = pe.id
    )
  ORDER BY RANDOM()
  LIMIT 1;

  -- If no unassigned participants, return empty
  IF random_participant_id IS NULL THEN
    RETURN;
  END IF;

  -- Get a random available horse
  SELECT eh.id INTO random_horse_id
  FROM event_horses eh
  WHERE eh.event_id = event_uuid
    AND eh.is_scratched = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.event_horse_id = eh.id
    )
  ORDER BY RANDOM()
  LIMIT 1;

  -- If no available horses, return empty
  IF random_horse_id IS NULL THEN
    RETURN;
  END IF;

  -- Create the assignment
  INSERT INTO assignments (event_id, patron_entry_id, event_horse_id)
  VALUES (event_uuid, random_participant_id, random_horse_id)
  RETURNING id INTO new_assignment_id;

  -- Get participant and horse details for return
  SELECT pe.participant_name, eh.number, eh.name
  INTO participant_name, horse_num, horse_name
  FROM patron_entries pe, event_horses eh
  WHERE pe.id = random_participant_id
    AND eh.id = random_horse_id;

  -- Return the assignment details
  RETURN QUERY SELECT
    new_assignment_id,
    participant_name,
    horse_num,
    horse_name;
END;
$$;

-- Function to perform full draw (assign all remaining participants)
CREATE OR REPLACE FUNCTION perform_full_draw(event_uuid UUID)
RETURNS TABLE(
  assignments_made INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unassigned_participants UUID[];
  available_horses UUID[];
  participant_id UUID;
  horse_id UUID;
  assignment_count INTEGER := 0;
  max_assignments INTEGER;
BEGIN
  -- Get all unassigned participants
  SELECT ARRAY(
    SELECT pe.id
    FROM patron_entries pe
    WHERE pe.event_id = event_uuid
      AND NOT EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.patron_entry_id = pe.id
      )
    ORDER BY pe.created_at
  ) INTO unassigned_participants;

  -- Get all available horses
  SELECT ARRAY(
    SELECT eh.id
    FROM event_horses eh
    WHERE eh.event_id = event_uuid
      AND eh.is_scratched = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.event_horse_id = eh.id
      )
    ORDER BY eh.number
  ) INTO available_horses;

  -- Determine maximum possible assignments
  max_assignments := LEAST(
    array_length(unassigned_participants, 1),
    array_length(available_horses, 1)
  );

  -- If no assignments possible, return
  IF max_assignments IS NULL OR max_assignments = 0 THEN
    RETURN QUERY SELECT 0, 'No assignments possible'::TEXT;
    RETURN;
  END IF;

  -- Shuffle both arrays for randomness
  unassigned_participants := (
    SELECT ARRAY(
      SELECT unnest(unassigned_participants)
      ORDER BY RANDOM()
    )
  );

  available_horses := (
    SELECT ARRAY(
      SELECT unnest(available_horses)
      ORDER BY RANDOM()
    )
  );

  -- Create assignments
  FOR i IN 1..max_assignments LOOP
    participant_id := unassigned_participants[i];
    horse_id := available_horses[i];

    INSERT INTO assignments (event_id, patron_entry_id, event_horse_id)
    VALUES (event_uuid, participant_id, horse_id);

    assignment_count := assignment_count + 1;
  END LOOP;

  RETURN QUERY SELECT
    assignment_count,
    format('Successfully assigned %s horses', assignment_count)::TEXT;
END;
$$;

-- Function to get draw statistics
CREATE OR REPLACE FUNCTION get_draw_stats(event_uuid UUID)
RETURNS TABLE(
  total_participants INTEGER,
  total_horses INTEGER,
  available_horses INTEGER,
  unassigned_participants INTEGER,
  total_assignments INTEGER,
  draw_completion_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM patron_entries WHERE event_id = event_uuid),
    (SELECT COUNT(*)::INTEGER FROM event_horses WHERE event_id = event_uuid),
    (SELECT COUNT(*)::INTEGER FROM event_horses eh
     WHERE eh.event_id = event_uuid
       AND eh.is_scratched = FALSE
       AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.event_horse_id = eh.id)),
    (SELECT COUNT(*)::INTEGER FROM patron_entries pe
     WHERE pe.event_id = event_uuid
       AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.patron_entry_id = pe.id)),
    (SELECT COUNT(*)::INTEGER FROM assignments WHERE event_id = event_uuid),
    CASE
      WHEN (SELECT COUNT(*) FROM patron_entries WHERE event_id = event_uuid) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM assignments WHERE event_id = event_uuid)::NUMERIC * 100.0 /
        (SELECT COUNT(*) FROM patron_entries WHERE event_id = event_uuid)::NUMERIC,
        2
      )
    END;
END;
$$;

-- Function to validate assignment integrity
CREATE OR REPLACE FUNCTION validate_assignment_integrity(event_uuid UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  duplicate_participants INTEGER,
  duplicate_horses INTEGER,
  scratched_horse_assignments INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dup_participants INTEGER;
  dup_horses INTEGER;
  scratched_assignments INTEGER;
  validation_message TEXT;
  is_integrity_valid BOOLEAN;
BEGIN
  -- Check for duplicate participant assignments
  SELECT COUNT(*) INTO dup_participants
  FROM (
    SELECT patron_entry_id, COUNT(*)
    FROM assignments
    WHERE event_id = event_uuid
    GROUP BY patron_entry_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check for duplicate horse assignments
  SELECT COUNT(*) INTO dup_horses
  FROM (
    SELECT event_horse_id, COUNT(*)
    FROM assignments
    WHERE event_id = event_uuid
    GROUP BY event_horse_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check for assignments to scratched horses
  SELECT COUNT(*) INTO scratched_assignments
  FROM assignments a
  JOIN event_horses eh ON a.event_horse_id = eh.id
  WHERE a.event_id = event_uuid
    AND eh.is_scratched = TRUE;

  -- Determine if valid
  is_integrity_valid := (dup_participants = 0 AND dup_horses = 0 AND scratched_assignments = 0);

  -- Generate message
  IF is_integrity_valid THEN
    validation_message := 'All assignments are valid';
  ELSE
    validation_message := format(
      'Issues found: %s duplicate participants, %s duplicate horses, %s scratched horse assignments',
      dup_participants, dup_horses, scratched_assignments
    );
  END IF;

  RETURN QUERY SELECT
    is_integrity_valid,
    dup_participants,
    dup_horses,
    scratched_assignments,
    validation_message;
END;
$$;

-- Function to reassign a specific participant to a different horse
CREATE OR REPLACE FUNCTION reassign_participant_horse(
  assignment_uuid UUID,
  new_horse_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  old_horse_name TEXT,
  new_horse_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignment_record RECORD;
  old_horse_name TEXT;
  new_horse_name TEXT;
  is_horse_available BOOLEAN;
BEGIN
  -- Get current assignment details
  SELECT a.*, eh.name as horse_name
  INTO assignment_record
  FROM assignments a
  JOIN event_horses eh ON a.event_horse_id = eh.id
  WHERE a.id = assignment_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Assignment not found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  old_horse_name := assignment_record.horse_name;

  -- Check if new horse is available
  SELECT COUNT(*) = 0 INTO is_horse_available
  FROM assignments a
  WHERE a.event_horse_id = new_horse_id
    AND a.id != assignment_uuid;

  IF NOT is_horse_available THEN
    RETURN QUERY SELECT FALSE, 'Horse is already assigned to another participant'::TEXT, old_horse_name, NULL::TEXT;
    RETURN;
  END IF;

  -- Get new horse name
  SELECT name INTO new_horse_name
  FROM event_horses
  WHERE id = new_horse_id;

  -- Update the assignment
  UPDATE assignments
  SET event_horse_id = new_horse_id,
      updated_at = NOW()
  WHERE id = assignment_uuid;

  RETURN QUERY SELECT TRUE, 'Horse reassigned successfully'::TEXT, old_horse_name, new_horse_name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION perform_random_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_full_draw(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_draw_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_assignment_integrity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reassign_participant_horse(UUID, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION perform_random_assignment(UUID) IS 'Performs a single random assignment of an unassigned participant to an available horse';
COMMENT ON FUNCTION perform_full_draw(UUID) IS 'Assigns all remaining unassigned participants to available horses randomly';
COMMENT ON FUNCTION get_draw_stats(UUID) IS 'Returns comprehensive statistics about the draw progress';
COMMENT ON FUNCTION validate_assignment_integrity(UUID) IS 'Validates that all assignments are correct and consistent';
COMMENT ON FUNCTION reassign_participant_horse(UUID, UUID) IS 'Reassigns a participant to a different available horse';