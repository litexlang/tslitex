import { L_Env } from "./env";
import { executor, RType } from "./executor";
import { scan } from "./lexer";
import { parser } from "./parser";

// Aristotle induction
const testList0 = [
  "def obj if x | => ;",
  "def set x | obj(x);",
  "def obj2 x |;",
  "let y | set(y);",
  "def set2 z | set(z);",
  "set2(y);",
  "set2(y);",
];

const testList1 = [
  "def obj if x | => ;",
  "def obj2 if x | => ;",
  "def p2 x | obj(x), obj2(x);",
  "let y | obj(y);",
  "if | obj2(y) => p2(y);",
];

const testList2 = [
  "def obj if x | => ;",
  "def obj2 x | obj(x) ;",
  "def obj3 if x | => ;",
  "def obj4 if x | => obj3(x);",
  "let EMPTY_SET;",
  "def inf if x | obj(x) => obj3(x);",
  "prove if x | obj(x) => obj3(x) {}", // unsuccessful prove
  "prove if x | obj(x) => obj3(x) {know obj4(x);}",
];

const testList3 = [
  "def obj if x | => ;",
  "def obj2 x | obj(x) ;",
  "def obj3 if x | obj(x), obj2(x) => ; ",
  "prove if x |  => obj2(x) {}", // unsuccessful prove
  "prove if x |  obj(x), obj3(x) => obj2(x) {}", // obj3 is useless
];

const testList4 = [";;;\n\n;;"];

const testList5 = [
  "def p1 if x | => ;",
  "def p2 x | p1(x);",
  // "def p3 x | p2(x);",
];

const testList6 = [
  "def p1 if x | => ;",
  "exist Ex x | p1(x);", // can be used as a "stronger" version of def.
  "let y | p1(y);",
  "have x | Ex(x);", // unsuccessful have
  "Ex(y);", // we declare and exe exist-fact by exactly using Opt code.
  "have z | Ex(z);",
];

const testList7 = [
  "def p1 if x | => ;",
  "def p2 x | p1(x);",
  "def p3 x | p2(x);",
  "let y | p1(y);",
  "p3(y);", // unknown
  "p3(y) by {p2(y)};",
  "p3(y);",
  "know not p1(y);",
  "p1(y);",
];

const testList8 = [
  "def obj if x | => ;;",
  "def obj2 x,y | obj(x), obj(y);",
  "let x,y | obj(x), obj(y);",
  "obj(x), obj(y);",
  "obj2(x,y);",
  // "know obj(y);",
  // "obj(y);",
  // "obj2(x,y);",
];

const testList9 = ["def obj if x | => ;;", "let x| not obj(x);", "not obj(x);"];

const testList10 = [
  "def p1 if x | => ;",
  "def p2 x | p1(x);",
  "def p3 x | p2(x);",
  "let x | not p3(x);",
  "assume_by_contradiction p1(x) {p2(x);} {p3(x)}",
];

const testList11 = [
  "def p0 only_if x | ;",
  "def p1 only_if x | p0(x);",
  "let x | p0(x);",
];

const testList12 = ["def p1 if x | => ;"];

const testList13 = [
  "def obj if x | => ;",
  "def obj2 if x | => obj(x) ;",
  "def obj3 if x | => obj2(x);",
  "def obj4 if x | obj3(x) => obj(x);",
  "prove obj4(#x) {obj2(x); obj(x);}",
];

const testList14 = [
  "def obj if x | => ;",
  "def obj2 if x | => x is obj;",
  "let x | x is obj;",
  "let a,b,c | a,b,c are obj;",
  "let q,w,e | w,e is obj;",
  "know a is obj;",
  "know b,c are obj2, obj2(x), w,e are obj2;",
];

const testList15 = [
  "def obj if x | => ;",
  "know obj(#x);",
  "obj(#y);",
  "let x,y,z | ;",
  "x,y,z are obj;",
];

const testList16 = [
  "def obj if x | => ;",
  "let x;",
  "def obj2 if x | => x is obj;",
  "know if x | obj(x) => obj(x);",
  "def obj3 if | obj(x) => obj(x);",
  "let x2;",
  "know if obj(x2) => obj2(x2);",
];

const testsDict: { [s: string]: [string[], Boolean] } = {
  testList: [testList0, false],
  testList1: [testList1, false],
  testList2: [testList2, false],
  testList3: [testList3, false],
  testList4: [testList4, false],
  testList5: [testList5, false],
  testList6: [testList6, false],
  testList7: [testList7, false],
  testList8: [testList8, false],
  testList9: [testList9, false],
  testList10: [testList10, false],
  testList11: [testList11, false],
  testList12: [testList12, false],
  testList13: [testList13, false],
  testList14: [testList14, false],
  testList15: [testList15, false],
  testList16: [testList16, true],
};

export function testCode() {
  for (const testList in testsDict) {
    const env = new L_Env();
    const exprs = testsDict[testList];
    if (exprs[1] === false) continue;

    for (let i = 0; i < exprs[0].length; i++) {
      const expr = exprs[0][i];
      const out = run(env, expr);
      if (out === undefined) {
        env.printClearMessage();
        continue;
      }
    }

    env.printFacts();
    env.printDeclFacts();
    env.printClearMessage();
  }
}

function run(env: L_Env, expr: string) {
  try {
    const tokens = scan(expr);
    const nodes = parser.L_StmtsParse(env, tokens);
    if (nodes === undefined) {
      return undefined;
    }
    const result: RType[] = [];
    for (const node of nodes) {
      const out = executor.nodeExec(env, node);
      result.push(out);
    }
    env.printClearMessage();

    return result;
  } catch (error) {
    return undefined;
  }
}
