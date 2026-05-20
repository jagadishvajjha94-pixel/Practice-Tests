-- Large demo question bank for cohort testing (~500 learners): **500 unique MCQs per syllabus tag**.
-- Each stem includes `ref:slug|item` plus distinct (p,q) from `hashtext(slug|item)` so texts do not collide.
--
-- Tagged with JSON string `seed-demo-v1`; delete & re-insert on re-run.
-- Size: (# of rows in question_tags × 500) INSERTs (~15k–18k typical). Schedule migration accordingly.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  rt RECORD;
  idx int;
  qid uuid;
  qt text;
  oa text;
  ob text;
  oc text;
  od text;
  correct_letter text;
  x int;
  y int;
  z int;
  idx_mod int;
  h1 int;
  h2 int;
BEGIN
  DELETE FROM public.questions
  WHERE COALESCE(tags, '[]'::jsonb) @> '["seed-demo-v1"]'::jsonb;

  FOR rt IN
    SELECT id, slug, name FROM public.question_tags ORDER BY slug
  LOOP
    FOR idx IN 1..500 LOOP
      h1 := abs(hashtext(rt.slug || '|' || idx::text));
      h2 := abs(hashtext((idx * 7919)::text || '|' || rt.slug || '|' || (idx % 997)::text));
      IF h1 <= 0 THEN h1 := 1 + idx; END IF;
      IF h2 <= 0 THEN h2 := 2 + idx; END IF;

      x := 5 + (h1 % 11999);
      y := 5 + (h2 % 11899);
      z := x + y;

      idx_mod := (idx + length(rt.slug) + (h1 % 97)) % 4;
      correct_letter := (ARRAY['A', 'B', 'C', 'D'])[idx_mod + 1];

      qt := format(
        '[%s · item %s/500 · ref:%s|%s] Practice MCQ (seed bank): Compute p + q when p = %s and q = %s.',
        rt.name,
        idx,
        rt.slug,
        idx,
        x,
        y
      );

      IF correct_letter = 'A' THEN
        oa := z::text;
        ob := (z + (1 + ((h2 + 11) % 9)))::text;
        oc := (z + (2 + ((h2 + 19) % 11)))::text;
        od := (z + (14 + ((h1 + idx) % 17)))::text;
      ELSIF correct_letter = 'B' THEN
        oa := (z + (3 + ((h2 + 3) % 8)))::text;
        ob := z::text;
        oc := (z + (11 + ((h1 + idx) % 13)))::text;
        od := (z + (4 + ((idx + h2) % 12)))::text;
      ELSIF correct_letter = 'C' THEN
        oa := (z + (5 + ((h1) % 7)))::text;
        ob := (z + (6 + ((h2) % 10)))::text;
        oc := z::text;
        od := (z + (8 + ((idx) % 9)))::text;
      ELSE
        oa := (z + (17 + ((h2 + idx) % 15)))::text;
        ob := (z + (9 + ((h1 + 5) % 11)))::text;
        oc := (z + (21 + ((h2 + 31) % 14)))::text;
        od := z::text;
      END IF;

      INSERT INTO public.questions (
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        explanation,
        type,
        question_type,
        difficulty,
        tags
      ) VALUES (
        qt,
        oa,
        ob,
        oc,
        od,
        correct_letter,
        format(
          'SEED_DEMO_V1 · uniq ref %s|%s · large cohort bank · item %s of 500 per topic',
          rt.slug,
          idx,
          idx
        ),
        'MCQ',
        'MCQ',
        'easy',
        jsonb_build_array(rt.slug, rt.id::text, 'seed-demo-v1')
      )
      RETURNING id INTO qid;

      INSERT INTO public.question_tag_links (question_id, tag_id)
      VALUES (qid, rt.id);
    END LOOP;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
