import { useEffect, useState } from "react";

/*
 * Type definition copied directly from Dexie docs:
 * https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T): T | undefined;
export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: any[] // ...like deps argument in useEffect() but defaults to empty array.
): T | undefined;
export function useLiveQuery<T, TDefault>(
  querier: () => Promise<T> | T,
  deps: any[], // ...like deps argument in useEffect() but defaults to empty array.
  defaultResult: TDefault // Default value returned while data is loading
): T | TDefault;
export function useLiveQuery<T, TDefault>(
  querier: () => Promise<T> | T,
  deps?: any[], // ...like deps argument in useEffect() but defaults to empty array.
  defaultResult?: TDefault // Default value returned while data is loading
): T | TDefault | undefined {
  const [result, setResult] = useState<T | undefined>();

  useEffect(() => {
    Promise.resolve(querier()).then((queryResult) => {
      setResult(queryResult);
    });
  }, deps ?? []);

  return result ?? defaultResult;
}
