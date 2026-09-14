-- Database-level protection against concurrent registrations with email case variants.
CREATE UNIQUE INDEX idx_users_email_case_insensitive ON users (lower(email));
