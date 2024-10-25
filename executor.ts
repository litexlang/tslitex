import {
  KnowNode,
  L_Node,
  LetNode,
  ShortCallOptNode,
  IfThenNode,
  FactNode,
  OrNode,
  DeclNode,
  DefDeclNode,
  IfThenDeclNode,
  ByNode,
  ProveNode,
  ExistNode,
  HaveNode,
  AssumeByContraNode,
  OnlyIfDeclNode,
} from "./ast";
import { L_Env } from "./env";
import { isRTypeTrue } from "./shared";
import { checker } from "./checker";
import { L_Builtins } from "./builtins";

export enum RType {
  Error,
  True, // not only used as True for callInferExec, but also as a generic type passed between subFunctions.
  KnowUndeclared,
  False,
  Unknown,
  HaveFailed,
  ProveFailed,
  ThmFailed,
}

export const RTypeMap: { [key in RType]: string } = {
  [RType.Error]: "error",
  [RType.False]: "check: false",
  [RType.True]: "check: true",
  [RType.Unknown]: "check: unknown",
  [RType.KnowUndeclared]: "know: undeclared opt",
  [RType.HaveFailed]: "have: failed",
  [RType.ProveFailed]: "prove: failed",
  [RType.ThmFailed]: "thm: failed",
};

function handleExecError(env: L_Env, out: RType, m: string = "") {
  env.newMessage(m);
  return out;
}

/**
 * Guideline of what execute functions do
 * 1. return RType thing
 * 2. env.newMessage()
 */
export namespace executor {
  const nodeExecMap: { [key: string]: (env: L_Env, node: any) => RType } = {
    DefDeclNode: declExec,
    IfThenDeclNode: declExec,
    ExistNode: declExec,
    OnlyIfDeclNode: declExec,
    KnowNode: knowExec,
    LetNode: letExec,
    ByNode: byExec,
    ProveNode: proveExec,
    HaveNode: haveExec,
    AssumeByContraNode: assumeByContraExec,
  };

  export function nodeExec(env: L_Env, node: L_Node): RType {
    try {
      const nodeType = node.constructor.name;
      const execFunc = nodeExecMap[nodeType];

      if (execFunc && isRTypeTrue(execFunc(env, node)))
        return successMesIntoEnv(env, node);
      else if (node instanceof FactNode) {
        try {
          return factExec(env, node as FactNode);
        } catch (error) {
          throw Error(`${node as FactNode}`);
        }
      }
      return RType.Error;
    } catch (error) {
      if (error instanceof Error) env.newMessage(`Error: ${error.message}`);
      return RType.Error;
    }
  }

  function successMesIntoEnv(env: L_Env, node: L_Node): RType {
    env.newMessage(`OK! ${node.toString()}`);
    return RType.True;
  }

  //! Here is where a new fact is generated by previous facts
  /**
   * Steps
   * 1. check fact
   * 2. know new fact
   */
  function factExec(env: L_Env, node: FactNode): RType {
    if (node instanceof ShortCallOptNode) {
      const func = L_Builtins.get(node.fullName);
      if (func) return func(env, node);
    }

    const res = checker.check(env, node as FactNode);
    if (isRTypeTrue(res)) {
      knowExec(env, new KnowNode([node]));
      return successMesIntoEnv(env, node);
    } else if (res === RType.Unknown) {
      env.newMessage(`Unknown. ${node.toString()}`);
    } else if (res === RType.False) {
      env.newMessage(`False. ${node.toString()}`);
      return res;
    }
    return RType.Error;
  }

  function byExec(env: L_Env, node: ByNode): RType {
    const newEnv = new L_Env(env);
    for (const subNode of node.block) {
      const out = nodeExec(newEnv, subNode);
      if (!(out === RType.True)) return out;
    }

    // check
    for (const toTest of node.facts) {
      const out = checker.check(newEnv, toTest);
      if (!(out === RType.True)) return out;
    }

    // emit into env
    knowExec(env, new KnowNode(node.facts));
    return RType.True;
  }

  function haveExec(env: L_Env, node: HaveNode): RType {
    try {
      // Check duplicate variable declarations
      const noErr = env.declareNewVar(node.vars);
      if (!noErr) {
        env.newMessage(
          `Error: Variable(s) ${node.vars.join(", ")} already declared in this scope.`
        );
        return RType.Error;
      }

      for (const fact of node.facts) {
        if (fact instanceof ShortCallOptNode) {
          const out = checker.checkShortOptInHave(env, fact);
          if (out !== RType.True) {
            env.newMessage(`Unknown: ${node.toString()}`);
            return out;
          }
        } else {
          //! For the time being, if-then can not be checked when have
          env.newMessage(`Error: ${node.toString()}`);
          return RType.Error;
        }
      }

      knowExec(env, new KnowNode(node.facts));

      return RType.True;
    } catch (error) {
      env.newMessage(`Error: ${node.toString()}`);
      return RType.Error;
    }
  }

  function letExec(env: L_Env, node: LetNode): RType {
    try {
      // Check duplicate variable declarations
      const noErr = env.declareNewVar(node.vars);
      if (!noErr) {
        env.newMessage(
          `Error: Variable(s) ${node.vars.join(", ")} already declared in this scope.`
        );
        return RType.Error;
      }

      knowExec(env, new KnowNode(node.facts));

      return RType.True;
    } catch (error) {
      env.newMessage(`Error: ${node.toString()}`);
      return RType.Error;
    }
  }

  /**
   * Main Function of whole project. Not only used at assume expression, other expressions which introduces new fact into environment calls this function.
   *
   * know shortOpt: store directly
   * know if-then: if then is shortOpt, store it bound with if as req; if then is if-then, inherit father req and do knowExec again.
   */
  //! This one of the functions in which new facts are generated.
  //! In order to unify interface, after checking a fact, we use KnowExec to emit new fact
  export function knowExec(
    env: L_Env,
    node: KnowNode,
    fatherReq: FactNode[] = []
  ): RType {
    try {
      for (const fact of node.facts) {
        if (fact instanceof ShortCallOptNode) {
          const factType = env.getDeclFact(fact.fullName);
          if (factType === undefined)
            throw Error(`${fact.fullName} not declared.`);

          const isT = env.varsAreNotDeclared(fact.vars.flat());
          if (isT) throw Error(`${fact.vars.flat().toString()} not declared.`);

          env.addShortOptFact(fact, [...fatherReq]);
        } else if (fact instanceof IfThenNode) {
          // store facts
          for (const onlyIf of fact.onlyIfs) {
            if (onlyIf instanceof ShortCallOptNode)
              env.addShortOptFact(onlyIf, [...fatherReq, ...fact.req]);
            else
              knowExec(env, new KnowNode([onlyIf]), [
                ...fatherReq,
                ...fact.req,
              ]);
          }
        }
      }

      return RType.True;
    } catch (error) {
      let m = `'${node.toString()}'`;
      if (error instanceof Error) m += ` ${error.message}`;
      env.newMessage(m);
      throw error;
    }
  }

  function declExec(env: L_Env, node: DeclNode): RType {
    try {
      if (env.getDeclFact(node.name)) {
        throw Error(`${node.name} already declared.`);
      }

      const definedFact = new ShortCallOptNode(node.name, node.freeVars);
      definedFact.hashVars(node.freeVars);

      node.req.forEach((e) => e.hashVars(node.freeVars));
      node.onlyIfs.forEach((e) => e.hashVars(node.freeVars));

      if (node instanceof DefDeclNode || node instanceof ExistNode) {
        // we declare and exe exist-fact by exactly using shortOpt code.
        // factType = node instanceof DefDeclNode ? FactType.Def : FactType.Exist;
        env.setDeclFact(node.name, node);

        const hashedReq =
          /** Notice the following 4 knowExec can be reduced to 2 */
          // req => itself
          knowExec(
            env,
            new KnowNode([
              new IfThenNode(definedFact.vars, node.req, [definedFact]),
            ])
          );

        // //! The whole checking process might be locked by "req => itself, itself =>req"
        // itself => req
        knowExec(
          env,
          new KnowNode([
            new IfThenNode(definedFact.vars, [definedFact], node.req),
          ])
        );

        // itself => onlyIf
        knowExec(
          env,
          new KnowNode([
            new IfThenNode(definedFact.vars, [definedFact], node.onlyIfs),
          ])
        );

        // req => onlyIf
        knowExec(
          env,
          new KnowNode([
            new IfThenNode(definedFact.vars, node.req, node.onlyIfs),
          ])
        );
      } else if (node instanceof IfThenDeclNode) {
        // factType = FactType.IfThen;
        env.setDeclFact(node.name, node);
        // req + itself => onlyIf
        // const definedFact = new ShortCallOptNode(node.name, node.freeVars);
        knowExec(
          env,
          new KnowNode([
            new IfThenNode(
              node.freeVars,
              [definedFact, ...node.req],
              node.onlyIfs
            ),
          ])
        );
      } else if (node instanceof OnlyIfDeclNode) {
        // factType = FactType.OnlyIf;
        env.setDeclFact(node.name, node);
        knowExec(
          env,
          new KnowNode([new IfThenNode(node.freeVars, node.req, [definedFact])])
        );
      } else if (node instanceof OrNode) {
        // factType = FactType.Or;
        env.setDeclFact(node.name, node);
      }

      return RType.True;
    } catch (error) {
      let m = `'${node.toString()}'`;
      if (error instanceof Error) m += ` ${error.message}`;
      env.newMessage(m);
      throw error;
    }
  }

  function proveExec(env: L_Env, node: ProveNode): RType {
    const newEnv = new L_Env(env);
    if (node.toProve !== null) {
      newEnv.declareNewVar(node.toProve.freeVars);
      knowExec(newEnv, new KnowNode(node.toProve.req));
      // execute prove block
      for (const subNode of node.block) {
        const out = nodeExec(newEnv, subNode);
        if (out !== RType.True) {
          return handleExecError(
            env,
            out,
            `Proof Block Expression ${subNode} failed.`
          );
        }
      }

      // check
      for (const toTest of node.toProve.onlyIfs) {
        const out = checker.check(newEnv, toTest);
        if (!(out === RType.True)) {
          return handleExecError(env, out, `Proof failed to prove ${toTest}.`);
        }
      }

      // emit into env
      node.toProve.hashVars(node.toProve.freeVars);
      knowExec(
        env,
        new KnowNode([
          new IfThenNode(
            node.toProve.freeVars,
            node.toProve.req,
            node.toProve.onlyIfs
          ),
        ])
      );

      return RType.True;
    } else if (node.fixedIfThenOpt !== null) {
      const declFact = env.getDeclFact(node.fixedIfThenOpt.fullName);
      if (declFact === undefined) {
        return handleExecError(
          env,
          RType.Error,
          `${node.fixedIfThenOpt.fullName} is not declared.`
        );
      }

      // Replace all free variables in the declared node with the given variables
      declFact;

      return RType.True;
    }

    return RType.Error;
  }

  /**
   * Steps
   * 1. open new Env
   * 2. assume node.assume
   * 3. run block
   * 4. check node.contradict, not node.contradict
   * 5. emit the reverse of node.assume
   */
  function assumeByContraExec(env: L_Env, node: AssumeByContraNode): RType {
    try {
      const newEnv = new L_Env(env);
      knowExec(newEnv, new KnowNode([node.assume]));
      for (const subNode of node.block) {
        const out = nodeExec(newEnv, subNode);
        if (out !== RType.True) {
          return handleExecError(
            env,
            out,
            `Proof Block Expression ${subNode} Failed.`
          );
        }
      }

      let out = checker.check(newEnv, node.contradict);
      if (!(out === RType.True)) {
        return handleExecError(
          env,
          out,
          `assume_by_contradiction failed to prove ${node.contradict}. Proof by contradiction requires checking both the statement and its negation.`
        );
      }

      node.contradict.isT = !node.contradict.isT;
      out = checker.check(newEnv, node.contradict);
      if (!(out === RType.True)) {
        return handleExecError(
          env,
          out,
          `assume_by_contradiction failed to prove ${node.contradict}. Proof by contradiction requires checking both the statement and its negation.`
        );
      }

      node.assume.isT = !node.assume.isT;
      knowExec(env, new KnowNode([node.assume]));
      return RType.True;
    } catch (error) {
      env.newMessage(`${node}`);
      return RType.Error;
    }
  }
}
