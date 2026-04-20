declare const __ESM_BROWSER__: boolean;
declare const __GLOBAL__: boolean;
declare const __TEST__: boolean;

declare module "hash-sum" {
  export default function hash(input: string): string;
}

declare module "merge-source-map" {
  export default function merge(
    oldMap: object | undefined,
    newMap: object | undefined,
  ): object | undefined;
}
