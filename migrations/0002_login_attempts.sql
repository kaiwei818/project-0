-- Records failed logins so we can slow down password guessing.
-- A row is added for each wrong password and deleted after a correct one.

CREATE TABLE login_attempts (
  ip           TEXT NOT NULL,
  attempted_at INTEGER NOT NULL   -- seconds since 1970 (a "Unix timestamp")
);

CREATE INDEX idx_login_attempts_ip ON login_attempts(ip, attempted_at);
