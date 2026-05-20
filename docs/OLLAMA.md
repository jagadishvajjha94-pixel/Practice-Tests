# Ollama integration (syllabus MCQ generation)

The exam builder’s **Generate with AI** route (`/api/exam-builder/ai-generate`) uses the shared AI stack (`generateWithAi`). When Ollama is configured, the server calls its **OpenAI-compatible** API:

`POST {base}/v1/chat/completions`

## 1. Install and run Ollama

- Install from [ollama.com](https://ollama.com).
- Pull a model (example):

```bash
ollama pull llama3.2
```

- Ensure the daemon is listening (default `http://127.0.0.1:11434`).

## 2. Configure this app (`.env.local`)

Set **one** of these base URLs (no path after the port — the app adds `/v1/chat/completions`):

```env
LOCAL_LLM_URL=http://127.0.0.1:11434
```

Or:

```env
OLLAMA_HOST=127.0.0.1
```

Or:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Model:

```env
LOCAL_LLM_MODEL=llama3.2
# or
OLLAMA_MODEL=llama3.2
```

Optional temperature (0–2):

```env
LOCAL_LLM_TEMPERATURE=0.65
```

If **both** Ollama and Hugging Face are configured and `AI_PROVIDER` is **unset**, **Ollama is preferred** (good for local development).

To force a specific backend:

```env
AI_PROVIDER=local
# or synonym
AI_PROVIDER=ollama
```

## 3. Faculty / admin workflow

1. Open **Faculty → Create exam** or **Admin → Exam builder**.
2. Choose test type, **select syllabus topics** (these names are embedded in the MCQ prompt).
3. Click **Generate with AI**.

The model must return a **JSON array** of MCQs; the app parses it the same way as Hugging Face responses.

## 4. Docker / remote hosts

- Next.js runs **server-side** `fetch` to Ollama. If the app runs in Docker and Ollama on the host, try `http://host.docker.internal:11434` as `LOCAL_LLM_URL`.
- Hosted deployments (e.g. Vercel) cannot reach `localhost` on your laptop. Run Ollama on a reachable host or use HF / OpenAI instead.

## 5. Troubleshooting

- **404 / connection refused**: wrong host/port; confirm `curl http://127.0.0.1:11434/api/tags`.
- **`Ollama error` + model**: run `ollama pull <MODEL>` matching `LOCAL_LLM_MODEL`.
- **`AI_MOCK` / demo questions**: unset keys triggers mock MCQs in development; configure Ollama or set `AI_MOCK=0` to fail fast instead.
