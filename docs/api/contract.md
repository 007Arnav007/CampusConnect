# API Contract Baseline

All application APIs are versioned under `/api/v1`.

## Response envelope

Successful responses should use:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id"
  }
}
```

Errors should use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fieldErrors": {},
    "requestId": "request-id"
  }
}
```

The first implementation phase establishes service boundaries. Feature endpoints should be added only after their authorization and persistence rules are defined.
