import { scan } from "./lexer";
import { L_Env } from "./env";
import { parser } from "./parser";

const codes: string[] = [
  // "set(a):set(b);",
  // "infer a(x: infer p(y: set(s);) {  infer p2(yy: set(yy);) {}  } ) {}",
  // "infer a(x: set(x);) {}",
  // "set(a):set(b);",
  // "set(a), set(b);",
  // "infer p(x: string(x);) {}",
  // "know infer p(x: string(x);) {}, set(a);",
  // "infer object(x) {object(x), object2(x);}",
  // "know object(#);",
  // "infer set(x) {}",
  // "infer eql(x,y) {}",
  // "know => eql(x,y) {strEql(x,y);};",
  // "know <= {eql(x,y);} strEql(x,y) ;",
  // "know <=> eql(x,y) strEql(x,y);",
  // "<=> set(a) set2(a);",
  // "infer in(x,s: set(s)) {\
  //   isIn(x,s);\
  // }",
  // `
  // infer isIn(x,s: set(s)) {
  //   in(x,s);
  // }
  // `,
  // `
  // know iff in(x,s) isIn(x,s); ;
  // `,
  // `infer every_set_is_an_object(s: set(s)) {
  //     object(s);
  //   }`,
  // `have (s: set(s)) ;`,
  // "every_set_is_an_object(s) ; ",
  // `infer = (x,y: set(x), set(y), know infer p1(x:in(x,A)) {in(x,B)}) {
  //   know infer p1(x:in(x,A)) {in(x,B)}, infer  p2(x:in(x,B))  {in(x,A);};
  // }`,
  // `have (x,y: set(x), set(y));`,
  // `know =(x,y);`,
  // "p1;",
  // `infer empty_set(s:set(s)) {
  //   know infer p1(x)  {in(x,s);};
  //   iff p1 empty_set(s) ;
  // }
  // `,
  // `have (EMPTY_SET: empty_set(EMPTY_SET) );`,
  // `
  // know onlyIf = (x,y){
  //   know infer p3(x: not_in(x,A))  {not_in(x,B)};
  //   know infer p4(x: not_in(x,B))  {not_in(x,A)};
  // }`,
  // "know infer P(s) {};",
  // `know
  // infer axiom2(a) {
  //   know infer fck()  {
  //     know exist S(s: set(s), in(a,s); know infer p(x:in(x,s)) {=(x,a);}; in(a,s););
  //   };
  // };
  // `,
  // `
  // infer subset(A,B: set(A), set(B)) {
  //   know infer p(x:in(x,a)) {in(x,B);};
  // }`,
  // "know subset(A,B);",
  // "know in(x,a);",
  // "know exist S(s: set(s));",
  // `know infer AxiomN(A,P: set(A), isProperty(P)) {
  //     infer Q(s) {
  //       set(s); know infer Prop(x:in(x,A), P(x)) {};
  //     }
  //         know exist S(s: Q(s));
  // };`,
  // `know infer AxiomM(A:set(A)) {
  //   know infer
  //     QQ(x,y,P: in(x,A), isProperty(P)
  //     )
  //     {
  //  know
  //     exist EEE (s: set(s);
  //       know infer HHH(z :in(z,s)) {
  //         know exist ZZZ(x: in(x,A), P(x,z));
  //       };
  //     );
  //   };
  // };`,
  // ` know
  //     exist EEE (s: set(s);
  //       know infer HHH(z :in(z,s)) {
  //         know exist ZZZ(x: in(x,A), P(x,z));
  //       };
  //     );`,
  // `    know exist EEE (x:
  //     in(x,A), or1_not_set(x), or2_set(x);
  //     know infer PP(y:in(y,x)) {not_in(y,A);};
  //   );`,
  // `know infer AxiomX(A: set(A), not_eq(EMPTY_SET, A)) {
  //   know exist EEE (x:
  //     in(x,A), or1_not_set(x), or2_set(x),
  //     know infer PP(y:in(y,x)) {not_in(y,A);};
  //   );
  // };`,
  // "not {set(s);  know infer p(x:set(s)) {} ; infer s(x: set(x)) {}};",
  // "or {set(s); }{know infer p(x:set(s)) {};  infer s(x: set(x)) {};;;;};",
  // "set(s);",
  // "know infer p(x: set(S)) {};",
  // ";;;",
  // "set(s), set(a);",
  // `exist EEE (x: know infer PP(y: in(y,x)){}; ) ;`,
  // `    infer Q(s) {
  //   set(s); know infer Prop(x: in(x,A), P(x)) {};
  // }`,
  // "infer p(x) {}",
  // "inherit p son(z: set(z);) {ha(z);}",
  // "let (x: set(x););",
  // "set(x);",
  // "let (x: asf(x););",
  // "set(x), >(x,0);",
  // "def bundle(x: set(x), >(x,0));",
  // "know fun(#x) => {fun2(#x); };",
  // "def fun(x: set(x)) => {Set(x);}",
  // "@ : func(x) ;",
  // ": fun(x|set(x)) => {set(x);}",
  // "@: fun(#x,#y);",
  // "fun(2,3);",
  // ": fun(x,y) {: fun2(x,y) ; : fun3(y)}",
  // "@ fun(#x, #y):fun3(#x);",
  // "@ fun(#x, #y):fun4(#x);",
  // "fun(1,2):fun3(3);",
  // "// ",
  // ": func(x,y) {? fun2(x,y);  ? fun3(y) => {fun4(x);} }",
  // ": fun(x) {:fun2(x) ; : fun3(x,y) => {set(x,y);} }",
  // ": func(x,y) {? fun2();  ? fun3(y) => {fun4(x);} }",
  // "know_everything func(1,2):fun2();",
  // "!: func5(2 | set(2)) <=> {func(1):subF(2);} ;",
  // "exist existenceOf(x| set(x))",
  // "have existenceOf(y);",
  // "let x: set(x), set2(x);",
  // "def fun(x) {set(x);}",
  // "know set(#a);",
  // "prove fun(#x []):fun2(1,2: set(1), st2(1,2)) { set(#x);}",
  // "know set(a: set(x)):set2(1,2,3):set3(x,y: set(x):set(t));",
  // "exist func(x: set(x));",
  // "have x: fun(x);",
  // "re_def set(x) {}",
  // "exist ObjExist(x: obj(x)); ObjExist(o);",
  // "know set(#A) => {set(#A);};",
  // "prove set3(y:set(y)):set2(y) => {ha(z);} {know f2(y);}",
  // "know set(x:sdf(x)):set2(y:sg(y)) => {dsg(z);};",
  // "let x: set2(x: obj(x)):set3(x) => {obj(x);} ;",
  // "know set(y);",
  // ": p1(x:set(x)):p2(y:set2(x,y), set0(y)) {set3(y); set(x);}; let y0: set0(y0), set(y0); prove p1(#x: set(x)):p2(y0: set(y0)) => {set(y0)} {}",
  // "have x,y: set(x);",
  // "s,b:a,c is set:set2;",
  // "prove (THM) set(x) => {set1(x)} {}",
  // "by certainProof set(x):set(y);",
  // "thm thm_infer(#x| set(x)) => {set(x)} {set(x);}",
  // ":obj(x)",
  // ":tmp (x|set(x)) => {set(x);}",
  // "(set(#x,b), set2(a,b)) => {obj(a), obj(b), obj2(3,x)};",
  // "let x | obj(x);",
  // "know (set(x), set(y), set(z)) => {set2(x,y), set2(x,z)}",
  // ":obj(x) => {}; ",
  // ":set(x); know set(#x); ",
  // ":set2(x,y) :F(x,y|set(x)) {:son(h|set(h)) son(h);} ",
  // ":set3(x){:set2(x)} :set0(x); know set0(#x) => {set3(x)};  : p1(x|set(x)) => {:p2(y|set2(x,y), set0(y)) => {set3(y); set(x);}} ; :simpleInfer(x) => {}  ",
  // "or{set(x), set(y)};",
  // "not set(x);",
  // "set(x);",
  // "(set(x), set2(x)) => {h(x), p(x)};",
  // "x,y:z,h is set:set2",
  // "set(x|set(x)):set2(x|set(x)) => {h(x)}",
  // "~",
  // "$tmp if x,y | set(x) => set2(x,y); ",
  // "know set(x), set0(#x);",
  // "know if x,y | set(x) => est(x,y) ;",
  // "know ? x,y | set(x) => {set2(x,y), set3(x)} [tmp];",
  // "know ? | set(x) => set(x)[tmp2];",
  // `: obj x | ;  // Everything is an object.`,
  // `: item x,A | set(A)  => {} ;`,
  // `let EMPTY_SET |  if x => not item(x,EMPTY_SET); ; `,
  // `let VAR;`,
  // `set(VAR);`,
  // "prove if x | set(x) => {set(x)} {set2(x);}",
  // "set(2); set(1);",
  // "def obj if x | => {}",
  // "def obj2 x | obj(x) ;",
  // "def obj3 if x | obj(x), obj2(x) => {} ",
  // "prove if x | obj(x), obj3(x) => {obj2(x)} {}", // obj3 is useless
  // "exist  Existence x |  set(x), set2(x,y);",
  // "have x,y| set(x), set2(x,y);",
  // "set(x) by {set2(x)};",
  // "assume_by_contradiction p1(x) {p2(x);} {p3(x)}",
  // "def p1 only_if x | p2(x);",
  // "prove obj4(x) {obj2(x); obj1(x);}",
  // "obj(#y);",
  // "if | obj2(y) => p2(y);",
  // "def = iff A,B | set(A), set(B) <=> if x | in(x,A) => in(x,B), if x | in(x,B) => in(x,A);",
  "know if x | x,b are obj1 => if | => x is obj2;",
];

function testLexer() {
  const fileContent = ":obj(x)";
  const tokens = scan(fileContent);
  console.log(tokens);
}

function testParser(codes: string[]) {
  const env = new L_Env();
  for (let i = 0; i < codes.length; i++) {
    const tokens = scan(codes[i]);
    // const tokensCopy = [...tokens];
    const result = parser.L_StmtsParse(env, tokens);
    if (result === null) {
      env.printClearMessage();
    } else {
      for (let i = 0; i < result.length; i++) {
        console.log(result[i]);
      }
    }
  }
}

testParser(codes);
// testLexer();
