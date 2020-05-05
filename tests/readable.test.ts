import { Readable } from "../src";

const alpha = "abcdefghijklmnopqrstuvwxyz";

const randomGraph = (len: number) => Array(len).fill(0).map((_, i) => {
  i++;
  let sub = Array(i).fill(0).flatMap((_, j) => Math.random() > .5 ? j : []);
  if(sub.length === 0)
    sub = [i - 1];
  return [i, ...sub].map(x => alpha[x]).join("");
}).reverse();

let graphs = {
  simple: ["dc", "cb", "ba"],
  split: ["dbc", "ba", "ca"],
  unevenSplit: ["edb", "dc", "ca", "ba"],
  random5: randomGraph(5),
  random10: randomGraph(10),
  random20: randomGraph(20),
  random25: randomGraph(25),
};

test.each(
  Object.entries(graphs).map(([k, v]) => [`${k}: ${v.join(" ")}`, v] as [string, string[]])
)("%s", (k, v) => {
  let fns: jest.Mock[] = [];
  let obj = v.reduceRight<{ [k: string]: Readable<void> }>((obj, [n, ...os]) => {
    const f = jest.fn().mockName(n);
    fns.push(f);
    obj[n] = new Readable(() => {
      os.forEach(o => obj[o]());
    })
    obj[n].on("update", f)
    return obj;
  }, { a: new Readable(() => void 0) })
  Readable.update(obj.a);
  fns.forEach(fn => expect(fn).toBeCalledTimes(1))
})
