# csv-dedup

Merge, deduplicate, and combine CSV files from the command line.

## Install

```bash
bun install
```

## Commands

### merge

Merge multiple CSVs into one, joining rows on identifying key columns. Uses a full outer join with first-wins conflict resolution — the first file's values are preserved, and later files only fill in blanks.

```bash
bun run src/index.ts merge a.csv b.csv -k domain,name
```

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

Running:

```bash
bun run src/index.ts merge a.csv b.csv -k domain,name
```

Produces `a.out.csv`:

```
domain,name,description,country
example.com,Acme,A widget company,US
test.org,Beta,A testing org,
newco.io,Gamma,A new company,UK
```

Note that `Acme`'s description is preserved from `a.csv` (first-wins), while `country` is filled in from `b.csv`.

#### Options

| Flag | Short | Default | Description |
| ------------------- | ----- | -------------------- | ---------------------------------------------------------- |
| `--keys <cols>` | `-k` | — | Comma-separated key column(s) for matching rows (required) |
| `--columns <cols>` | `-c` | all | Comma-separated columns to include in output |
| `--output <path>` | `-o` | `<first-file>.out.csv` | Output file path |
| `--help` | `-h` | | Show help |

#### Column selection

By default, the output includes the union of all columns from all input files. Use `--columns` to restrict:

```bash
bun run src/index.ts merge a.csv b.csv -k domain,name -c domain,name,country
```

Key columns are always included in the output even if not listed in `--columns`.
