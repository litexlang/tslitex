export const testCodes = {
  BasicDef: ":set(x) :set2(x,y) :F(x,y:set(x)) {$son(h:set(h)) {set2(y,h);}}",
  // Nothing: "",
  // Comment: "\\ Comment",
  // BasicInfer:
  //   "def P(x) ; def Q(x) ; def Thm1(x,z) ; def Thm2(1,2); def Axiom(x,y: P(x), Q(y)) { Thm1(x,y); Thm2(x,y);} ",
  // BasicKnow: "know set(1); @ set2(1,2);",
  // BasicCheck: "set(1);",
  // ForAllKnow: "know set(#);",
  // ForAllCheck: "set(3);",
  Bundle: ":bundle(x,y,z: F(x,y):son(z))", // call defOpt has 2 possible effects: either check requirement and emit opt, or check opt emit requirements
  Redefine: "re_def set(x)",
};

export const testErrorCode = {
  RepeatDeclaration: `def set(x); def set(x); `,
};
