declare module 'lets-get-meta' {
  export type GetMeta = (html: string) => Record<string, string>;
  const getMeta: GetMeta;
  export default getMeta;
}
