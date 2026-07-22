-- Profipaws: ejemplo de función + trigger PL/pgSQL
-- Actualiza pets.updated_at cuando cambian vacunas o registros médicos.

CREATE OR REPLACE FUNCTION profipaws_touch_pet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pets
  SET updated_at = NOW()
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vaccines_touch_pet ON vaccines;
CREATE TRIGGER trg_vaccines_touch_pet
AFTER INSERT OR UPDATE ON vaccines
FOR EACH ROW
EXECUTE FUNCTION profipaws_touch_pet_updated_at();

DROP TRIGGER IF EXISTS trg_records_touch_pet ON medical_records;
CREATE TRIGGER trg_records_touch_pet
AFTER INSERT OR UPDATE ON medical_records
FOR EACH ROW
EXECUTE FUNCTION profipaws_touch_pet_updated_at();
