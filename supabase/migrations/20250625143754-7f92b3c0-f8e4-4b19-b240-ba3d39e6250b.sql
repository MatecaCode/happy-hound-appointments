
-- Create the cron job that runs at midnight São Paulo time (3:00 AM UTC) without trying to unschedule first
SELECT cron.schedule(
  'daily-roll-availability-midnight-sp',
  '0 3 * * *', -- Run at 3:00 AM UTC (midnight São Paulo time)
  $$
  SELECT
    net.http_post(
        url:='https://ieotixprkfglummoobkb.supabase.co/functions/v1/roll-availability',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllb3RpeHBya2ZnbHVtbW9vYmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNTE2NSwiZXhwIjoyMDY0OTAxMTY1fQ.wWdlvHn5uSj_Wq6Vf3xT8cQ8FQcYKNzGvN7lEr9sSH4"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-roll-availability-midnight-sp';
