/* @flow */

type _OF<ForType, V:ForType> = V;
type $ObjFilter<Obj, ForType>=$ObjMap<Obj, <V>(V)=>_OF<ForType, V> | empty>;

type M<T> = $ObjMap<$Diff<T, {}>, <V>(V)=>Computed<V>> | empty;

// eslint-disable-next-line no-unused-vars
type _F<T, I, O, F:(o: Observable<T>, ...a:I)=>O> = (...a:I)=>O;
type _Fs<T> = $ObjFilter<$Diff<T, {}>, (o: Observable<T>, ...a:Array<any>)=>any>;
type Fs<T> = $ObjMap<_Fs<T>, <V>(V)=>_F<T, *, *, V> | empty>;

import React from "react";
import EventEmmiter from "events";

let cur: ?Observable<any>;

type Observable<T> = ((val?: T) => T) & ObservableClass<T>
type Computed<T> = ((val?: T) => T) & ComputedClass<T>

class ObservableClass<T> extends Function {

    _o: Observable<T>;
    val: T;
    ee: EventEmmiter;

    addDep(o: Observable<T>){
      return o;
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
      // $FlowFixMe
      return this._o(!this._o());
    }

    inc(amount: number = 1): number{
      if(typeof this._o() !== "number")
        throw new Error("Not a number");
      // $FlowFixMe
      return this._o(this._o() + amount);
    }

    dec(amount: number = 1): number{
      return this.inc(-amount);
    }

    obs: M<T>;
    fn: Fs<T>;

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

}

const observable = <T/**/>(val: T): Observable<T> => {
  const f = v => {
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
  // $FlowFixMe
  const o: Observable<T> = Object.setPrototypeOf(f, ObservableClass.prototype);
  o._o = o;
  o.val = val;
  o.ee = new EventEmmiter();
  o.ee.setMaxListeners(Infinity);
  o.obs = ((new Proxy({}, {
    get: (target, prop) => {
      if(target[prop])
        return target[prop];
      return target[prop] = computed(() => o()[prop], v => {
        o.val[prop] = v;
        o.ee.emit("change", o.val, o.val);
      });
    }
  }): any): M<T>);
  o.fn = ((new Proxy({}, {
    get: (target, prop) => {
      if(!o.val[prop])
        return;
      return (f => (...a) => f(o, ...a))(o.val[prop]);
    }
  }): any): Fs<T>);
  return o;
}

const computed = <T/**/>(func: () => T, writeFunc?: T => any) => {
  const o = observable();
  // $FlowFixMe
  const c: Computed<T> = Object.setPrototypeOf(val => {
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
  c.ee = o.ee;
  c.obs = o.obs;
  c.fn = o.fn;
  // $FlowFixMe
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
    o(v);
  }
  c.update();
  return c;
}

const useValue = <V/**/>(v: () => V): V => React.useState(v)[0];
type UO = <T>(T) => Observable<T>;
const useObservable: (UO & { use: UO }) = (() => {
  let uo = <T/**/>(v: T): Observable<T> => useValue(() => observable(v));
  uo.use = <T/**/>(v: T): Observable<T> => uo<T>(v).use();
  return uo;
})();
type UC = <T>(f: () => T, wf?: T=>any) => Computed<T>;
const useComputed: (UC & { use: UC }) = (() => {
  let uc = <T/**/>(f: ()=>T, wf?: T=>any): Computed<T> => useValue(() => computed(f, wf));
  uc.use = <T/**/>(f: ()=>T, wf?: T=>any): Computed<T> => uc<T>(f, wf).use();
  return uc;
})();

type O<T> = Observable<T>;
type C<T> = Computed<T>;

const observer = <I, O=*>(component: (I=>O)): (I=>O) => (input: I): O => {
  let c = useComputed(() => NaN).use();
  c.deps.forEach(O => O.ee.removeListener("change", c.update));
  c.deps = new Set();
  let oldCur = cur;
  cur = c;
  let result = component(input);
  cur = oldCur;
  return result;
};

export { observable, computed, useValue, useObservable, useComputed, ObservableClass, ComputedClass, observer };
export type { Observable, Computed, O, C };
