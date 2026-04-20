-- Atomically activates a license on a device.
-- Locks the license row before counting active devices so concurrent activation
-- requests cannot oversubscribe the same license.

CREATE OR REPLACE FUNCTION activate_license_device(
  p_license_key TEXT,
  p_device_fingerprint TEXT,
  p_default_max_devices INTEGER DEFAULT 5
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license RECORD;
  v_already_active BOOLEAN;
  v_active_count INTEGER;
  v_max_devices INTEGER;
BEGIN
  SELECT id, is_active, max_active_devices
    INTO v_license
    FROM licenses
   WHERE license_key = p_license_key
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid license key',
      'status', 404
    );
  END IF;

  IF NOT v_license.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'License has been revoked',
      'status', 403
    );
  END IF;

  v_max_devices := COALESCE(v_license.max_active_devices, p_default_max_devices);

  SELECT EXISTS (
    SELECT 1
      FROM activations
     WHERE license_id = v_license.id
       AND device_fingerprint = p_device_fingerprint
       AND deactivated_at IS NULL
  ) INTO v_already_active;

  SELECT COUNT(*)::INTEGER
    INTO v_active_count
    FROM activations
   WHERE license_id = v_license.id
     AND deactivated_at IS NULL;

  IF v_already_active THEN
    RETURN jsonb_build_object(
      'valid', true,
      'message', 'Device already activated',
      'active_devices', v_active_count,
      'max_devices', v_max_devices,
      'status', 200
    );
  END IF;

  IF v_active_count >= v_max_devices THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Device limit reached (%s). Deactivate a device to free a slot.', v_max_devices),
      'active_devices', v_active_count,
      'max_devices', v_max_devices,
      'status', 403
    );
  END IF;

  INSERT INTO activations (license_id, device_fingerprint)
  VALUES (v_license.id, p_device_fingerprint);

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Device activated',
    'active_devices', v_active_count + 1,
    'max_devices', v_max_devices,
    'status', 200
  );
END;
$$;
