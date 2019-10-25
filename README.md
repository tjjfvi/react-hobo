
## React Hobo (Hook-Based Observables)

### Installation

```
npm i rhobo
```

### Usage

```js
import { observable, computed, useObservable, useComputed } from "rhobo";
import type { Observable, Computed } from "rhobo";
```

#### `observable`, `useObservable`

```js
const testObservable = observable<type>(testDefaultValue);

const TestComponent = props => {
  let x = useObservable<number>(0); // x will be the same observable even after rerenders
  x.use();
  return <div onClick={() => x(x()+1)}>{x()}</div> // x() is the current value, and x(value) sets x
};
```

#### `computed`, `useComputed`

```js
const TestComponent = props => {
    let x = useObservable<number>(0);
    let xPlus5 = useComputed<number>(() => x() + 5); // xPlus5 will update every time x updates
    xPlus5.use();
    return <div onClick={() => x.inc()}>{xPlus5()}</div>;
}

const TestWritableComponent = props => {
    let x = useObservable<number>(0);
    let xPlus5Times2 = useComputed<number>(
        () => (x() + 5) * 2,
        v => x(v/2 - 5), // this will be called when xPlus5Times2 is set
    );
    x.use();
    xPlus5Times2.use();
    return <div onClick={() => xPlus5Times2.inc()}>X: {x()}, 2*(X+5): {xPlus5Times2()}</div>
};
```