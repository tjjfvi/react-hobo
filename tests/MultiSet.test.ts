
import { MultiSet } from "../src/MultiSet"

describe("", () => {
  let multiSet = new MultiSet<string>();
  multiSet.add("a");
  let _0 = multiSet.has("a");
  multiSet.add("b");
  let _1 = multiSet.has("b");
  multiSet.add("b");
  let _2 = multiSet.has("b");
  multiSet.add("b");
  let _3 = multiSet.has("b");
  multiSet.remove("b");
  let _4 = multiSet.has("b");

  test("adds a single element", () => expect(_0).toBe(1))
  test("adds a different element", () => expect(_1).toBe(1))
  test("adds an element twice", () => expect(_2).toBe(2))
  test("adds an element thrice", () => expect(_3).toBe(3))
  test("removes an element once", () => expect(_4).toBe(2))
});
