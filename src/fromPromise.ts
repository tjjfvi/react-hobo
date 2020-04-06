import { Readable } from "./readable";
import { use_ } from "./use_";

class FromPromise<T, I=null> extends Readable<I | T> {

  prom: Promise<T>;

  constructor(prom: Promise<T>, initialValue: I){
    let fv = false;
    super(() => fv ? this.value : initialValue);
    fv = true;
    this.prom = prom;
    prom.then(v => {
      this.value = v;
      Readable.update(this);
    });
  }

}

export function fromPromise<T>(prom: Promise<T>): FromPromise<T>
export function fromPromise<T, I>(prom: Promise<T>, initialValue: I): FromPromise<T, I>
export function fromPromise<T, I>(prom: () => Promise<T>): FromPromise<T>
export function fromPromise<T, I>(prom: () => Promise<T>, initialValue: I): FromPromise<T, I>
export function fromPromise<T, I>(prom: Promise<T> | (() => Promise<T>), initialValue: I | null = null){
  return new FromPromise(typeof prom === "function" ? prom() : prom, initialValue);
}

export const fromProm = fromPromise;
export const fp = fromProm;

export const useFromPromise = use_(fromPromise);
export const useFromProm = useFromPromise;
export const useFp = useFromProm;

export type FP<T> = FromPromise<T>;
export type FromProm<T> = FromPromise<T>;
