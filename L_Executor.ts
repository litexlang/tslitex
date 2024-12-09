import {
  BuiltinCheckNode,
  ByNode,
  DefNode,
  HaveNode,
  IfNode,
  KnowNode,
  L_Node,
  LetCompositeNode,
  LetHashNode,
  LetNode,
  LocalEnvNode,
  MacroNode,
  OptNode,
  PostfixProve,
  ProveContradictNode,
  ProveNode,
  ReturnNode,
  SpecialNode,
  ToCheckNode,
} from "./L_Nodes";
import { L_Env } from "./L_Env";
import * as L_Checker from "./L_Checker";
import * as L_Memory from "./L_Memory";
import { ClearKeyword, RunKeyword } from "./L_Common";
import { runFile } from "./L_Runner";
import { LogicNode } from "./L_Nodes";
import {
  L_ReportErr,
  reportExecL_Out,
  reportNewVars,
  reportNotAllFactsInGivenFactAreDeclared,
  reportStoreErr,
} from "./L_Messages";
import { isBuiltinKeyword } from "./L_Builtins";
import { L_Out, L_Singleton } from "./L_Structs";
import {
  postfixProveExec,
  // proveExist,
  proveOpt,
  proveOptByContradict,
} from "./L_Prove";
import { on } from "events";
import { blob } from "stream/consumers";

export const DEBUG_DICT = {
  newFact: true,
  def: true,
  check: true,
  storeBy: true,
  let: true,
};

export const CheckFalse = true;

export const L_OutMap: { [key in L_Out]: string } = {
  [L_Out.Error]: "error",
  [L_Out.False]: "check: false",
  [L_Out.True]: "check: true",
  [L_Out.Unknown]: "check: unknown",
};

export function nodeExec(env: L_Env, node: L_Node, showMsg = true): L_Out {
  try {
    const nodeType = node.constructor.name;

    switch (nodeType) {
      case "DefNode":
        return defExec(env, node as DefNode);
      case "KnowNode":
        return knowExec(env, node as KnowNode);
      case "LetCompositeNode":
        return letCompositeExec(env, node as LetCompositeNode);
      case "LetNode":
        return letExec(env, node as LetNode);
      case "ProveNode":
        return proveExec(env, node as ProveNode);
      case "ProveContradictNode":
        return proveContradictExec(env, node as ProveContradictNode);
      case "PostfixProve":
        return postfixProveExec(env, node as PostfixProve);
      case "LocalEnvNode":
        return localEnvExec(env, node as LocalEnvNode);
      // case "ReturnNode":
      //   return returnExec(env, node as ReturnNode);
      case "SpecialNode":
        return specialExec(env, node as SpecialNode);
      case "MacroNode":
        return macroExec(env, node as MacroNode);
      default:
        if (node instanceof ToCheckNode) {
          try {
            const out = factExec(env, node as ToCheckNode);
            env.newMessage(reportExecL_Out(out, node));
            return out;
          } catch {
            throw Error(`${node as ToCheckNode}`);
          }
        }

        return L_Out.Error;
    }
  } catch (error) {
    if (error instanceof Error) env.newMessage(`Error: ${error.message}`);
    return L_Out.Error;
  }
}

function letExec(env: L_Env, node: LetNode): L_Out {
  try {
    // examine whether some vars are already declared. if not, declare them.
    for (const e of node.vars) {
      const ok = env.newSingletonVar(e);
      if (!ok) return L_Out.Error;
    }

    // TODO examine whether all operators are declared

    // TODO bind macro

    // store new facts
    for (const onlyIf of node.facts) {
      const ok = L_Memory.newFact(env, onlyIf);
      if (!ok) {
        reportStoreErr(env, knowExec.name, onlyIf);
        throw new Error();
      }
    }

    return L_Out.True;
  } catch {
    return env.errMesReturnL_Out(node);
  }
}

export function knowExec(env: L_Env, node: KnowNode): L_Out {
  try {
    // examine whether all facts are declared.
    // ! NEED TO IMPLEMENT EXAMINE ALL VARS ARE DECLARED.
    for (const f of node.facts) {
      const ok = env.factsInToCheckAllDeclaredOrBuiltin(f);
      if (!ok) {
        //TODO I SHOULD IMPLEMENT check whether something is declared when checking
        // env.newMessage(`Not all facts in ${f} are declared`);
        // return L_Out.Error;
      }
    }

    // store new knowns
    for (const onlyIf of node.facts) {
      const ok = L_Memory.newFact(env, onlyIf);
      if (!ok) {
        reportStoreErr(env, knowExec.name, onlyIf);
        throw new Error();
      }
    }

    // for (const [i, v] of node.names.entries()) {
    //   const ok = env.newNamedKnownToCheck(v, node.facts[i]);
    //   if (!ok) throw new Error();
    // }

    return L_Out.True;
  } catch {
    return env.errMesReturnL_Out(node);
  }
}

function defExec(env: L_Env, node: DefNode): L_Out {
  try {
    // declare new opt
    const ok = L_Memory.declNewFact(env, node);
    if (!ok) {
      env.newMessage(`Failed to store ${node}`);
      return L_Out.Error;
    }

    if (DEBUG_DICT["def"]) {
      const decl = env.getDef(node.opt.optSymbol.name);
      if (!decl) return L_Out.Error;
    }

    return L_Out.True;
  } catch {
    return env.errMesReturnL_Out(node);
  }
}

function factExec(env: L_Env, toCheck: ToCheckNode): L_Out {
  try {
    // TODO: Implement check whether the given toCheck exists and given var exists.

    const out = L_Checker.checkFact(env, toCheck);

    if (out === L_Out.True) {
      // Store Fact
      const ok = L_Memory.newFact(env, toCheck);
      if (!ok) {
        env.newMessage(`Failed to store ${toCheck}`);
        return L_Out.Error;
      }
    }

    return out;
  } catch {
    env.newMessage(`failed to check ${toCheck}`);
    return L_Out.Error;
  }
}

function localEnvExec(env: L_Env, localEnvNode: LocalEnvNode): L_Out {
  try {
    const newEnv = new L_Env(env);
    env.newMessage(`[local environment]\n`);
    for (let i = 0; i < localEnvNode.nodes.length; i++) {
      const out = nodeExec(newEnv, localEnvNode.nodes[i]);
      newEnv.getMessages().forEach((e) => env.newMessage(e));
      newEnv.clearMessages();
      if (L_Out.Error === out) return L_Out.Error;
    }
    env.newMessage(`\n[end of local environment]`);

    return L_Out.True;
  } catch {
    env.newMessage("{}");
    return L_Out.Error;
  }
}

// function returnExec(env: L_Env, node: ReturnNode): L_Out {
//   try {
//     for (const f of node.facts) {
//       noVarsOrOptDeclaredHere(env, env, f);
//     }
//     for (const toProve of node.facts) {
//       const out = L_Checker.checkFact(env, toProve);
//       if (out !== L_Out.True) return out;
//     }
//     const storeTo = env.getParent();
//     if (storeTo) {
//       for (const toProve of node.facts) {
//         const ok = L_Memory.newFact(storeTo, toProve);
//         if (!ok) {
//           env.newMessage(`Failed to store ${toProve}`);
//           return L_Out.Error;
//         }
//       }
//     }
//     return L_Out.True;
//   } catch {
//     env.newMessage("return");
//     return L_Out.Error;
//   }
// }

function specialExec(env: L_Env, node: SpecialNode): L_Out {
  try {
    switch (node.keyword) {
      case ClearKeyword:
        env.clear();
        return L_Out.True;
      case RunKeyword: {
        runFile(env, node.extra as string, true, false);
        return L_Out.True;
      }
    }

    return L_Out.Error;
  } catch {
    env.newMessage(`${node.keyword}`);
    return L_Out.Error;
  }
}

function macroExec(env: L_Env, node: MacroNode): L_Out {
  try {
    env.newMacro(node);
    return L_Out.True;
  } catch {
    return env.errMesReturnL_Out(`Failed: macro ${node}`);
  }
}

function proveContradictExec(
  env: L_Env,
  proveNode: ProveContradictNode
): L_Out {
  try {
    const newEnv = new L_Env(env);
    const negativeToProve = proveNode.toProve.copyWithIsTReverse();
    L_Memory.newFact(newEnv, negativeToProve);

    // TODO Must check all opt and vars in toProve is declared in env instead of in env
    for (const node of proveNode.block) {
      const out = nodeExec(newEnv, node);
      if (out !== L_Out.True) {
        env.newMessage(`failed to run ${node}`);
        throw Error();
      }
    }

    const out = factExec(newEnv, proveNode.contradict);
    const out2 = factExec(newEnv, proveNode.contradict.copyWithIsTReverse());

    if (out === L_Out.True && out2 === L_Out.True) {
      L_Memory.newFact(env, proveNode.toProve);
      env.newMessage(`[prove_by_contradict] ${proveNode.toProve}`);
      return L_Out.True;
    } else {
      env.newMessage(
        `failed: ${proveNode.contradict} is supposed to be both true and false`
      );
      return L_Out.Unknown;
    }
  } catch {
    return env.errMesReturnL_Out(`prove_by_contradict failed: ${proveNode}`);
  }
}

function proveExec(env: L_Env, proveNode: ProveNode): L_Out {
  try {
    const newEnv = new L_Env(env);
    if (proveNode.toProve instanceof IfNode) {
      return proveIfExec(env, proveNode);
    } else if (proveNode.toProve instanceof OptNode) {
      return proveOptExec(env, proveNode);
    }

    throw Error();
  } catch {
    return env.errMesReturnL_Out(`prove failed: ${proveNode}`);
  }
}

function proveOptExec(env: L_Env, proveNode: ProveNode): L_Out {
  try {
    const newEnv = new L_Env(env);

    // TODO Must check all opt and vars in toProve is declared in env instead of in env
    for (const node of proveNode.block) {
      const out = nodeExec(newEnv, node);
      if (out !== L_Out.True) {
        env.newMessage(`failed to run ${node}`);
        throw Error();
      }
    }

    const out = L_Checker.checkFact(newEnv, proveNode.toProve);
    if (out === L_Out.True) {
      const ok = L_Memory.newFact(env, proveNode.toProve);
      if (ok) return L_Out.True;
      else throw Error();
    } else {
      env.newMessage(`[prove failed] ${proveNode.toProve}`);
      return L_Out.Unknown;
    }
  } catch {
    return env.errMesReturnL_Out(`prove failed: ${proveNode}`);
  }
}

function proveIfExec(env: L_Env, proveNode: ProveNode): L_Out {
  try {
    const newEnv = new L_Env(env);
    const toProve = proveNode.toProve as IfNode;

    let ok = true;
    for (const v of toProve.vars) {
      //TODO how to composite?
      if (v instanceof L_Singleton) {
        ok = env.newSingletonVar(v.value);
        if (!ok) {
          env.newMessage(`Failed: ${v} already declared`);
          throw Error();
        }
      }
    }

    for (const node of toProve.req) {
      ok = L_Memory.newFact(newEnv, node);
      if (!ok) {
        throw Error();
      }
    }

    // TODO Must check all opt and vars in toProve is declared in env instead of in env
    for (const node of proveNode.block) {
      const out = nodeExec(newEnv, node);
      if (out !== L_Out.True) {
        env.newMessage(`failed to run ${node}`);
        throw Error();
      }
    }

    for (const onlyIf of toProve.onlyIfs) {
      const out = factExec(newEnv, onlyIf);
      if (out !== L_Out.True) {
        env.newMessage(`Failed to check ${onlyIf}`);
        throw Error();
      }
    }

    const out = L_Memory.newFact(env, toProve);
    if (out) {
      env.newMessage(`[prove] ${proveNode}`);
      return L_Out.True;
    } else {
      throw Error();
    }
  } catch {
    return env.errMesReturnL_Out(`prove failed: ${proveNode}`);
  }
}

//
export function noVarsOrOptDeclaredHere(
  sendErrMessageToEnv: L_Env,
  here: L_Env,
  targetFact: ToCheckNode
): boolean {
  if (here.someVarsDeclaredHere(targetFact, [])) {
    here.getMessages().forEach((e) => sendErrMessageToEnv.newMessage(e));
    sendErrMessageToEnv.newMessage(
      `Error: Some variables in ${targetFact} are declared in block. It's illegal to declare operator or variable with the same name in the if-then expression you want to prove.`
    );
    return false;
  }

  if (here.someOptsDeclaredHere(targetFact)) {
    here.getMessages().forEach((e) => sendErrMessageToEnv.newMessage(e));
    sendErrMessageToEnv.newMessage(
      `Error: Some operators in ${targetFact} are declared in block. It's illegal to declare operator or variable with the same name in the if-then expression you want to prove.`
    );
    return false;
  }

  return true;
}

function letCompositeExec(env: L_Env, node: LetCompositeNode): L_Out {
  try {
    if (env.newCompositeVar(node.composite.name, node)) {
      env.newMessage(`OK! ${node}`);
      return L_Out.True;
    } else {
      throw Error();
    }
  } catch {
    return L_ReportErr(env, letCompositeExec, node);
  }
}
