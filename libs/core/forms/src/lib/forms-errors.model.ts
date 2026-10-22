// The API's errors: {"body": ["…"]} for messages written for the reader, or
// a field name with its problems, e.g. {"email": ["is invalid"]}.
export interface Errors {
  [key: string]: string | string[];
}
