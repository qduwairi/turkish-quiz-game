# Contract: CSV Import Format

**Feature**: 009-vocab-tool
**Consumers**: end-users uploading vocabulary files; `js/vocab/csvImport.js` parser
**Producers**: user's spreadsheet tool (Excel, Google Sheets, Numbers, Notion, Anki export, etc.)

## Encoding & Delimiter

- **Encoding**: UTF-8 (with or without BOM). Required — non-UTF-8 files will be rejected with the message "File must be saved as UTF-8."
- **Delimiter**: auto-detected from the first non-empty line by counting occurrences of each candidate. Supported candidates in precedence order on tie: `,` > `;` > `\t`.
- **Line terminator**: `\n` or `\r\n`. `\r` alone is tolerated.

## Header Row

Optional. A header is auto-detected when:

1. Every cell in row 0 is non-empty after trim, **and**
2. No later row is exactly equal to row 0 (cell-for-cell).

If row 0 is detected as a header, the first two header names are treated as `term` and `translation` regardless of the actual strings (the importer doesn't require specific header names). Any additional header names become keys under `extras` on each imported item.

If no header is detected, the first column is `term`, the second is `translation`, and any extras are keyed `col_3`, `col_4`, ….

## Columns

| Position | Name (if header present) | Required | Max length | Example |
|---|---|---|---|---|
| 1 | First header | yes | 200 | `merhaba` |
| 2 | Second header | yes | 200 | `hello` |
| 3+ | Any additional header | no | 200 each | `pos`=`greeting`, `example`=`Merhaba dünya` |

Rows where column 1 or column 2 is empty after trim are skipped with reason `missing_required_field`.

## Row-Level Rules

| Reason code | When | Behavior |
|---|---|---|
| `empty_row` | All cells empty/whitespace | Skipped silently |
| `missing_required_field` | `term` or `translation` empty after trim | Skipped, reported in summary |
| `duplicate_within_file` | Two rows in the same file with the same `trim+lowercase(term)` | First wins; subsequent skipped with this reason |
| `duplicate_in_deck` | Appending to an existing deck where `trim+lowercase(term)` already exists | Skipped with this reason |
| `too_long` | `term` or `translation` > 200 chars | Skipped with this reason |

## File-Level Rules

| Reason code | When | Behavior |
|---|---|---|
| `too_many_rows` | Data-row count (excluding header) > 2000 | Upload rejected up front; nothing imported |
| `encoding_not_utf8` | Decode fails | Upload rejected up front |
| `unrecognized_delimiter` | No `,` / `;` / `\t` in first non-empty line | Upload rejected up front with message "Could not detect delimiter; use comma, semicolon, or tab" |

## Quoting

RFC-4180 style. Fields containing the delimiter, a newline, or a double-quote must be wrapped in double quotes; double-quotes within a quoted field are escaped by doubling.

Example (comma delimiter):

```csv
term,translation,example
"kitap","book","Bu bir ""iyi"" kitap."
sabah,morning,
```

## Post-Import Feedback

The UI displays, after every upload:

- Total rows read
- Count accepted
- Count skipped, grouped by reason code (with representative row numbers)
- Final deck name and item count
- CTA: "Start a quiz" / "Go to Review"

## Round-Trip Export (FR-015)

Export emits a UTF-8 comma-delimited CSV with a header row: `term,translation,[extras keys in original order]`. Turkish characters are written without transliteration, preserving SC-006.
