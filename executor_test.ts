import { LiTeXEnv } from "./env";
import { nodeExec, ExecInfo, ResultType, resultTypeMap } from "./executor";
import { scan } from "./lexer";
import { LiTeXStmtsParse } from "./parser";

const env: LiTeXEnv = new LiTeXEnv();

const codes: string[] = [
  // "// Start from one axiom, get followings",
  // "infer Axiom(x,y: P(x), Q(y);) { Thm1(x,y); Thm2(x,y);}",
  // "know P(#x), Q(#2), Axiom(#ha,#y);",
  // "infer Thm1(x,y: Thm2(x,y);) {Thm3(x,y);}",
  // "Thm1(#0, #1);",
  // "Thm3(#x, #3);",
  // "// declare infer using def =>",
  // "def Axiom(x,y: P(x), Q(y)) => {Thm1(x,y), Thm2(x,y);}",
  // "know P(#x), Q(#2), Axiom(#ha,#y);",
  // "def Thm1(x,y: Thm2(x,y)) => {Thm3(x,y);}",
  // "Thm1(#0, #1);",
  // "Thm3(#x, #3);",
  // "// @ is used as know",
  // ": Axiom(x,y| P(x), Q(y)) => {Thm1(x,y), Thm2(x,y);}",
  // "@ P(#x), Q(#2), Axiom(#ha,#y);",
  // ": Thm1(x,y| Thm2(x,y)) => {Thm3(x,y);}",
  // "Thm1(#0, #1);",
  // "Thm3(#x, #3);",
  // "// know and declare at the same time",
  // "@: fun(#x,3);",
  // "fun(2,1);",
  // "fun(3,3);",
  // "@: deduce(#x,#y) => { corollary(#y,#x);};",
  // "deduce(1,2);",
  // "corollary(2,1);",
  // "// declare subTemplate in template",
  // ": fun(x,y) {: subFun(y)}",
  // "@ fun(#x, #y):fun3(#x);",
  // "@ fun(#x, #y):fun4(#x);",
  // "fun(1,2):fun3(3);",
  // ":fun(x) {:fun2(x) :fun3(x,y) => {set(x,y);};fun4(x);}",
  // "know fun(3);",
  // "fun(3);",
  // "know fun(2):fun3(1,2);",
  // "fun(2):fun3(1,2);",
  // "fun(3);",
  // "fun(1):fun3(1,2);",
  // "know fun(1):fun2(x);",
  // "fun(1):fun2(x);",
  // "know fun(#1):fun2(2);",
  // "fun(21):fun2(2);",
  // "fun(3):fun2(1234);",
  // "know fun(1,2,3):fun2(3,4);",
  // "fun(1,2,3):fun2(3,4);",
  // ": inf(x) => {set(x);}",
  // "know inf(2);",
  // "inf(2), set(2);",
  // "// do ?",
  ": func(x,y) <=> {? fun2();  ? fun3(y) => {fun4(x);} }",
  "@ func(1,2):fun2();",
  // "func(1,2):fun2();",
  // "@ func(1,2,3);",
  // "@! func(1,2):fun3(3);",
  // ": definedP(x,y) <=> {set(x);}",
  // "know : fun(1,2);",
  // "is_def(definedP2);",
  // ": fun(x,y) <=> set(x), set2(y);",
  // "// emit",
  // "know func(1,2) => fun5(1);",
  // "func(1,2);",
  // "fun5(1);",
  // "know func(1,2);",
  // "fun5(1);",
  // "// know everything",
  // ": everything(x,y: fun0(x,y)) <=> {? fun2();  ? fun3(y) => {fun4(x);} }",
  // "know-everything everything(1,2);", // requirements, onlyIfs, itself, all emitted.
  // "// test emitFact",
  // "def func(x) {func4(x);}",
  // "know func(1);",
];

function callOptsExecTest() {
  console.log("\n----results------\n");
  for (const item of codes) {
    const tokens = scan(item);
    const result = LiTeXStmtsParse(env, tokens);
    if (result === null) {
      for (let i = 0; i < env.errors.length; i++) {
        console.log(env.errors[i]);
        console.log("parse error: ___________");
      }
    } else {
      for (let i = 0; i < result.length; i++) {
        const res: ExecInfo = nodeExec(env, result[i]);
        if (!res.message) console.log(resultTypeMap[res.type]);
        else console.log(resultTypeMap[res.type], res.message);
      }
    }
  }
  console.log("");
  env.printCallOptFacts();
  env.printDeclaredTemplates();
}

callOptsExecTest();
