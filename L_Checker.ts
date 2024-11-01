import { FactNode, IfThenNode, KnowNode, OptNode } from "./ast";
import { L_Env } from "./L_Env";
import { L_Executor, RType } from "./L_Executor";
import { L_FactStorage, StoredFact } from "./L_FactStorage";

export namespace L_Checker {
  export function check(env: L_Env, toCheck: FactNode): RType {
    if (toCheck instanceof OptNode) {
      return checkOpt(env, toCheck);
    } else if (toCheck instanceof IfThenNode) {
      return checkIfThen(env, toCheck);
    }

    return RType.Unknown;
  }

  export function checkIfThen(env: L_Env, toCheck: IfThenNode): RType {
    let out: RType = RType.True;
    const newEnv = new L_Env(env);

    for (const e of toCheck.vars) {
      const ok = newEnv.safeNewVar(e, e);
      if (!ok) return RType.Error;
    }
    // toCheck.vars.forEach((e) => newEnv.newVar(e, e));

    for (const f of toCheck.req) L_FactStorage.store(newEnv, f, []);
    for (const onlyIf of toCheck.onlyIfs) {
      out = check(newEnv, onlyIf);
      if (out !== RType.True) return out;
      else {
        // checked facts in then are used as stored fact.
        L_FactStorage.store(newEnv, toCheck, []);
      }
    }
    return RType.True;
  }

  // MAIN FUNCTION OF THE WHOLE PROJECT
  export function checkOpt(env: L_Env, toCheck: OptNode): RType {
    const storedFacts: StoredFact[] | null = env.getStoredFacts(toCheck);
    if (storedFacts === null) {
      env.newMessage(`check error: ${toCheck.fullName} not declared.`);
      return RType.Error;
    }

    for (const storedFact of storedFacts) {
      if (toCheck.vars.length !== storedFact.vars.length) {
        env.newMessage(
          `Invalid number of arguments: need ${storedFact.vars.length}, get ${toCheck.vars.length}`
        );
        return RType.Error;
      }

      if (storedFact.isNoReq()) {
        const out = checkOptLiterally(env, toCheck);
        if (out === RType.True) {
          return RType.True;
        } else if (out === RType.Error) {
          return RType.Error;
        } else {
          continue;
        }
      }

      let unknown = false;
      const map = new Map<String, string>();
      for (let i = 0; i < toCheck.vars.length; i++) {
        // check whether a variable is already declared at current level, for example, `if x,x | ...` is not allowed
        if (map.get(storedFact.vars[i])) {
          env.newMessage(`Double declaration of ${storedFact.vars[i]}`);
          return RType.Error;
        }

        map.set(storedFact.vars[i], toCheck.vars[i]);
      }

      for (const currentLevelReq of storedFact.req) {
        // try to operate(store facts, introduce new variables) under current layer of stored if-then
        let newEnv = new L_Env(env);

        for (const e of currentLevelReq.vars) {
          const ok = newEnv.safeNewVar(e, map.get(e) as string);
          if (!ok) {
            newEnv.getMessages().forEach((e) => env.newMessage(e));
            return RType.Error;
          }
        }

        // satisfy literal restrictions
        // works
        for (const req of currentLevelReq.req) {
          if (req instanceof OptNode) {
            // const l1 = req.vars.map((e) => newEnv.getVar(e)) as string[];

            const fixedVars = req.vars.map((e) => map.get(e)) as string[];

            const checkReq = new OptNode(req.fullName, fixedVars);
            // const checkReq = new OptNode(
            //   req.fullName,
            //   req.vars.map((e) => map.get(e)) as string[]
            // );
            const out = checkOptLiterally(env, checkReq);
            if (out === RType.True) {
              continue;
            } else if (out === RType.Error) {
              env.getMessages().forEach((e) => env.newMessage(e));
              return RType.Error;
            } else {
              unknown = true;
              break;
            }
          } else if (req instanceof IfThenNode) {
            const out = checkOpt(newEnv, toCheck);
            if (out === RType.True) continue;
            else if (out === RType.Error) {
              newEnv.getMessages().forEach((e) => env.newMessage(e));
              return RType.Error;
            } else {
              unknown = true;
              break;
            }
          }
        }

        if (unknown) break;
        else newEnv = new L_Env(newEnv);
      }
      if (unknown) continue;
      return RType.True;
    }

    return RType.Unknown;
  }

  // check whether a variable in fact.vars is free or fixed at check time instead of run time.
  function checkOptLiterally(env: L_Env, toCheck: OptNode): RType {
    const facts: StoredFact[] | null = env.getStoredFacts(toCheck);

    if (facts === null) {
      env.newMessage(`check Error: ${toCheck.fullName} not declared.`);
      return RType.Error;
    }

    for (const fact of facts) {
      const frees = fact.getAllFreeVars();
      if (
        fact.isNoReq() &&
        toCheck.vars.every(
          (v, i) => frees.includes(fact.vars[i]) || v === fact.vars[i]
        )
      )
        return RType.True;
    }

    return RType.Unknown;
  }

  export function checkOptInHave(env: L_Env, opt: OptNode): RType {
    return RType.Unknown;
  }
}