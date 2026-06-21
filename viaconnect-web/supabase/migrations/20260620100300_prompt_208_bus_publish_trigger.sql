-- Prompt 208 v2, Phase 3: append a knowledge_bus event when an atom or rule
-- transitions INTO published or retired. One function for both tables; domain is
-- read via to_jsonb(NEW)->>'domain' so it is safe for snp_protocol_rules (which
-- has no domain column). Append-only.

CREATE OR REPLACE FUNCTION public.kb_emit_bus_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev text;
BEGIN
  IF NEW.review_status = 'published' AND (OLD.review_status IS DISTINCT FROM 'published') THEN
    ev := CASE TG_TABLE_NAME WHEN 'knowledge_atoms' THEN 'atom_published' ELSE 'rule_published' END;
  ELSIF NEW.review_status = 'retired' AND (OLD.review_status IS DISTINCT FROM 'retired') THEN
    ev := CASE TG_TABLE_NAME WHEN 'knowledge_atoms' THEN 'atom_retired' ELSE 'rule_retired' END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.knowledge_bus (event_type, ref_table, ref_id, domain, payload)
  VALUES (
    ev,
    TG_TABLE_NAME,
    NEW.id,
    (to_jsonb(NEW) ->> 'domain'),
    jsonb_build_object('review_status', NEW.review_status)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kb_atoms_bus ON public.knowledge_atoms;
CREATE TRIGGER kb_atoms_bus
  AFTER UPDATE ON public.knowledge_atoms
  FOR EACH ROW EXECUTE FUNCTION public.kb_emit_bus_event();

DROP TRIGGER IF EXISTS kb_rules_bus ON public.snp_protocol_rules;
CREATE TRIGGER kb_rules_bus
  AFTER UPDATE ON public.snp_protocol_rules
  FOR EACH ROW EXECUTE FUNCTION public.kb_emit_bus_event();
