export interface Cmd {
  name: string;
  run(argv: string[]): Promise<void>;
}

export interface Sheet {
  headers: string[];
  rows: string[][];
}

export interface JoinArgs {
  files: string[];
  keys: string[];
  cols: string[] | null;
  dest: string;
  min?: number;
}

export interface Strategy {
  name: string;
  filter(order: string[], hits: Map<string, Set<number>>, count: number, min?: number): string[];
}
