# Contract: Explain Answer API

**Endpoint**: `POST /api/explain-answer`
**Feature**: 005-fix-why-button-cors

## Request

**Method**: POST
**Content-Type**: application/json
**Origin**: Restricted to production domain and localhost

### Body

```json
{
  "question": "What is the Turkish word for 'hello'?",
  "options": ["Merhaba", "Güle güle", "Teşekkürler", "Evet"],
  "correct": 0
}
```

### Validation Rules

- `question`: non-empty string, max 500 characters
- `options`: array of exactly 4 non-empty strings, each max 200 characters
- `correct`: integer 0-3 inclusive

## Response

### Success (200)

```json
{
  "explanation": "'Merhaba' is the standard Turkish greeting meaning 'hello', derived from Arabic 'marhaba'.",
  "hasWarning": false
}
```

### Success with Warning (200)

```json
{
  "explanation": "NOTE: The marked answer may be incorrect. 'Güle güle' means 'goodbye' (said by the person staying), not 'hello'. The correct answer should be 'Merhaba'.",
  "hasWarning": true
}
```

### Validation Error (400)

```json
{
  "error": "Invalid request: question is required (max 500 chars)"
}
```

### Server Error (500)

```json
{
  "error": "Failed to generate explanation. Please try again."
}
```

## CORS

- **Preflight (OPTIONS)**: Returns 200 with CORS headers
- **Access-Control-Allow-Origin**: Production domain or localhost origin (not wildcard)
- **Access-Control-Allow-Methods**: POST, OPTIONS
- **Access-Control-Allow-Headers**: Content-Type

## Migration Notes

### Previous contract (Firebase Callable)

The Firebase `httpsCallable` SDK wrapped requests/responses automatically:
- Request: SDK sent `{ data: { question, options, correct } }` internally
- Response: SDK returned `{ data: { explanation, hasWarning } }` and client accessed `result.data`

### New contract (plain HTTP)

- Request: Client sends JSON body directly via `fetch()`
- Response: Client receives JSON directly, no `.data` wrapper needed
