-- Rate limiting table and atomic check function
-- Used by moji-license Edge Function to prevent brute-force and abuse

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, endpoint)
);

-- Returns TRUE if the request is allowed, FALSE if rate limit exceeded.
-- Atomically increments the counter or resets the window.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT request_count, window_start
    INTO v_count, v_window_start
    FROM rate_limits
   WHERE key = p_key AND endpoint = p_endpoint
     FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, endpoint, request_count, window_start)
    VALUES (p_key, p_endpoint, 1, NOW());
    RETURN TRUE;
  END IF;

  -- Window expired — reset
  IF v_window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
    UPDATE rate_limits
       SET request_count = 1, window_start = NOW()
     WHERE key = p_key AND endpoint = p_endpoint;
    RETURN TRUE;
  END IF;

  -- Over limit
  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment
  UPDATE rate_limits
     SET request_count = request_count + 1
   WHERE key = p_key AND endpoint = p_endpoint;
  RETURN TRUE;
END;
$$;
