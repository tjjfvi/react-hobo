import { Readable, useReadable } from "./readable";

export const observer = <I, O = JSX.Element>(component: ((i: I) => O)): ((i: I) => O) => (i: I): O => {
  let c = useReadable.use(() => null);
  let d = Readable.setCur(c);
  let result = component(i);
  d();
  return result;
};
