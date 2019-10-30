/* @flow */

import React from "react";
import EventEmmiter from "events";

let cur: ?Observable<any>;

type Observable<T> = ((val?: T) => T) & ObservableClass<T>
type Computed<T> = ((val?: T) => T) & ComputedClass<T>

class ObservableClass<T> extends Function {

    o: Observable<T>;
    val: T;
    ee: EventEmmiter;

    addDep(o: Observable<T>){
      return o;
    }

    use(){
      let first = React.useRef(true);
      let [, setState] = React.useState({});
      let update = () => setState({});
      if(first.current) {
        this.ee.on("change", update);
        first.current = false;
      }
      React.useEffect(() => () => void this.ee.removeListener("change", update), [])
      return this;
    }

    toggle(): boolean{
      if(typeof this.o() !== "boolean")
        throw new Error("Not a boolean");
      // $FlowFixMe
      return this.o(!this.o());
    }

    inc(amount: number = 1): number{
      if(typeof this.o() !== "number")
        throw new Error("Not a number");
      // $FlowFixMe
      return this.o(this.o() + amount);
    }

    dec(amount: number = 1): number{
      return this.inc(-amount);
    }

}

class ComputedClass<T> extends ObservableClass<T> {

  deps: Set<Observable<any>>;

  update: () => any;

  addDep(o: Observable<any>){
    if(this.deps.has(o))
      return;
    o.ee.on("change", this.update);
    this.deps.add(o);
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
  o.o = o;
  o.val = val;
  o.ee = new EventEmmiter();
  o.ee.setMaxListeners(Infinity);
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
  c.o = c;
  c.ee = o.ee;
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
const useObservable = <T/**/>(v: T): Observable<T> => useValue(() => observable(v));
const useComputed = <T/**/>(v: () => T): Computed<T> => useValue(() => computed(v));

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
