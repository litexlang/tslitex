import { L_Out } from "./L_Structs";
import { L_Env } from "./L_Env";
import { L_Exec } from "./L_Executor";
import { L_Node, OptNode, ToCheckNode } from "./L_Nodes";
import * as L_Checker from "./L_Checker";
import * as L_Memory from "./L_Memory";
import { reportExecL_Out, reportNewExist } from "./L_Messages";
// import { existBuiltinCheck } from "./L_Builtins";

// TODO : 检查没有var在这里是额外引入的
export function noVarsOrOptDeclaredHere(
  sendErrMessageToEnv: L_Env,
  here: L_Env,
  targetFact: ToCheckNode
): boolean {
  return true;
}

export function proveOpt(env: L_Env, toProve: OptNode, block: L_Node[]): L_Out {
  try {
    const newEnv = new L_Env(env);

    for (const subNode of block) {
      const out = L_Exec(newEnv, subNode);
      env.report(reportExecL_Out(out, toProve));
      if (out === L_Out.Error) {
        newEnv.getMessages().forEach((e) => env.report(e));
        env.report(`Errors: Failed to execute ${subNode}`);
        return L_Out.Error;
      }
    }

    // TODO : 检查没有var在这里是额外引入的
    const ok = noVarsOrOptDeclaredHere(env, newEnv, toProve);
    if (!ok) return L_Out.Error;

    const out = L_Checker.checkFact(newEnv, toProve);
    if (out !== L_Out.True) return out;

    L_Memory.newFact(env, toProve);

    newEnv.getMessages().forEach((e) => env.report(`[prove] ${e}`));

    return L_Out.True;
  } catch {
    env.report(`${toProve}`);
    return L_Out.Error;
  }
}

export function proveOptByContradict(
  env: L_Env,
  toProve: OptNode,
  block: L_Node[],
  contradict: OptNode
): L_Out {
  try {
    const newEnv = new L_Env(env);

    toProve.isT = !toProve.isT;
    let ok = L_Memory.newFact(newEnv, toProve);
    if (!ok) {
      newEnv.report(`Failed to store ${toProve}`);
      return L_Out.Error;
    }

    for (const subNode of block) {
      const out = L_Exec(newEnv, subNode);
      if (out === L_Out.Error) {
        newEnv.getMessages().forEach((e) => env.report(e));
        env.report(`Errors: Failed to execute ${subNode}`);
        return L_Out.Error;
      }
    }

    let out = L_Checker.checkFact(newEnv, contradict);
    if (out !== L_Out.True) {
      env.report(`Errors: Failed to execute ${contradict}`);
      return L_Out.Error;
    }

    contradict.isT = !contradict.isT;
    out = L_Checker.checkFact(newEnv, contradict);
    if (out !== L_Out.True) {
      env.report(`Errors: Failed to execute ${contradict}`);
      return L_Out.Error;
    }

    ok = noVarsOrOptDeclaredHere(env, newEnv, toProve);
    if (!ok) return L_Out.Error;

    toProve.isT = !toProve.isT;
    ok = L_Memory.newFact(env, toProve);
    if (!ok) {
      env.report(`Failed to store ${toProve}`);
      return L_Out.Error;
    }

    newEnv
      .getMessages()
      .forEach((e) => env.report(`[prove_by_contradict] ${e}`));

    return L_Out.True;
  } catch {
    env.report(`${toProve}`);
    return L_Out.Error;
  }
}
