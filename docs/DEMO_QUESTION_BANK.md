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

```bash
cd apps/prepindia-web
supabase db push
```

Or paste the migration into the Supabase SQL editor (**may take tens of seconds**).

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

## Note

Stems are **deterministic synthetic arithmetic** for load testing, not production assessment copy. Replace with uploads, AI, or real item writing for live exams.
