import {
  // ByNode,
  DefNode,
  // ExistNode,
  // ExistNode,
  IfNode,
  LogicNode,
  // OnlyIfDefNode,
  OptNode,
  OrNode,
  ToCheckNode,
} from "./L_Nodes";
import { isToCheckBuiltin, L_BuiltinsKeywords } from "./L_Builtins";
import { L_Env } from "./L_Env";
import { DEBUG_DICT } from "./L_Executor";
import { KnownExist, StoredFact, StoredReq } from "./L_Structs";

export function declNewFact(
  env: L_Env,
  node: DefNode,
  _storeDefName: boolean = true
): boolean {
  let ok = true;

  ok = env.newDef(node.name, node);

  for (const onlyIf of node.onlyIfs) {
    const ok = store(env, onlyIf, [], false);
    if (!ok) return env.errMesReturnBoolean(`Failed to store ${onlyIf}`);
  }

  // const decl = new OptNode(node.name, node.vars, true, undefined);
  // if (node instanceof IfDefNode) {
  //   ok = env.newDef(node.name, node);
  //   if (!ok) {
  //     return false;
  //   }
  //   const r = [decl, ...node.req];
  //   const f = new IfNode(node.vars, r, node.onlyIfs, true, undefined);
  //   ok = storeIfThen(env, f, [], true, storeDefName);
  // } else if (node instanceof IffDefNode) {
  //   ok = env.newDef(node.name, node);
  //   if (!ok) {
  //     return false;
  //   }
  //   const left = new IfNode(
  //     node.vars,
  //     [decl, ...node.req],
  //     node.onlyIfs,
  //     true,
  //     undefined,
  //   );
  //   ok = storeIfThen(env, left, [], true, storeDefName);
  //   if (!ok) {
  //     return false;
  //   }

  //   const right = new IfNode(
  //     node.vars,
  //     node.onlyIfs,
  //     [decl, ...node.req],
  //     true,
  //     undefined,
  //   );
  //   ok = storeIfThen(env, right, [], true, storeDefName);
  //   if (!ok) {
  //     return false;
  //   }
  // } else if (node instanceof OnlyIfDefNode) {
  //   ok = env.newDef(node.name, node);
  //   if (!ok) {
  //     return false;
  //   }
  //   const r = [...node.req, decl];
  //   const f = new IfNode(node.vars, node.onlyIfs, r, true, undefined);
  //   ok = storeIfThen(env, f, [], true, storeDefName);
  // } else if (node instanceof ExistDefNode) {
  //   ok = defExist(env, node, false);
  // }

  return ok;
}

// store new fact; declare new fact if fact is of type exist.
function storeIfThen(
  env: L_Env,
  ifThen: IfNode,
  req: StoredReq[] = [],
  storeContrapositive: boolean = true
  // storeDefName: boolean = true,
): boolean {
  try {
    if (ifThen.isT) {
      for (const fact of ifThen.onlyIfs) {
        const newReq = new StoredReq(ifThen.vars, ifThen.req);
        const ok = store(
          env,
          fact,
          [...req, newReq],
          storeContrapositive
          // storeDefName,
        );
        if (!ok) return false;
      }
    } else {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function storeOpt(
  env: L_Env,
  fact: OptNode,
  req: StoredReq[],
  _storeContrapositive: boolean
  // storeDefName: boolean = true,
): boolean {
  if (L_BuiltinsKeywords.includes(fact.name)) return true;

  const declaredOpt = env.getDef(fact.name);
  if (declaredOpt === undefined) {
    env.newMessage(`${fact.name} undeclared`);
    return false;
  } else {
    // TODO: I GUESS I SHOULD CHECK WHETHER GIVEN VARS SATISFY WHEN IN DEF
    if (declaredOpt.vars.length !== fact.vars.length) {
      env.newMessage(
        `${fact.name} requires ${declaredOpt.vars.length} parameters, ${fact.vars.length} given.`
      );
      return false;
    }
  }

  // env.newFact(fact.name, fact.vars, req, fact.isT);

  // store contra positive when storing Opt.
  // if (storeContrapositive) storeContrapositiveFacts(env, fact, req);

  if (DEBUG_DICT["newFact"]) {
    const notWords = fact.isT === false ? "[not]" : "";
    if (req.length > 0) {
      env.newMessage(`[fact] ${notWords} ${fact.name}(${fact.vars}) <= ${req}`);
    } else env.newMessage(`[fact] ${notWords} ${fact.name}(${fact.vars})`);
  }

  const toStore = new StoredFact(fact.vars, req, fact.isT);

  let ok = env.newKnownFact(fact.name, toStore.getVarsToCheck(), toStore);
  if (!ok) return false;

  // If fact.vars contains all freeVars in current known if-then
  if (req.length > 0) {
    const allFreeVars = toStore.getAllFreeVars();
    if (allFreeVars.every((e) => fact.vars.includes(e))) {
      ok = env.newKnownFact(fact.name, [], toStore);
    }
  }

  return true;
}

function storeOr(
  env: L_Env,
  fact: OrNode,
  req: StoredReq[],
  storeContrapositive: boolean
  // storeDefName: boolean = true,
): boolean {
  for (let i = 0; i < fact.facts.length; i++) {
    const asReq: ToCheckNode[] = [];
    for (let j = 0; j < fact.facts.length; j++) {
      if (j !== i) {
        asReq.push(fact.facts[j].copyWithoutIsT(!fact.facts[j].isT));
      }
    }
    const ok = store(
      env,
      fact.facts[i],
      [...req, new StoredReq([], asReq)],
      storeContrapositive
      // storeDefName,
    );
    if (!ok) return ok;
  }
  return true;
}

// Main Function of Storage
export function store(
  env: L_Env,
  fact: ToCheckNode,
  req: StoredReq[] = [],
  storeContrapositive: boolean
  // storeDefName: boolean = true,
): boolean {
  if (isToCheckBuiltin(fact)) {
    const ok = storeBuiltinFact(env, fact, req, storeContrapositive);
    return ok;
  }

  try {
    if (fact instanceof LogicNode) {
      const ok = storeIfThen(env, fact as IfNode, req, storeContrapositive);
      if (!ok) return false;
    } else if (fact instanceof OptNode) {
      const ok = storeOpt(env, fact, req, storeContrapositive);
      if (!ok) return false;
    } else if (fact instanceof OrNode) {
      const ok = storeOr(env, fact, req, storeContrapositive);
      if (!ok) return false;
    } else {
      throw Error();
    }

    return true;
  } catch {
    env.newMessage(`Function L_Memory store error: ${fact}, req is ${req}.`);
    return false;
  }
}

/** MAIN FUNCTION OF THE WHOLE PROJECT
 *  Given an operator-type fact, return all stored facts that might check this fact.
 *  Only stored fact of correct environment level, i.e. if there are operators or variables with
 *  with the same name declared at some upper environment, Then these stored facts
 *  should are illegal to be returned.
 *
 *  @returns null means error. StoredFact[] is used to hold all legal stored facts.
 */
export function getStoredFacts(
  env: L_Env,
  opt: OptNode
): StoredFact[] | undefined {
  // varDeclaredNumberMap is used to store how many times a variable is declared in all visible environments
  const varsAsSet = new Set(opt.vars);
  const varDeclaredNumberMap = new Map<string, number>();
  for (const v of varsAsSet) {
    varDeclaredNumberMap.set(v, 0);
  }

  // know where the opt is declared.
  let visibleEnvLevel = -1;
  const tmp = env.whereIsOptDeclared(opt.name);
  if (tmp !== undefined) {
    visibleEnvLevel = tmp;
  } else {
    env.newMessage(`operator ${opt} not declared.`);
    return undefined;
  }

  // get fact from every visible env
  const out: StoredFact[] = [];
  for (
    let i = 0, curEnv: L_Env = env;
    i <= visibleEnvLevel && curEnv;
    i++, curEnv = curEnv.getParent() as L_Env
  ) {
    // update how many times a given var is declared
    for (const v of varsAsSet) {
      if (curEnv.varDeclaredAtCurrentEnv(v)) {
        const curNumber = varDeclaredNumberMap.get(v) as number;
        varDeclaredNumberMap.set(v, curNumber + 1);
      }
    }

    // get stored facts from current environment level
    const facts = curEnv.getKnownFactsFromCurEnv(opt);
    if (facts === undefined) continue;

    for (const fact of facts) {
      const fixedVarsAtFact = fact.getFixedVars();

      // If the var is declared at a higher level, then the fact is RELATED TO THE VARIABLE WITH THE SAME NAME AT HIGHER LEVEL, NOT RELATED WITH CURRENT VARIABLE
      let invisible = false;
      for (const v of fixedVarsAtFact) {
        if (varsAsSet.has(v) && (varDeclaredNumberMap.get(v) as number) > 1) {
          invisible = true;
          break;
        }
      }

      if (invisible) continue;
      else out.push(fact);
    }
  }

  return out;
}

export function executorStoreFact(
  env: L_Env,
  fact: ToCheckNode,
  storeContrapositive: boolean
): boolean {
  try {
    if (fact instanceof OptNode) {
      return storeOpt(env, fact as OptNode, [], storeContrapositive);
    } else if (fact instanceof IfNode) {
      const ok = storeIfThen(env, fact, [], storeContrapositive);
      if (!ok) {
        env.newMessage(`Failed to store ${fact}`);
        return false;
      }
      return true;
    } else if (fact instanceof OrNode) {
      return storeOr(env, fact, [], storeContrapositive);
    } else throw Error();
  } catch {
    env.newMessage(`Failed to store ${fact}`);
    return false;
  }
}

// deno-lint-ignore no-unused-vars
function storeContrapositiveFacts(
  env: L_Env,
  fact: OptNode,
  req: StoredReq[]
): boolean {
  let freeVars: string[] = [];
  let allStoredFactReq: ToCheckNode[] = [];
  for (const r of req) {
    freeVars = [...freeVars, ...r.vars];
    allStoredFactReq = [...allStoredFactReq, ...r.req];
  }

  const factInverse = fact.copyWithoutIsT(!fact.isT);

  for (let i = 0; i < allStoredFactReq.length; i++) {
    const r = allStoredFactReq.filter((_, index) => index !== i);
    r.push(factInverse);
    const ifThen = new IfNode(
      freeVars,
      r,
      [allStoredFactReq[i].copyWithoutIsT(!allStoredFactReq[i].isT)],
      true
      // false
    );
    const ok = storeIfThen(env, ifThen, [], false);
    if (!ok) return false;
  }

  return true;
}

// export function declDefNames(
//   env: L_Env,
//   facts: ToCheckNode[],
//   declExist: boolean
// ): boolean {
//   try {
//     // Inline getDefNameDecls logic
//     let defs: DefNameDecl[] = [];
//     for (const f of facts) {
//       const newDefs = f.getSubFactsWithDefName();
//       defs = [...defs, ...newDefs];
//     }

//     for (const def of defs) {
//       env.safeDeclOpt(def.name, def.toDefNode());
//     }

//     // Process the declarations
//     for (const decl of defs) {
//       if (declExist && decl.itself instanceof ExistNode) {
//         const toDecl = new ExistDefNode(
//           decl.name,
//           decl.ifVars,
//           decl.req,
//           decl.itself.vars,
//           decl.itself.facts
//         );

//         const ok = defExist(env, toDecl);
//         if (!ok) {
//           env.newMessage(`Failed to store ${decl.itself}`);
//         }
//       } else {
//         let ok = true;
//         let store = decl.toIfNodeIfNodeAsOnlyIf();
//         ok = storeIfThen(env, store, [], true);
//         if (!ok) {
//           env.newMessage(`Failed to store ${store}`);
//           return false;
//         }

//         store = decl.toIfNodeIfNodeAsIf();
//         // Before implementing not exist req st onlyIf <=> for all req then onlyIf
//         // Here is false.
//         ok = storeIfThen(env, store, [], false);
//         if (!ok) {
//           env.newMessage(`Failed to store ${store}`);
//           return false;
//         }

//         env.newMessage(`[def] ${decl.toDefNode()}`);
//       }
//       // // declare contrapositive exist
//       // const exist = new ExistDefNode(decl.name, decl.ifVars, decl.req, )
//       // env.declNewExist()
//     }
//     return true;
//   } catch {
//     return false;
//   }
// }

// export function defExist(
//   env: L_Env,
//   node: ExistDefNode,
//   storeAsFact: boolean,
// ): boolean {
//   try {
//     let ok = env.newDef(node.name, node);
//     if (!ok) return false;

//     ok = env.newDeclExist(node);
//     if (!ok) {
//       env.newMessage(`Failed to store ${node}`);
//       return false;
//     }

//     if (storeAsFact) {
//       const itself = new OptNode(node.name, node.vars);
//       ok = storeIfThen(env, new IfNode(node.vars, node.req, [itself]));
//       if (!ok) return false;
//     }

//     return true;
//   } catch {
//     env.newMessage("def exist");
//     return false;
//   }
// }

// export function defNameOptDef(
//   env: L_Env,
//   fact: OptNode,
//   req: StoredReq[],
// ): boolean {
//   try {
//     return storeVanilla();
//   } catch {
//     return memoryErr(
//       env,
//       `Failed to use defName ${fact.defName} to store ${fact}`,
//     );
//   }

//   //! Implement if-then-if-then memorize, layers included. store if-then instead of opt
//   // deno-lint-ignore no-unused-vars
//   function storeIfThenType() {
//     return true;
//   }

//   function storeVanilla() {
//     const ifVars: string[] = [];
//     const ifReq: ToCheckNode[] = [];

//     req.forEach((e) => {
//       e.vars.forEach((v) => ifVars.push(v));
//       e.req.forEach((v) => ifReq.push(v));
//     });

//     const ok = declNewFact(
//       env,
//       new IfDefNode(fact.defName, ifVars, ifReq, [fact]),
//       false,
//     );

//     if (!ok) {
//       return memoryErr(
//         env,
//         `failed to use defName ${fact.defName} to declare ${declNewFact}`,
//       );
//     }

//     return true;
//   }
// }

// export function defNameIfDef(
//   env: L_Env,
//   fact: IfNode,
//   req: StoredReq[],
// ): boolean {
//   try {
//     return storeVanilla();
//   } catch {
//     return memoryErr(
//       env,
//       `Failed to use defName ${fact.defName} to store ${fact}`,
//     );
//   }

//   // deno-lint-ignore no-unused-vars
//   function storeIfThenType() {
//     return true;
//   }

//   function storeVanilla() {
//     const ifVars: string[] = [];
//     const ifReq: ToCheckNode[] = [];

//     req.forEach((e) => {
//       ifVars.push(...e.vars);
//       ifReq.push(...e.req);
//     });
//     ifVars.push(...fact.vars);
//     ifReq.push(...fact.req);

//     const ok = declNewFact(
//       env,
//       new IfDefNode(fact.defName, ifVars, ifReq, fact.onlyIfs),
//       false,
//     );

//     if (!ok) {
//       return memoryErr(
//         env,
//         `failed to use defName ${fact.defName} to declare ${declNewFact}`,
//       );
//     }

//     return true;
//   }
// }

// export function storeReqSpace(
//   env: L_Env,
//   name: string,
//   fact: IfNode,
//   req: StoredReq[],
// ): boolean {
//   try {
//     return storeVanilla();
//   } catch {
//     return false;
//   }

//   function storeVanilla() {
//     const ifVars: string[] = [];
//     const ifReq: ToCheckNode[] = [];

//     req.forEach((e) => {
//       ifVars.push(...e.vars);
//       ifReq.push(...e.req);
//     });
//     ifVars.push(...fact.vars);
//     ifReq.push(...fact.req);

//     const space = new ReqSpace(ifVars, ifReq, fact.onlyIfs);
//     const ok = env.newReqSpace(name, space);

//     return ok;
//   }
// }

//* toStore should not contain if-then req that contains opt as onlyIf.
export function examineStoredFact(
  env: L_Env,
  opt: OptNode,
  toStore: StoredFact
): boolean {
  try {
    for (const storedReq of toStore.req as StoredReq[]) {
      for (const toCheck of storedReq.req) {
        const factContainOptAsIfThenReqOnlyIf =
          toCheck.containOptAsIfThenReqOnlyIf(opt);
        if (factContainOptAsIfThenReqOnlyIf) {
          env.newMessage(
            `Error: ${toCheck} contains operator ${opt} as the onlyIf of a if type requirement.`
          );
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function storeBuiltinFact(
  env: L_Env,
  fact: ToCheckNode,
  _req: StoredReq[],
  _storeContrapositive: boolean
): boolean {
  if (fact instanceof OptNode) {
    switch (fact.name) {
      case "exist": {
        // store exist
        env.newExist(fact.vars[0], new KnownExist(fact.isT));
        // if not exist, then store if vars:  => {fact(vars)}
        if (!fact.isT) {
          const defined = env.getDef(fact.vars[0]);
          if (defined === undefined) return false;
          const vars = defined.vars;
          const ifThen = new IfNode(
            vars,
            [],
            [new OptNode(fact.vars[0], vars, false, undefined)]
          );
          const ok = store(env, ifThen, [], false);
          return ok;
        }

        env.newMessage(`[exist] ${fact.vars[0]}`);
        return true;
      }
      default:
        return false;
    }
  }

  return false;
}
