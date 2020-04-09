import { Readable } from "./readable";
import { useValue } from "./useValue";
import { useEffect } from "react";

type use_<F> = F & { use: F; preserve: F & { use: F } };

export const use_ = <F extends (...a: unknown[]) => Readable<unknown>>(f: F): use_<F> => {
  let core = (clear: boolean) => (...a: unknown[]) => {
    let r = useValue(() => f(...a));
    if(clear) useEffect(() => () => {
      r.kill();
    }, []);
    return r;
  };
  // @ts-ignore
  return Object.assign(
    core(true),
    {
      use: (...a: unknown[]) => core(true)(...a).use(),
      preserve: Object.assign(
        core(false),
        { use: (...a: unknown[]) => core(false)(...a).use() }
      )
    }
  )
}
