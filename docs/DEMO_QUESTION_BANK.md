# Demo question bank (automated seed)

Migration **`019_demo_question_bank_seed.sql`** builds a **large, non-colliding demo bank** so many students can use **Draw from bank** without seeing the **same seeded row** between topics:

- **500 MCQs per row in `question_tags`** (~15k–18k rows in total depending on tag count).
- Every stem is **unique**: it embeds `ref:{slug}|{item}` and hash-derived values `p` and `q` from `hashtext(slug|item)`, so **`question_text` does not repeat** across the seeded set.

## Behaviour / non-repetition

- **Within this seed**, each `(slug, item)` pair appears once — tags + link row tie the question to **one syllabus topic**.
- **Exam-slot behaviour** (`exam_builder_draws`) still excludes questions **already drawn for the same slot + test type** until you rotate slots — with 500/tag the pool survives many faculty draws without repeating quickly.
- This does **not** guarantee 500 simultaneous students each get pairwise disjoint exams unless draws are partitioned (that depends on slots, topics selected, and `questions_per_topic`). The bank is sized so collisions are unlikely for typical campus loads.

Each seed row carries:

- `tags` containing topic **slug**, **tag UUID**, and **`seed-demo-v1`**.
- `explanation` starting with **`SEED_DEMO_V1`**.

Deleting rows with **`seed-demo-v1`** cleanly removes **all** seeded demo MCQs before re-inserting.

## Apply (first time)

**Order matters.** If you see `Could not find the table 'public.questions' in the schema cache`, run **`020_ensure_questions_table.sql` first**, then **`019_demo_question_bank_seed.sql`** (or use **Load topic question bank** in the app).

If migration 020 fails with **uuid and bigint incompatible** on `question_tag_links`, your `questions.id` is legacy **BIGINT**. Re-run the **updated** `020` file (it auto-detects id type). If a broken `question_tag_links` table was created, 020 drops and recreates it when types mismatch.

```bash
cd apps/prepindia-web
supabase db push
```

Or in the **Supabase SQL editor** (Dashboard → SQL):

1. Paste and run **`supabase/migrations/020_ensure_questions_table.sql`**
2. Paste and run **`supabase/migrations/019_demo_question_bank_seed.sql`**

Wait ~30 seconds after step 1 so the API schema cache reloads (migration ends with `NOTIFY pgrst, 'reload schema'`).

## Already ran an older seed (`12` items per topic)?

The migration runner will **not** re-execute `019` automatically. Either:

```sql
DELETE FROM public.questions
WHERE COALESCE(tags, '[]'::jsonb) @> '["seed-demo-v1"]'::jsonb;
```

…then paste the **current** contents of `019_demo_question_bank_seed.sql` (`DO $$ ... $$` block + `NOTIFY`), **or** use `supabase db reset` in a dev project.

## Remove demo data only

```sql
DELETE FROM public.questions
WHERE COALESCE(tags, '[]'::jsonb) @> '["seed-demo-v1"]'::jsonb;
```

## Troubleshooting: “No unused questions … slot-1”

1. **Nothing in the bank for that topic** — Apply seed migration `019_demo_question_bank_seed.sql` or upload MCQs tagged with that syllabus slug.

2. **Every question for that topic was already drawn in this slot** — Draws are tracked in `exam_builder_draws` for **`test_type` + `slot_key`** (last **250** papers are considered). Use **slot-2**, or clear draws for that combo, e.g.:

   ```sql
   DELETE FROM exam_builder_draws WHERE slot_key = 'slot-1' AND test_type = 'aptitude';
   ```

The exam builder now loads tag pools with **paginated** queries (no more “only first ~1000 rows” from an unfiltered `questions` scan).

## Note

Stems are **deterministic synthetic arithmetic** for load testing, not production assessment copy. Replace with uploads, AI, or real item writing for live exams.
