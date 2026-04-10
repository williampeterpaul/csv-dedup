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

# Split a column into two
bun run src/index.ts cleave contacts.csv -c email --on "@" --as user,domain

# Split into chunks
bun run src/index.ts split leads.csv -n 1000
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

Print column fill rates, unique counts, and top values.

```bash
csv-dedup stats <file.csv>
```

### filter

Filter rows by expression. Expressions are ANDed together.

```bash
csv-dedup filter <file.csv> -e <expression> [-e <expression> ...] [-o output.csv]
```

#### Expression syntax

| Syntax | Meaning |
| --- | --- |
| `col=val` | Exact match |
| `col!=val` | Not equal |
| `col=''` | Empty |
| `col!=''` | Non-empty |
| `col~sub` | Contains (case-insensitive) |
| `col:a,b,c` | In set |
| `expr AND expr` | Conjunction |

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

### split

Split a CSV into fixed-size chunks, each with headers.

```bash
csv-dedup split <file.csv> -n <rows>
```

## Testing

```bash
bun test
```

60 tests across unit tests (expression compiler, CSV helpers, strategies) and integration tests (every command exercised via subprocess).
