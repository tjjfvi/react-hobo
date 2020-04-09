
import React from "react";
import { EventEmitter } from "tsee";
import { MultiSet } from "./MultiSet";
import { Callable } from "./Callable";
import { use_ } from "./use_";

type _R = Readable<unknown>;

let cur: _R | null;

export interface Readable<T> {
  (): T;
}

class EE extends EventEmitter<{
  update: () => void;
}> {}

type Obs<T> = {
  readonly [K in keyof T]: Readable<T[K]>;
}

export class Readable<T> extends Callable<typeof EE>(EventEmitter) {

  value: T;
  alive = true;

  private func: () => T;
  private deps = new Set<_R>();
  private dependents = new Set<_R>();

  constructor(func: () => T){
    super();
    this.func = func;
    Readable.update(this);
  }

  private addDep(readable: _R){
    this.deps.add(readable);
    readable.addDependent(this);
  }

  private clearDeps(){
    for(let dep of this.deps)
      dep.removeDependent(this);
    this.deps.clear();
  }

  private addDependent(readable: _R){
    this.dependents.add(readable);
  }

  private removeDependent(readable: _R){
    this.dependents.delete(readable);
  }

  private* update(tbu = new MultiSet<_R>(), uip: ReadonlySet<_R> = new Set()){
    if(!this.alive)
      throw new Error("Called .update on dead Readable");

    if(uip.has(this))
      return console.warn("Circular dependency; using old value")

    let uip2 = new Set(uip);
    uip2.add(this);

    for(let dependent of this.dependents)
      tbu.add(dependent);

    let { dependents } = this;

    let gens = new Set(function *(){
      for(let dependent of new Set(dependents))
        yield { g: dependent.update(tbu, uip2), d: dependent };
    }());

    for(let gen of gens)
      gen.g.next();

    yield;

    this.clearDeps();
    let lastCur = cur;
    cur = this;
    this.value = this.func();
    cur = lastCur;
    this.emit("update");

    for(let gen of new Set(gens)) {
      tbu.remove(gen.d)
      if(!tbu.has(gen.d))
        gen.g.next();
    }
  }

  static update(r: _R){
    for(let _ of r.update()) _;
  }

  get = () => {
    if(!this.alive)
      throw new Error("Called .get on dead Readable");
    if(cur)
      cur.addDep(this);
    return this.value;
  }

  inn(f: ((v: NonNullable<T>) => unknown)){
    if(!this.alive)
      throw new Error("Called .inn on dead Readable");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if(this.value) f(this.value!);
    return this;
  }

  tap(f: ((v: T) => unknown)){
    if(!this.alive)
      throw new Error("Called .tap on dead Readable");
    f(this.value);
    return this;
  }

  use(){
    let first = React.useRef(true);
    let [, setState] = React.useState({});
    let update = () => setState({});
    if(first.current) {
      this.on("update", update);
      first.current = false;
    }
    React.useEffect(() => () => void this.removeListener("update", update), [])
    return this;
  }

  kill(){
    this.clearDeps();
    this.alive = false;
    delete this.value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __f(...a: any[]): any{
    a;
    return this.get();
  }

  private _obs: Obs<T>;

  get obs(){
    return this._obs = this._obs || new Proxy({}, {
      // @ts-ignore
      get: (t, k) => k in t ? t[k] : t[k] = new Readable(() => this.get()?.[k])
    }) as unknown as Obs<T>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static setCur(r: Readable<any>){
    r.clearDeps();
    let oldCur = cur;
    cur = r;
    return () => {
      cur = oldCur;
    }
  }

}

export function readable<T>(func: () => T){
  return new Readable(func);
}

export const useReadable = use_(readable);

export type R<T> = Readable<T>;
