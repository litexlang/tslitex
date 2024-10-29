import { fail } from "assert";
import {
  FactNode,
  IffNode,
  IfThenNode,
  KnowNode,
  OnlyIfNode,
  OptNode,
} from "./ast";
import { L_Env, StoredFactValue } from "./env";
import { executor, RType } from "./executor";
import { L_Storage } from "./L_Storage";
export class CheckerOut {
  constructor(
    public type: RType,
    public checkedByOpt: Boolean = false
  ) {}
}

export namespace checker {
  export function check(env: L_Env, node: FactNode): CheckerOut {
    if (node instanceof OptNode) {
      const out = checkOpt(env, node);
      return out;
    } else if (node instanceof IfThenNode) {
      const out = checkLogicalOpt(env, node.vars, node.req, node.onlyIfs);
      return new CheckerOut(out);
    } else if (node instanceof IffNode) {
      let out = checkLogicalOpt(env, node.vars, node.req, node.onlyIfs);
      if (!(out === RType.True)) return new CheckerOut(out);
      out = checkLogicalOpt(env, node.vars, node.onlyIfs, node.req);
      return new CheckerOut(out);
    } else if (node instanceof OnlyIfNode) {
      const out = checkLogicalOpt(env, node.vars, node.onlyIfs, node.req);
      return new CheckerOut(out);
    }

    return new CheckerOut(RType.Error);
  }

  /**
   * Main function of checker
   * @param env the environment we are working at
   * @param opt the fact (OptFact) we wanna prove
   * @param ignore  which fact (Opt) to ignore in order to avoid "req => itself, itself => req"-kind loop
   * @returns RType Error, True, False
   */
  export function checkOpt(env: L_Env, opt: OptNode): CheckerOut {
    // get related fact from itself and its ancestors
    const facts: StoredFactValue[] | undefined = env.getOptFact(opt.fullName);
    if (facts === undefined) {
      if (env.getDeclFact(opt.fullName)) {
        return new CheckerOut(RType.Unknown);
      } else {
        env.newMessage(`${opt.fullName} not declared.`);
        return new CheckerOut(RType.Error);
      }
    }

    const varsNotDeclared = env.varsAreNotDeclared(opt.vars);
    if (varsNotDeclared) {
      env.newMessage(`Not all of ${opt.vars} are declared.`);
      return new CheckerOut(RType.Error);
    }

    for (const storedFact of facts) {
      /**
       * Main Logic of Checking Steps:
       * 1. literally correct and stored.isT === opt.isT
       * 2. req correct
       * 2.1 locally correct
       * 2.2 correctness is given by father
       */
      if (
        storedFact.isT === opt.isT &&
        storedFact.vars.every((s, j) => checkSingleVar(s, opt.vars[j]))
      ) {
        /**
         * check current opt by replacing potential hashed var with current var
         */
        //! I think the following fixing is buggy
        const freeToFixMap = new Map<string, string>();
        storedFact.vars.forEach((s, j) => freeToFixMap.set(s, opt.vars[j]));

        if (
          storedFact.req.every((e) => {
            let out: RType = RType.Error;
            if (e instanceof OptNode) {
              out = checkByFactsWithNoReq(env, fixFree(e, freeToFixMap));
            } else if (e instanceof IfThenNode) {
              out = checkLogicalOpt(env, e.vars, e.req, e.onlyIfs);
            }
            return out === RType.True;
          })
        ) {
          env.newMessage(`${opt} is true, by ${storedFact}`);
          if (storedFact.req.length === 0)
            return new CheckerOut(RType.True, true);
          else return new CheckerOut(RType.True);
        }
      }
    }
    return new CheckerOut(RType.Unknown);
  }

  /**
   * Steps
   * 1. open a new Env
   * 2. emit var and req defined in if-then to new env
   * 3. check onlyIfs of if-then
   */
  export function checkLogicalOpt(
    env: L_Env,
    vars: string[],
    knowWhat: FactNode[],
    checkWhat: FactNode[]
  ): RType {
    const newEnv = new L_Env(env);
    newEnv.declareNewVar(vars);
    executor.knowExec(newEnv, new KnowNode(knowWhat));

    for (const fact of checkWhat) {
      const out = check(newEnv, fact);
      if (out.type === RType.Error) return RType.Error;
      else if ([RType.False, RType.Unknown].includes(out.type)) return out.type;
    }

    return RType.True;
  }

  export function checkByFactsWithNoReq(env: L_Env, node: FactNode): RType {
    if (node instanceof OptNode) {
      return checkOptByFactsWithNoReq(env, node);
    } else if (node instanceof IfThenNode) {
      return checkIfThenByFactsWithNoReq(env, node);
    }

    return RType.Error;
  }

  function checkOptByFactsWithNoReq(env: L_Env, opt: OptNode): RType {
    const facts = env.getOptFact(opt.fullName);
    if (!facts) return RType.Error;

    for (const storedFact of facts) {
      if (
        storedFact.isT === opt.isT &&
        storedFact.vars.every((s, j) => checkSingleVar(s, opt.vars[j])) &&
        storedFact.req.length === 0
      ) {
        return RType.True;
      }
    }

    return RType.Unknown;
  }

  export function checkOptInHave(env: L_Env, opt: OptNode): RType {
    const facts = env.getOptFact(opt.fullName);
    if (!facts) return RType.Error;

    for (const storedFact of facts) {
      if (
        storedFact.vars.every((s, j) => !s.startsWith("#")) &&
        storedFact.req.length === 0 &&
        storedFact.isT === opt.isT
      ) {
        return RType.True;
      }
    }

    return RType.Unknown;
  }

  function checkIfThenByFactsWithNoReq(env: L_Env, node: IfThenNode): RType {
    const newEnv = new L_Env(env);
    newEnv.declareNewVar(node.vars);
    executor.knowExec(newEnv, new KnowNode(node.req));

    for (const fact of node.onlyIfs) {
      const out = checkByFactsWithNoReq(newEnv, fact);
      if (out === RType.Error) return RType.Error;
      else if ([RType.False, RType.Unknown].includes(out)) return out;
    }

    return RType.True;
  }

  function checkSingleVar(trueFact: string, toCheck: string): Boolean {
    return trueFact.startsWith("#") || trueFact === toCheck;
  }

  function fixFree(e: FactNode, freeToFixMap: Map<string, string>): FactNode {
    if (e instanceof IfThenNode) {
      return new IfThenNode(
        e.vars.map((s) => {
          const out = freeToFixMap.get(s);
          if (out === undefined) return s;
          else return out;
        }),
        [...e.req],
        [...e.onlyIfs]
      );
    } else if (e instanceof OptNode) {
      return new OptNode(
        e.fullName,
        e.vars.map((s) => {
          const out = freeToFixMap.get(s);
          if (out === undefined) return s;
          else return out;
        })
      );
    }
    throw Error("fact should be if-then or Opt");
  }

  /** -------------------------------------------------------------- */

  export function checkFactFully(env: L_Env, toCheck: FactNode): RType {
    if (toCheck instanceof OptNode) {
      const facts = env.getStoredFacts(toCheck.fullName);
      if (!facts) return RType.Error;
      for (const fact of facts) {
        for (const req of fact.req) {
          const newEnv = new L_Env(env);
          const ok = newEnv.fixFrees(fact.vars, toCheck.vars);
          if (!ok) return RType.Error;
          if (req instanceof OptNode) {
            const out = checkOptLiterally(newEnv, req);
            if (out === RType.True) {
              env.newMessage(`OK! ${toCheck} <= ${req}`);
              return RType.True;
            }
            if (out === RType.Error) return RType.Error;
          } else if (req instanceof IfThenNode) {
            const out = checkFactFully(newEnv, req);
            if (out === RType.True) {
              env.newMessage(`OK! ${toCheck} <= ${req}`);
              return RType.True;
            }
            if (out === RType.Error) return RType.Error;
          }
        }
      }
    } else if (toCheck instanceof IfThenNode) {
    }

    return RType.Error;
  }

  export function checkOptLiterally(env: L_Env, toCheck: OptNode): RType {
    const facts = env.getStoredFacts(toCheck.fullName);
    if (facts === undefined) return RType.Unknown;
    for (const fact of facts) {
      const vars = toCheck.vars.map((s) => env.getVar(s) as string);
      const out = fact.checkLiterally(vars, toCheck.isT);
      if (out === RType.True) return RType.True;
      else if (out === RType.Error) return RType.Error;
    }

    return RType.Unknown;
  }
}
