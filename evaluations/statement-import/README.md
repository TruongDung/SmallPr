# Statement Import Evaluation Cases

Each JSON file in `cases/` is one evaluation case.

```json
{
  "name": "Human readable case name",
  "inputText": "Extracted statement text for fast CI runs",
  "pdfPath": "./optional-real-statement.pdf",
  "expectedTransactions": [
    {
      "date": "2025-01-03",
      "amount": 84.23,
      "merchant": "WHOLE FOODS MARKET",
      "category": "Groceries",
      "duplicate": false
    }
  ]
}
```

Use `inputText` for deterministic CI fixtures. Use `pdfPath` when the test should exercise PDF text extraction too. Expected duplicate rows should set `"duplicate": true`; the harness considers them correct when the parser drops the extra row.
