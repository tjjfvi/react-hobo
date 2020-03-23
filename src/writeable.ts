
import { Readable } from "./readable";
import { use_ } from "./use_";

export interface Writeable<T> {
  (val: T): T;
}

type ObsW<T> = {
  readonly [K in keyof T]: Writeable<T[K]>;
}

export class Writeable<T> extends Readable<T> {

  private setFunc: (value: T) => unknown;

  constructor(get: (() => T), set: ((value: T) => unknown)){
    super(get);
    this.setFunc = set;
  }

  set(value: T){
    if(!this.alive)
      throw new Error("called .set on dead writeable");
    this.setFunc(value);
    return value;
  }

  __f(...x: [] | [T]): T{
    if(x.length)
      return this.set(x[0]);
    return this.get();
  }

  private _obsW: ObsW<T>;

  get obs(){
    return this._obsW = this._obsW || new Proxy({}, {
      // @ts-ignore
      get: (t, k) => k in t ? t[k] : t[k] =
        new Writeable(() => this.get()?.[k], v => this.set(Object.assign(this.value, { [k]: v })))
    }) as unknown as ObsW<T>;
  }

}

export function writeable<T>(get: () => T, set: (v: T) => unknown){
  return new Writeable(get, set);
}

export const useWriteable = use_(writeable);

export type W<T> = Writeable<T>;
