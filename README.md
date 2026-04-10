# csv-dedup

Merge, deduplicate, and transform CSV files from the command line.

## Install

```bash
bun install
```

## Quick start

```bash
# Merge two CSVs on shared keys (outer join, first-wins)
bun run src/index.ts merge a.csv b.csv -k domain,name

# Inner join — only rows present in both files
bun run src/index.ts merge a.csv b.csv -k domain,name -m inner

# Inspect a CSV
bun run src/index.ts stats leads.csv

# Filter rows
bun run src/index.ts filter leads.csv -e "country=US AND email!=''"

# Format / normalize values
bun run src/index.ts format leads.csv -c name --title

# Select specific columns
bun run src/index.ts pick leads.csv -c name,email,domain

# Tag rows with a literal value
bun run src/index.ts append leads.csv --set source=linkedin

# Concatenate columns
bun run src/index.ts join contacts.csv --from first,last --glue " " --as full_name

# Split a column into two
bun run src/index.ts cleave contacts.csv -c email --on "@" --as user,domain

# Split into chunks (--take 1 for head)
bun run src/index.ts split leads.csv -n 1000
```

## Global options

| Flag | Description |
| --- | --- |
| `--dry-run` | Show what would happen without writing any files |

```bash
# Preview a merge without writing output
csv-dedup merge a.csv b.csv -k domain,name --dry-run
```

## Commands

### merge

Join multiple CSVs on key columns with first-wins conflict resolution — the first file's values are preserved, later files fill in blanks.

```bash
csv-dedup merge <file1.csv> [file2.csv ...] -k <keys> [options]
```

| Flag | Short | Default | Description |
| --- | --- | --- | --- |
| `--keys <cols>` | `-k` | — | Key column(s) for matching rows (required) |
| `--mode <mode>` | `-m` | `outer` | Join mode (see below) |
| `--columns <cols>` | `-c` | all | Columns to include in output |
| `--output <path>` | `-o` | `<first>.out.csv` | Output file path |

#### Modes

| Mode | Keeps |
| --- | --- |
| `outer` | All rows from all files (default) |
| `inner` | Only rows whose keys appear in every file |
| `left` | Only rows from the first file, enriched with data from others |
| `exclude` | Only first-file rows whose keys don't appear in any other file |
| `unique` | Only rows whose keys appear in exactly one file |
| `overlap` | Only rows whose keys appear in more than one file |

#### Example

Given `a.csv`:

```
domain,name,description
example.com,Acme,A widget company
test.org,Beta,A testing org
```

And `b.csv`:

```
domain,name,description,country
example.com,Acme,Outdated desc,US
newco.io,Gamma,A new company,UK
```

```bash
csv-dedup merge a.csv b.csv -k domain,name
```

Produces `a.out.csv`:

```
domain,name,description,country
example.com,Acme,A widget company,US
test.org,Beta,A testing org,
newco.io,Gamma,A new company,UK
```

Acme's description is preserved from `a.csv` (first-wins), while `country` is filled in from `b.csv`.

### stats

Print column fill rates, unique counts, and top values. Supports filtering and grouping.

```bash
csv-dedup stats <file.csv> [-e <expression>] [--group <col>]
```

| Flag | Short | Description |
| --- | --- | --- |
| `--expr <expr>` | `-e` | Filter rows before computing stats (repeatable, ANDed) |
| `--group <col>` | `-g` | Group by column and show stats per group |

### filter

Filter rows by expression, reference file, or both.

```bash
csv-dedup filter <file.csv> -e <expression> [-o output.csv]
csv-dedup filter <file.csv> --in <ref.csv> -c <cols> [-o output.csv]
```

| Flag | Short | Description |
| --- | --- | --- |
| `--expr <expr>` | `-e` | Filter expression (repeatable, ANDed) |
| `--in <file>` | | Reference CSV — keep rows whose key columns appear in this file |
| `--columns <cols>` | `-c` | Columns to match on (required with `--in`) |
| `--invert` | `-v` | Invert the filter — keep non-matching rows |
| `--output <path>` | `-o` | Output file path (default: `<file>.out.csv`) |

#### Expression syntax

| Syntax | Meaning |
| --- | --- |
| `col=val` | Exact match |
| `col!=val` | Not equal |
| `col=''` | Empty |
| `col!=''` | Non-empty |
| `col~sub` | Contains (case-insensitive) |
| `col:a,b,c` | In set |
| `col>n` | Greater than (numeric) |
| `col>=n` | Greater than or equal |
| `col<n` | Less than |
| `col<=n` | Less than or equal |
| `expr AND expr` | Conjunction |
| `expr OR expr` | Disjunction |
| `(a AND b) OR (c AND d)` | Grouped branches |

### format

Format and normalize column values. Always trims whitespace and collapses multiple spaces.

```bash
csv-dedup format <file.csv> [-c cols] [options] [-o output.csv]
```

| Flag | Description |
| --- | --- |
| `--upper` | UPPERCASE |
| `--lower` | lowercase |
| `--title` | Title Case |
| `--ascii` | Transliterate accents to ASCII, strip non-printable chars |
| `--domain` | Strip `http(s)://`, `www.`, and trailing slashes |
| `--truncate <n>` | Cap values at N characters |
| `--strip <chars>` | Remove specific characters |

### cleave

Split one column into two on a delimiter. Splits on the first occurrence; if the delimiter isn't found, the full value goes left and right stays empty.

```bash
csv-dedup cleave <file.csv> -c <column> --on <delim> [--as left,right] [-o output.csv]
```

| Flag | Short | Description |
| --- | --- | --- |
| `--column <col>` | `-c` | Column to split (required) |
| `--on <chars>` | `-d` | Delimiter to split on (required) |
| `--as <l,r>` | | Names for the two new columns (default: `col_1`, `col_2`) |
| `--last` | | Split on last occurrence instead of first |
| `--keep` | | Keep the original column alongside the new ones |

### pick

Select, reorder, or drop columns.

```bash
csv-dedup pick <file.csv> -c <cols> [-o output.csv]
csv-dedup pick <file.csv> --drop <cols> [-o output.csv]
```

| Flag | Short | Description |
| --- | --- | --- |
| `--columns <cols>` | `-c` | Columns to keep, in order |
| `--drop <cols>` | | Columns to remove |

### append

Add or overwrite a column with a literal value.

```bash
csv-dedup append <file.csv> --set <col=val> [-o output.csv]
```

| Flag | Description |
| --- | --- |
| `--set <col=val>` | Column name and value (repeatable) |

### join

Concatenate columns into a new column (inverse of cleave).

```bash
csv-dedup join <file.csv> --from <cols> --as <name> [--glue <str>] [-o output.csv]
```

| Flag | Description |
| --- | --- |
| `--from <cols>` | Source columns (required) |
| `--glue <str>` | Separator (default: empty) |
| `--as <name>` | New column name (required) |
| `--drop` | Remove source columns after joining |

### split

Split a CSV into fixed-size chunks, each with headers.

```bash
csv-dedup split <file.csv> -n <rows> [--take <n>]
```

| Flag | Short | Description |
| --- | --- | --- |
| `--rows <n>` | `-n` | Max rows per chunk (required) |
| `--take <n>` | | Only write the first N chunks (`--take 1` = head) |

## Testing

```bash
bun test
```

82 tests across unit tests (expression compiler, CSV helpers, strategies) and integration tests (every command exercised via subprocess).
