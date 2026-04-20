declare module "hash-sum" {
  export default function hashSum(value: unknown): string;
}

declare module "merge-source-map" {
  export default function mergeSourceMap(
    oldMap: object | undefined,
    newMap: object | undefined,
  ): object | undefined;
}
