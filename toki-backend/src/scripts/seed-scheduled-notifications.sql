-- Seed initial scheduled notifications
-- This script inserts the 4 initial scheduled notifications

-- Monday 12:00 - "New Toki drops just landed. Check out the map now."
INSERT INTO scheduled_notifications (title, message, day_of_week, hour, minute, enabled, created_at, updated_at)
VALUES (
  'New Toki Drops',
  'New Toki drops just landed. Check out the map now.',
  1, -- Monday
  12, -- 12:00
  0, -- :00
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Wednesday 16:00 - "Where will your friends be this weekend? Find the scenes now."
INSERT INTO scheduled_notifications (title, message, day_of_week, hour, minute, enabled, created_at, updated_at)
VALUES (
  'Weekend Plans',
  'Where will your friends be this weekend? Find the scenes now.',
  3, -- Wednesday
  16, -- 16:00
  0, -- :00
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Thursday 16:00 - "The city is moving. 10+ new Toki drops are active now."
INSERT INTO scheduled_notifications (title, message, day_of_week, hour, minute, enabled, created_at, updated_at)
VALUES (
  'City Activity',
  'The city is moving. 10+ new Toki drops are active now.',
  4, -- Thursday
  16, -- 16:00
  0, -- :00
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Saturday 12:00 - "Party mode or recharge? Find your Toki on the map."
INSERT INTO scheduled_notifications (title, message, day_of_week, hour, minute, enabled, created_at, updated_at)
VALUES (
  'Weekend Vibes',
  'Party mode or recharge? Find your Toki on the map.',
  6, -- Saturday
  12, -- 12:00
  0, -- :00
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

