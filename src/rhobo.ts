/* eslint-disable @typescript-eslint/no-explicit-any */

type M<T> = { readonly [K in keyof T]: Computed<T[K]> };
type Fs<T> = {
  readonly [K in keyof T]: T extends ((o: Observable<T>, ...i: infer I) => infer O) ? (...a: I) => O : void
};


import React from "react";
import { EventEmitter } from "tsee";

type EE<T> = EventEmitter<{ change: (cur: T, old: T) => void }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cur: Computed<any> | null = null;

type Observable<T> = ((val?: T) => T) & ObservableClass<T>
type Computed<T> = ((val?: T) => T) & ComputedClass<T>

class ObservableClass<T> extends Function {

  _o: Observable<T>;
  val: T;
  ee: EE<T>;

  addDep(o: Observable<T>){
    o;
  }

  use(): Observable<T>{
    let first = React.useRef(true);
    let [, setState] = React.useState({});
    let update = () => setState({});
    if(first.current) {
      this.ee.on("change", update);
      first.current = false;
    }
    React.useEffect(() => () => void this.ee.removeListener("change", update), [])
    return this._o;
  }

  toggle(): boolean{
    // @ts-ignore
    return this._o(!this._o());
  }

  inc(amount = 1): number{
    if(typeof this._o() !== "number")
      throw new Error("Not a number");
    // @ts-ignore
    return this._o(this._o() + amount);
  }

  dec(amount = 1): number{
    return this.inc(-amount);
  }

  tap(f: (x: T) => any): Observable<T>{
    f(this.val);
    return this._o;
  }

  inn(f: (x: NonNullable<T>) => any): Observable<T>{
    if(this.val != null)
        // @ts-ignore
      f(this.val);
    return this._o;
  }

  to(v?: T): Observable<T>{
    let old = this.val;
    if(v !== undefined)
      this.val = v;
    this.ee.emit("change", this.val, old);
    return this._o;
  }

  setPromise(p: Promise<T> | (() => Promise<T>)): Observable<T>{
    (typeof p === "function" ? p() : p).then(v => this._o(v));
    return this._o;
  }

  _obs: M<T>;
  _fn: Fs<T>;

  get obs(){
    return this._obs;
  }

  get fn(){
    return this._fn;
  }

}

class ComputedClass<T> extends ObservableClass<T> {

  _o: Computed<T>;
  deps: Set<Observable<any>>;

  update: () => any;

  addDep(o: Observable<any>){
    if(this.deps.has(o))
      return;
    o.ee.on("change", this.update);
    this.deps.add(o);
  }

  use(): Computed<T>{
    super.use();
    return this._o;
  }

  tap(f: (x: T) => any): Computed<T>{
    super.tap(f);
    return this._o;
  }

  inn(f: (x: NonNullable<T>) => any): Computed<T>{
    super.inn(f);
    return this._o;
  }

  setPromise(p: Promise<T> | (() => Promise<T>)): Computed<T>{
    super.setPromise(p);
    return this._o;
  }

  to(v?: T): Computed<T>{
    super.to(v);
    return this._o;
  }

  _obs: M<T>;
  _fn: Fs<T>;

}

const _o = <T/**/>(val: T): Observable<T> => {
  const f = (v: T|void) => {
    if(v !== undefined) {
      let old = o.val;
      if(old === v)
        return v;
      o.val = v;
      o.ee.emit("change", v, old);
      return v;
    } else {
      if(cur) cur.addDep(o);
      return o.val;
    }
  };
  const o: Observable<T> = Object.setPrototypeOf(f, ObservableClass.prototype);
  o._o = o;
  o.val = val;
  o.ee = new EventEmitter();
  o.ee.setMaxListeners(Infinity);
  o._obs = ((new Proxy({}, {
    get: (target, prop) => {
      if(target[prop])
        return target[prop];
      return target[prop] = computed(() => o()?.[prop], v => {
        o.val[prop] = v;
        o.to();
      });
    }
  }) as any) as M<T>);
  o._fn = ((new Proxy({}, {
    get: (target, prop) => {
      if(!o.val[prop])
        return;
      return (f => (...a) => f(o, ...a))(o.val[prop]);
    }
  }) as any) as Fs<T>);
  return o;
}

const ofp = <T>(prom: Promise<T> | (() => Promise<T>)): Observable<T|null> => {
  const o = _o<T|null>(null);
  o.setPromise(prom);
  return o;
}

_o.fromPromise = _o.fromProm = ofp;

const observable: (typeof _o) & { fromPromise: FP; fromProm: FP } = _o;

const computed = <T>(func: (() => T), writeFunc?: ((x: T) => any)) => {
  let o: Observable<T>;
  const c: Computed<T> = Object.setPrototypeOf((val?: T) => {
    if(val !== undefined) {
      if(!writeFunc)
        throw new Error("Not a writeable computed");
      if(val === o.val)
        return val;
      writeFunc(val);
      return val;
    } else {
      if(cur) cur.addDep(c);
      return o.val;
    }
  }, ComputedClass.prototype);
  c._o = c;
  Object.defineProperty(c, "val", {
    get(){
      return o.val;
    },
    set(x){
      o.val = x;
    },
  })
  c.deps = new Set();
  c.update = () => {
    c.deps.forEach(O => O.ee.removeListener("change", c.update));
    c.deps = new Set();
    let oldCur = cur;
    cur = c;
    let v = func();
    cur = oldCur;
    o = o || observable<T>(v);
    c.ee = o.ee;
    c._obs = o._obs;
    c._fn = o._fn;
    o(v);
  }
  c.update();
  return c;
}

const useValue = <V/**/>(v: () => V): V => React.useState(v)[0];
type UO = <T>(x: T) => Observable<T>;
type FP = typeof ofp;
const useObservable: (UO & { use: UO; fromPromise: FP & { use: FP }; fromProm: FP & { use: FP } }) = (() => {
  let fp = Object.assign(
    <T>(p: Promise<T> | (() => Promise<T>)) => useValue(() => observable.fromPromise(p)),
    { use: (<T>(p: Promise<T> | (() => Promise<T>)) => fp(p).use()) as FP }
  );
  let uo = Object.assign(
    <T>(v: T): Observable<T> => useValue(() => observable(v)),
    {
      use: <T>(v: T): Observable<T> => uo<T>(v).use(),
      fromPromise: fp,
      fromProm: fp,
    }
  );
  return uo;
})();
type UC = <T>(f: () => T, wf?: (x: T) => any) => Computed<T>;
const useComputed: (UC & { use: UC }) = Object.assign(
 <T/**/>(f: (() => T), wf?: ((x: T) => any)): Computed<T> => useValue(() => computed(f, wf)),
 { use: <T/**/>(f: () => T, wf?: ((x: T) => any)): Computed<T> => useComputed<T>(f, wf).use() }
);
const observer = <I, O>(component: ((i: I) => O)): ((i: I) => O) => (i: I): O => {
  let c = useComputed(() => NaN).use();
  c.deps.forEach(O => O.ee.removeListener("change", c.update));
  c.deps = new Set();
  let oldCur = cur;
  cur = c;
  let result = component(i);
  cur = oldCur;
  return result;
};

const useObs = useObservable;
const useO = useObs;

const useComp = useComputed;
const useC = useComp;

const obs = observable;
const o = obs;

const comp = computed;
const c = comp;

type Obs<T> = Observable<T>;
type O<T> = Obs<T>;

type Comp<T> = Computed<T>;
type C<T> = Comp<T>;

export {
  observable,
  obs,
  o,
  computed,
  comp,
  c,
  useValue,
  useObservable,
  useObs,
  useO,
  useComputed,
  useComp,
  useC,
  ObservableClass,
  ComputedClass,
  observer,
  Observable,
  Obs,
  O,
  Computed,
  Comp,
  C
};
