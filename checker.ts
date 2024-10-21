import { map } from "lodash";
import { FactNode, FactType, IfThenNode, ShortCallOptNode } from "./ast";
import { L_Env, StoredFactValue } from "./env";
import { RType } from "./executor";

export namespace checker {
  function checkShortOpt(env: L_Env, opt: ShortCallOptNode): RType {
    const facts = env.shortOptFacts.get(opt.fullName);
    if (!facts) return RType.Error;

    for (const storedFact of facts) {
      const freeToFixMap = new Map<string, string>();
      storedFact.vars.forEach((lst, i) =>
        lst.forEach((s, j) => freeToFixMap.set(s, opt.params[i][j]))
      );

      if (
        storedFact.vars.every((ls, i) =>
          ls.every((s, j) => checkSingleVar(s, opt.params[i][j]))
        )
      ) {
        if (
          storedFact.req.every(
            (e) => checker.check(env, fixFree(e, freeToFixMap)) == RType.True
          )
        ) {
          env.messages.push(`${opt} is true, by ${storedFact}`);
          return RType.True;
        }
      }
    }

    return RType.Unknown;

    function checkSingleVar(trueFact: string, toCheck: string) {
      return trueFact.startsWith("#") || trueFact === toCheck;
    }
  }

  export function check(env: L_Env, node: FactNode): RType {
    if (node instanceof ShortCallOptNode) {
      return checkShortOpt(env, node);
    }

    return RType.Error;
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
        e.params.map((ls) =>
          ls.map((s) => {
            const out = freeToFixMap.get(s);
            if (out === undefined) return s;
            else return out;
          })
        )
      );
    }
    throw Error("fact should be if-then or shortOpt");
  }
}