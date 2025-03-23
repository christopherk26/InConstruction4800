// ./types/papaparse.d.ts
declare module 'papaparse' {
    export interface ParseResult<T = any> {
      data: T[];
      errors: ParseError[];
      meta: {
        delimiter: string;
        linebreak: string;
        aborted: boolean;
        fields: string[];
        truncated: boolean;
      };
    }
  
    export interface ParseError {
      type: string;
      code: string;
      message: string;
      row: number;
    }
  
    export interface ParseConfig<T = any> {
      delimiter?: string;
      newline?: string;
      quoteChar?: string;
      header?: boolean;
      dynamicTyping?: boolean | { [key: string]: boolean };
      preview?: number;
      encoding?: string;
      worker?: boolean;
      comments?: boolean | string;
      step?: (results: ParseResult<T>, parser: any) => void;
      complete?: (results: ParseResult<T>) => void;
      error?: (error: ParseError) => void;
      download?: boolean;
      skipEmptyLines?: boolean | 'greedy';
    }
  
    export function parse<T = any>(input: string | File, config?: ParseConfig<T>): ParseResult<T>;
  }