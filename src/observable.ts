import { Writeable } from "./writeable";
import { Readable } from "./readable";
import { use_ } from "./use_";

export class Observable<T> extends Writeable<T> {

  constructor(initialValue: T){
    let v = () => initialValue;
    super(() => v(), value => {
      this.value = value;
      Readable.update(this);
    });
    this.value = initialValue;
    v = () => this.value;
  }

}

export function observable<T>(value: T): Observable<T>
export function observable<T>(): Observable<T | null>
export function observable<T>(value: T | null = null){
  return new Observable(value);
}

export const obs = observable;
export const o = obs;

export const useObservable = use_(observable);
export const useObs = useObservable;
export const useO = useObs;

export type O<T> = Observable<T>;
export type Obs<T> = Observable<T>;
