import Papa from "papaparse";

export interface Sheet {
  headers: string[];
  rows: string[][];
}

export async function read(path: string): Promise<Sheet> {
  const raw = await Bun.file(path).text();
  const parsed = Papa.parse<string[]>(raw, {
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("CSV parse errors:", parsed.errors);
    process.exit(1);
  }

  const [headers, ...rows] = parsed.data;
  if (!headers) {
    console.error("Error: CSV must have a header row");
    process.exit(1);
  }

  return { headers, rows };
}

export async function write(path: string, headers: string[], rows: string[][]) {
  const csv = Papa.unparse({ fields: headers, data: rows });
  await Bun.write(path, csv);
}
