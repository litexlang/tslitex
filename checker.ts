import {
  ByNode,
  ExistNode,
  FactNode,
  IfThenNode,
  KnowNode,
  ShortCallOptNode,
} from "./ast";
import { L_Env, StoredFactValue } from "./env";
import { executor, RType } from "./executor";

export namespace checker {
  export function check(env: L_Env, node: FactNode): RType {
    if (node instanceof ShortCallOptNode) {
      return checkShortOpt(env, node);
    } else if (node instanceof IfThenNode) {
      return checkIfThen(env, node);
    }

    return RType.Error;
  }

  /**
   * Main function of checker
   * @param env the environment we are working at
   * @param opt the fact (ShortCallOptFact) we wanna prove
   * @param ignore  which fact (ShortCallOpt) to ignore in order to avoid "req => itself, itself => req"-kind loop
   * @returns RType Error, True, False
   */
  export function checkShortOpt(env: L_Env, opt: ShortCallOptNode): RType {
    // get related fact from itself and its ancestors
    const facts = env.getShortOptFact(opt.fullName);
    if (!facts) return RType.Error;

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
            const out = checkByFactsWithNoReq(env, fixFree(e, freeToFixMap));
            return out === RType.True;
          })
        ) {
          env.newMessage(`${opt} is true, by ${storedFact}`);
          return RType.True;
        }
      }
    }
    return RType.Unknown;
  }

  /**
   * Steps
   * 1. open a new Env
   * 2. emit var and req defined in if-then to new env
   * 3. check onlyIfs of if-then
   */
  export function checkIfThen(env: L_Env, node: IfThenNode): RType {
    const newEnv = new L_Env(env);
    newEnv.declareNewVar(node.freeVars);
    executor.knowExec(newEnv, new KnowNode(node.req));

    for (const fact of node.onlyIfs) {
      const out = check(newEnv, fact);
      if (out === RType.Error) return RType.Error;
      else if ([RType.False, RType.Unknown].includes(out)) return out;
    }

    return RType.True;
  }

  export function checkByFactsWithNoReq(env: L_Env, node: FactNode) {
    if (node instanceof ShortCallOptNode) {
      return checkShortOptByFactsWithNoReq(env, node);
    } else if (node instanceof IfThenNode) {
      return checkIfThenByFactsWithNoReq(env, node);
    }

    return RType.Error;
  }

  function checkShortOptByFactsWithNoReq(env: L_Env, opt: ShortCallOptNode) {
    const facts = env.getShortOptFact(opt.fullName);
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

  export function checkShortOptInHave(
    env: L_Env,
    opt: ShortCallOptNode
  ): RType {
    const facts = env.getShortOptFact(opt.fullName);
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
    newEnv.declareNewVar(node.freeVars);
    executor.knowExec(newEnv, new KnowNode(node.req));

    for (const fact of node.onlyIfs) {
      const out = checkByFactsWithNoReq(newEnv, fact);
      if (out === RType.Error) return RType.Error;
      else if ([RType.False, RType.Unknown].includes(out)) return out;
    }

    return RType.True;
  }

  function checkSingleVar(trueFact: string, toCheck: string) {
    return trueFact.startsWith("#") || trueFact === toCheck;
  }

  function fixFree(e: FactNode, freeToFixMap: Map<string, string>): FactNode {
    if (e instanceof IfThenNode) {
      return new IfThenNode(
        e.freeVars.map((s) => {
          const out = freeToFixMap.get(s);
          if (out === undefined) return s;
          else return out;
        }),
        [...e.req],
        [...e.onlyIfs]
      );
    } else if (e instanceof ShortCallOptNode) {
      return new ShortCallOptNode(
        e.fullName,
        e.vars.map((s) => {
          const out = freeToFixMap.get(s);
          if (out === undefined) return s;
          else return out;
        })
      );
    }
    throw Error("fact should be if-then or shortOpt");
  }
}
