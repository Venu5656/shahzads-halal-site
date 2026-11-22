-- The consent ledger is append-only, and saying so in a comment does not make
-- it so. This makes the database refuse the thing the comment forbids.
--
-- UPDATE is blocked outright: rewriting a consent row is rewriting the
-- evidence, and there is no legitimate reason to do it. A correction is a new
-- row, which is what the ledger is for.
--
-- DELETE is NOT blocked. A subscriber who asks to be erased has to be
-- erasable, and their rows go with them by cascade. That is one deliberate act
-- by a person who meant it, not the silent drift an UPDATE allows.
CREATE OR REPLACE FUNCTION consent_event_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ConsentEvent is append-only: write a new row instead of changing %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_event_no_update
  BEFORE UPDATE ON "ConsentEvent"
  FOR EACH ROW EXECUTE FUNCTION consent_event_is_append_only();
