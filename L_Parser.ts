import {
  ByNode,
  DefNode,
  ExistNode,
  HaveNode,
  IffNode,
  IfNode,
  KnowNode,
  L_Node,
  LetCompositeNode,
  LetHashNode,
  LetNode,
  LocalEnvNode,
  LogicNode,
  MacroNode,
  OptNode,
  OrNode,
  PostfixProve,
  ProveNode,
  ReturnNode,
  SpecialNode,
  ToCheckNode,
} from "./L_Nodes";
import { L_Env } from "./L_Env";
import {
  AreKeywords,
  LetCompositeKeyword,
  ByKeyword,
  ClearKeyword,
  ContradictionKeyword,
  DefKeywords,
  ExistKeyword,
  HaveKeywords,
  IffKeyword,
  IfKeyword,
  IsKeywords,
  KnowTypeKeywords,
  L_Ends,
  L_Keywords,
  LetHashKeyword,
  LetKeyword,
  LetKeywords,
  LogicalKeywords,
  MacroKeywords,
  NotKeywords,
  NotsKeyword,
  OrKeywords,
  PostProveKeywords,
  ProveByContradictionKeyword,
  ProveKeywords,
  ReturnKeyword,
  RunKeyword,
  SlashKeyword,
} from "./L_Common";
import * as L_Common from "./L_Common";
import {
  CompositeSymbolInIfReq,
  L_Composite,
  L_OptSymbol,
  L_Singleton,
  L_Symbol,
} from "./L_Structs";
import { check } from "./L_Checker";
import { L_BuiltinParsers } from "./L_Builtins";

function arrParse<T>(
  env: L_Env,
  tokens: string[],
  parseFunc: Function,
  begin: string[] | string | undefined,
  end: string[] | string,
  skipEnd: boolean = true
): T[] {
  const start = tokens[0];
  const index = tokens.length;

  try {
    if (begin !== undefined) skip(tokens, begin);
    const out: T[] = [];
    while (!isCurToken(tokens, end)) {
      out.push(parseFunc(env, tokens));
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    if (skipEnd) skip(tokens, end);

    return out;
  } catch (error) {
    handleParseError(env, `parse an array`, index, start);
    throw error;
  }
}

function singletonParse(env: L_Env, tokens: string[]): L_Singleton {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const value = skip(tokens) as string;
    return new L_Singleton(value);
  } catch (error) {
    handleParseError(env, "parse singleton", index, start);
    throw error;
  }
}

function optSymbolParse(env: L_Env, tokens: string[]): L_OptSymbol {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const name = skip(tokens) as string;
    return new L_OptSymbol(name);
  } catch (error) {
    handleParseError(env, "parse singleton", index, start);
    throw error;
  }
}

function compositeParse(env: L_Env, tokens: string[]): L_Composite {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, L_Common.SlashKeyword);
    const name = skip(tokens, tokens);
    skip(tokens, "{");
    const values: L_Symbol[] = [];
    while (!isCurToken(tokens, "}")) {
      values.push(symbolParse(env, tokens));
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, "}");
    return new L_Composite(name, values);
  } catch (error) {
    handleParseError(env, "parse singleton", index, start);
    throw error;
  }
}

function compositeInIfReqParse(
  env: L_Env,
  tokens: string[]
): CompositeSymbolInIfReq {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const composite = compositeParse(env, tokens);
    const vars = arrParse<L_Singleton>(
      env,
      tokens,
      singletonParse,
      "[",
      "]",
      true
    );
    return new CompositeSymbolInIfReq(composite.name, composite.values, vars);
  } catch (error) {
    handleParseError(env, "parse singleton", index, start);
    throw error;
  }
}

function symbolParse(env: L_Env, tokens: string[]): L_Symbol {
  const start = tokens[0];
  const index = tokens.length;

  try {
    if (tokens[0] === L_Common.SlashKeyword) {
      return compositeParse(env, tokens);
    } else {
      return singletonParse(env, tokens);
    }
  } catch (error) {
    handleParseError(env, "parse symbol", index, start);
    throw error;
  }
}

function skip(tokens: string[], s: string | string[] = ""): string {
  try {
    if (typeof s === "string") {
      if (s === "") {
        const out = tokens.shift();
        if (out === undefined) throw Error;
        return out;
      } else if (s === tokens[0]) {
        const out = tokens.shift();
        if (out === undefined) throw Error;
        return out;
      } else {
        throw Error("unexpected symbol: " + tokens[0]);
      }
    } else {
      for (const value of s) {
        if (value === tokens[0]) {
          const out = tokens.shift();
          if (out === undefined) throw Error;
          return out;
        }
      }
      throw Error("unexpected symbol: " + tokens[0]);
    }
  } catch {
    throw Error();
  }
}

//! Not only gets symbol, in the future it will parse $$
function shiftSymbol(tokens: string[]): string {
  if (tokens[0].startsWith("\\")) {
    const name = tokens[0];
    const outs = [tokens[0]];
    tokens.shift();
    let leftBraceNum = 1;
    skip(tokens, "{");
    outs.push("{");
    let rightBraceNum = 0;

    while (leftBraceNum !== rightBraceNum) {
      if (tokens[0] === "{") leftBraceNum++;
      else if (tokens[0] === "}") rightBraceNum++;
      outs.push(tokens[0]);
      tokens.shift();
    }

    if (isCurToken(tokens, "[")) {
      outs.push(tokens[0]);
      let leftBracketNum = 1;
      skip(tokens, "[");
      let rightBracketNum = 0;
      while (leftBracketNum !== rightBracketNum) {
        if (tokens[0] === "[") leftBracketNum++;
        else if (tokens[0] === "]") rightBracketNum++;
        outs.push(tokens[0]);
        tokens.shift();
      }
    }

    const out = outs.join(" ");

    return outs.join(" ");
  } else {
    const token = tokens.shift();
    if (typeof token !== "string") {
      throw new Error("No more tokens");
    }
    return token;
  }
}

function isCurToken(tokens: string[], s: string | string[]) {
  if (!Array.isArray(s)) {
    return s === tokens[0];
  } else {
    return s.includes(tokens[0]);
  }
}

function skipString(tokens: string[]): string {
  try {
    skip(tokens, '"');
    let out = "";
    while (!isCurToken(tokens, '"')) {
      out += tokens[0];
      shiftSymbol(tokens);
    }
    skip(tokens, '"');
    return out;
  } catch {
    throw Error();
  }
}

function handleParseError(
  env: L_Env,
  m: string,
  index: number,
  start: string = ""
) {
  env.newMessage(`At ${start}[${index * -1}]: ${m}`);
}

export function parseUntilGivenEnd(
  env: L_Env,
  tokens: string[],
  end: string | null
): L_Node[] {
  try {
    const out: L_Node[] = [];

    if (end !== null) {
      while (!isCurToken(tokens, end)) {
        getNodesFromSingleNode(env, tokens, out);
      }
    } else {
      while (tokens.length !== 0) {
        getNodesFromSingleNode(env, tokens, out);
      }
    }

    return out;
  } catch (error) {
    env.newMessage(`Error: Syntax Error.`);
    throw error;
  }
}

const KeywordFunctionMap: {
  // deno-lint-ignore ban-types
  [key: string]: Function;
} = {
  know: knowParse,
  let: letParse,
  "{": localEnvParse,
  def: defParse,
  prove: proveParse,
  prove_by_contradiction: proveParse,
  have: haveParse,
  return: returnParse,
  clear: specialParse,
  run: specialParse,
  by: byParse,
  macro: macroParse,
  "[": postfixProveParse,
  LetHashKeyword: letParse,
  let_composite: LetCompositeParse,
};

export function getNodesFromSingleNode(
  env: L_Env,
  tokens: string[],
  holder: L_Node[]
): void {
  const start = tokens[0];
  const index = tokens.length;
  try {
    if (tokens.length === 0) return;

    if (L_Ends.includes(tokens[0])) {
      tokens.shift();
      while (tokens.length > 0 && L_Ends.includes(tokens[0])) {
        tokens.shift();
      }
      return; // return is necessary because ; \n is empty expr.
    }

    const func = KeywordFunctionMap[tokens[0]];
    if (func) {
      const node = func(env, tokens);
      holder.push(node);
      return node;
    } else {
      const postProve = postfixProveParse(env, tokens, L_Ends, true);
      if (postProve.block.length === 0) {
        postProve.facts.forEach((e) => holder.push(e));
      } else {
        holder.push(postProve);
      }
    }
  } catch (error) {
    handleParseError(env, "node", index, start);
    throw error;
  }
}

function postfixProveParse(
  env: L_Env,
  tokens: string[],
  end: string[] = [...L_Ends],
  skipEnd: boolean = false
): PostfixProve {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const names: string[] = [];
    if (isCurToken(tokens, "[")) {
      skip(tokens, "[");
      while (!isCurToken(tokens, "]")) {
        names.push(shiftSymbol(tokens));
        if (isCurToken(tokens, ",")) skip(tokens, ",");
      }
      skip(tokens, "]");
    }

    const facts = factsParse(
      env,
      tokens,
      [...end, ...PostProveKeywords],
      false,
      true
    );
    const block: L_Node[] = [];
    if (PostProveKeywords.includes(tokens[0])) {
      skip(tokens, PostProveKeywords);
      skip(tokens, "{");
      while (tokens[0] !== "}") {
        while (["\n", ";"].includes(tokens[0])) {
          tokens.shift();
        }
        if (tokens[0] === "}") break;

        getNodesFromSingleNode(env, tokens, block);
      }
      skip(tokens, "}");
    }

    if (skipEnd) skip(tokens, end);

    return new PostfixProve(facts, block, names);
  } catch (error) {
    handleParseError(env, "fact", index, start);
    throw error;
  }
}

function knowParse(env: L_Env, tokens: string[]): KnowNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, KnowTypeKeywords);

    const names: string[] = [];
    if (isCurToken(tokens, "[")) {
      skip(tokens, "[");
      while (!isCurToken(tokens, "]")) {
        names.push(shiftSymbol(tokens));
        if (isCurToken(tokens, ",")) skip(tokens, ",");
      }
      skip(tokens, "]");
    }

    let facts: ToCheckNode[] = [];
    // const strict = keyword === "know" ? false : true;

    // const knowNode: KnowNode = new KnowNode([], []);
    while (!L_Ends.includes(tokens[0])) {
      facts = factsParse(env, tokens, [...L_Ends, ","], false, true);
      // knowNode.facts = knowNode.facts.concat(outs);

      if (tokens[0] === ",") skip(tokens, ",");
    }
    skip(tokens, L_Ends);

    return new KnowNode(facts, names);
    // return knowNode;
  } catch (error) {
    handleParseError(env, "know", index, start);
    throw error;
  }
}

function letParse(env: L_Env, tokens: string[]): LetNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const whichLet = skip(tokens, LetKeywords) as string;

    const names: string[] = [];
    if (isCurToken(tokens, "[")) {
      skip(tokens, "[");
      while (!isCurToken(tokens, "]")) {
        names.push(shiftSymbol(tokens));
        if (isCurToken(tokens, ",")) skip(tokens, ",");
      }
      skip(tokens, "]");
    }

    const vars: string[] = [];
    while (![...L_Ends, , ":"].includes(tokens[0])) {
      vars.push(shiftSymbol(tokens));
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }

    if (vars.some((e) => L_Keywords.includes(e) || e.startsWith("\\"))) {
      env.newMessage(`Error: ${vars} contain LiTeX keywords.`);
      throw Error();
    }

    if (L_Ends.includes(tokens[0])) {
      skip(tokens, L_Ends);
      if (whichLet === LetKeyword) {
        return new LetNode(vars, [], names);
      } else {
        return new LetHashNode(vars, [], names);
      }
    } else {
      skip(tokens, ":");
      const facts = factsParse(env, tokens, L_Ends, true, true);
      if (whichLet === LetKeyword) {
        return new LetNode(vars, facts, names);
      } else {
        return new LetHashNode(vars, facts, names);
      }
    }
  } catch (error) {
    handleParseError(env, "let", index, start);
    throw error;
  }
}

function varLstParse(
  env: L_Env,
  tokens: string[],
  end: string[],
  skipEnd: boolean = true,
  separation: string = ","
): string[] {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const out: string[] = [];
    while (!end.includes(tokens[0])) {
      const curTok = shiftSymbol(tokens);
      out.push(curTok);
      if (isCurToken(tokens, separation)) skip(tokens, separation);
    }

    if (skipEnd) skip(tokens, end);

    return out;
  } catch (error) {
    handleParseError(env, "Parsing variables", index, start);
    throw error;
  }
}

function proveParse(env: L_Env, tokens: string[]): ProveNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    let byContradict = false;
    if (tokens[0] === ProveByContradictionKeyword) {
      byContradict = true;
      skip(tokens, ProveByContradictionKeyword);
    } else {
      skip(tokens, ProveKeywords);
    }

    let toProve: null | LogicNode = null;
    let fixedIfThenOpt: null | OptNode = null;

    if (IfKeyword === tokens[0]) {
      toProve = logicParse(env, tokens, false);
    } else {
      fixedIfThenOpt = optParse(env, tokens, true);
    }

    const block: L_Node[] = [];
    skip(tokens, "{");
    while (tokens[0] !== "}") {
      while (["\n", ";"].includes(tokens[0])) {
        tokens.shift();
      }
      if (tokens[0] === "}") break;

      getNodesFromSingleNode(env, tokens, block);
    }

    skip(tokens, "}");

    let contradict: OptNode | undefined = undefined;
    if (byContradict) {
      skip(tokens, ContradictionKeyword);
      contradict = optParse(env, tokens, true);
      skip(tokens, L_Ends);
    }

    if (toProve !== null) {
      return new ProveNode(toProve, null, block, contradict);
    } else {
      return new ProveNode(null, fixedIfThenOpt, block, contradict);
    }
  } catch (error) {
    handleParseError(env, "Parsing prove", index, start);
    throw error;
  }
}

// Main Function of parser
function factsParse(
  env: L_Env,
  tokens: string[],
  end: string[],
  skipEnd: boolean,
  includeDefName: boolean = false
): ToCheckNode[] {
  const start = tokens[0];
  const index = tokens.length;

  try {
    let out: ToCheckNode[] = [];

    while (!end.includes(tokens[0])) {
      // Start of former singleNodeFacts logic
      const factStart = tokens[0];
      const factIndex = tokens.length;

      try {
        let isT = true;
        if (isCurToken(tokens, "not")) {
          isT = false;
          skip(tokens, "not");
        }

        let fact: ToCheckNode;
        if (LogicalKeywords.includes(tokens[0])) {
          fact = logicParse(env, tokens, includeDefName);
          fact.isT = isT ? fact.isT : !fact.isT;
          out = [...out, fact];
        } else if (tokens[0] === "or") {
          fact = orParse(env, tokens, includeDefName);
          fact.isT = isT ? fact.isT : !fact.isT;
          out = [...out, fact];
        } else if (tokens[0] === "nots") {
          fact = notsParse(env, tokens, includeDefName);
          fact.isT = isT ? fact.isT : !fact.isT;
          out = [...out, fact];
        } // else if (tokens[0] === "exist") {
        //   fact = logicParse(env, tokens, includeDefName);
        //   fact.isT = isT ? fact.isT : !fact.isT;
        //   out = [...out, fact];
        // }
        // else if (tokens[0] === "exist") {
        //   fact = existParse(env, tokens, includeDefName);
        //   fact.isT = isT ? fact.isT : !fact.isT;
        //   out = [...out, fact];
        // }
        else {
          const fact = optParse(env, tokens, true);
          out = [...out, fact];
        }
      } catch (error) {
        handleParseError(env, "fact", factIndex, factStart);
        throw error;
      }
      // End of former singleNodeFacts logic

      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }

    if (skipEnd) skip(tokens, end);

    return out;
  } catch (error) {
    handleParseError(env, "fact", index, start);
    throw error;
  }
}

function optParse(env: L_Env, tokens: string[], parseNot: boolean): OptNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    // TODO use builtin to implement not
    let isT = true;

    // TODO implement parse builtin
    if (Object.keys(L_BuiltinParsers).includes(tokens[0])) {
    }

    // if (tokens[0] === ExistKeyword) {
    //   skip(tokens, ExistKeyword);

    //   return optsParse(env, tokens, parseNot) as ExistNode[];
    // } else
    if (tokens.length >= 2 && tokens[1] === "(") {
      //TODO CheckVars not implemented

      const optSymbol: L_OptSymbol = optSymbolParse(env, tokens);
      const vars = arrParse<L_Symbol>(env, tokens, symbolParse, "(", ")");

      let checkVars = checkVarsParse();

      return new OptNode(optSymbol, vars, isT, checkVars);
    } else {
      const var1 = symbolParse(env, tokens);

      switch (tokens[0]) {
        case "is": {
          skip(tokens, "is");
          const optName = skip(tokens);
          const optSymbol = new L_OptSymbol(optName);
          const checkVars = checkVarsParse();
          const out = new OptNode(optSymbol, [var1], isT, checkVars);
          return out;
        }
        default: {
          const optName = skip(tokens);
          const optSymbol = new L_OptSymbol(optName);
          const var2 = symbolParse(env, tokens);
          const checkVars = checkVarsParse();
          const out = new OptNode(optSymbol, [var1, var2], isT, checkVars);
          return out;
        }
      }
    }
  } catch (error) {
    handleParseError(env, `${start} is invalid operator.`, index, start);
    throw error;
  }

  function checkVarsParse(): L_Symbol[][] | undefined {
    if (isCurToken(tokens, "[")) {
      skip(tokens, "[");
      const checkVars: L_Symbol[][] = [];
      while (!isCurToken(tokens, "]")) {
        const currentLayerVars = arrParse<L_Symbol>(
          env,
          tokens,
          symbolParse,
          undefined,
          [";", "]"],
          false
        );
        checkVars.push(currentLayerVars);
        if (isCurToken(tokens, ";")) skip(tokens, ";");
      }
      skip(tokens, "]");
      return checkVars;
    } else {
      return undefined;
    }
  }
}

function logicParse(
  env: L_Env,
  tokens: string[],
  includeDefName: boolean
): LogicNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const type = skip(tokens, [IfKeyword, IffKeyword]);
    if (type === undefined) throw Error();
    const vars: L_Symbol[] = [];
    while (!isCurToken(tokens, ":")) {
      if (isCurToken(tokens, SlashKeyword)) {
        const s = compositeInIfReqParse(env, tokens);
        vars.push(s);
      } else {
        const singleton = singletonParse(env, tokens);
        vars.push(singleton);
      }
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, ":");
    const req: ToCheckNode[] = [];
    while (!isCurToken(tokens, "{")) {
      const facts = factsParse(env, tokens, [",", "{"], false);
      req.push(...facts);
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, "{");

    const onlyIfs: ToCheckNode[] = [];
    while (!isCurToken(tokens, "}")) {
      const facts = factsParse(env, tokens, [",", "}"], false);
      onlyIfs.push(...facts);
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, "}");

    if (type === IfKeyword) {
      return new IfNode(vars, req, onlyIfs, true); //! By default isT = true
    } else if (type === IffKeyword) {
      return new IffNode(vars, req, onlyIfs, true);
    } else {
      throw Error();
    }

    // const type = skip(tokens, [...IfKeywords, ExistKeyword, ...IffKeywords]);
    // if (type === undefined) throw Error();
    // const separation = LogicalOptPairs[type];
    // const symbolsBeforeThenKeyword: string[] = [];
    // for (let i = 0; i < tokens.length; i++) {
    //   if (!separation.includes(tokens[i])) {
    //     symbolsBeforeThenKeyword.push(tokens[i]);
    //   } else break;
    // }
    // let vars: string[] = [];
    // let req: ToCheckNode[] = [];
    // if (symbolsBeforeThenKeyword.includes(":")) {
    //   vars = varLstParse(env, tokens, [":"], false);
    //   skip(tokens, ":");
    //   req = factsParse(env, tokens, separation, true, includeDefName);
    // } else {
    //   req = factsParse(env, tokens, separation, true, includeDefName);
    // }
    // skip(tokens, "{");
    // const onlyIfs = factsParse(env, tokens, ["}"], true, includeDefName);
    // if (IfKeywords.includes(type)) {
    //   return new IfNode(vars, req, onlyIfs, true);
    // } else if (IffKeywords.includes(type)) {
    //   return new IffNode(vars, req, onlyIfs, true);
    // }
    // throw Error();
  } catch (error) {
    handleParseError(env, "if-then", index, start);
    throw error;
  }
}

function localEnvParse(env: L_Env, tokens: string[]): LocalEnvNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, "{");
    const nodes = parseUntilGivenEnd(env, tokens, "}");
    skip(tokens, "}");
    const out = new LocalEnvNode(nodes);
    return out;
  } catch (error) {
    handleParseError(env, "{}", index, start);
    throw error;
  }
}

function returnParse(env: L_Env, tokens: string[]): ReturnNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, ReturnKeyword);
    const facts = factsParse(env, tokens, L_Ends, true, false);
    return new ReturnNode(facts);
  } catch (error) {
    handleParseError(env, "return/so", index, start);
    throw error;
  }
}

function orParse(
  env: L_Env,
  tokens: string[],
  includeDefName: boolean
): OrNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, OrKeywords);
    skip(tokens, "{");
    const facts = factsParse(env, tokens, ["}"], false, includeDefName);
    skip(tokens, "}");

    return new OrNode(facts, true);
  } catch (error) {
    handleParseError(env, "operator", index, start);
    throw error;
  }
}

function notsParse(
  env: L_Env,
  tokens: string[],
  includeDefName: boolean
): OrNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, NotsKeyword);
    skip(tokens, "{");
    const facts = factsParse(env, tokens, ["}"], false, includeDefName);
    for (const f of facts) {
      f.isT = !f.isT;
    }
    skip(tokens, "}");

    return new OrNode(facts, true);
  } catch (error) {
    handleParseError(env, "nots", index, start);
    throw error;
  }
}

function haveParse(env: L_Env, tokens: string[]): HaveNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, HaveKeywords);
    const vars: string[] = [];
    while (!isCurToken(tokens, ":")) {
      vars.push(shiftSymbol(tokens));
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, ":");

    const opts = factsParse(env, tokens, L_Ends, true, false) as OptNode[];

    return new HaveNode(opts, vars);
  } catch (error) {
    handleParseError(env, "have", index, start);
    throw error;
  }
}

// function existParse(
//   env: L_Env,
//   tokens: string[],
//   includeDefName: boolean,
// ): ExistNode {
//   const start = tokens[0];
//   const index = tokens.length;

//   try {
//     skip(tokens, ExistKeyword);
//     const vars = varLstParse(env, tokens, ["{"], true);
//     const facts = factsParse(env, tokens, ["}"], true, includeDefName);

//     return new ExistNode(vars, facts, true);
//   } catch (error) {
//     handleParseError(env, "exist", index, start);
//     throw error;
//   }
// }

function specialParse(env: L_Env, tokens: string[]): SpecialNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    const keyword = shiftSymbol(tokens);
    switch (keyword) {
      case ClearKeyword:
        skip(tokens, L_Ends);
        return new SpecialNode(ClearKeyword, null);
      case RunKeyword: {
        const words: string[] = [];
        while (!L_Ends.includes(tokens[0])) {
          words.push(shiftSymbol(tokens));
        }
        skip(tokens, L_Ends);
        return new SpecialNode(RunKeyword, words.join());
      }
      default:
        throw Error();
    }
  } catch (error) {
    handleParseError(env, "clear", index, start);
    throw error;
  }
}

function byParse(env: L_Env, tokens: string[]): ByNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, ByKeyword);
    const outs: OptNode[] = [];
    while (!isCurToken(tokens, L_Ends)) {
      const opt = optParse(env, tokens, true);
      outs.push(opt);
    }
    skip(tokens, L_Ends);

    return new ByNode(outs);
  } catch (error) {
    handleParseError(env, "by", index, start);
    throw error;
  }
}

function macroParse(env: L_Env, tokens: string[]): MacroNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, MacroKeywords);
    const regexString = skipString(tokens);
    const varName = shiftSymbol(tokens);
    const facts = factsParse(env, tokens, L_Ends, true, true);

    return new MacroNode(regexString, varName, facts);
  } catch (error) {
    handleParseError(env, "macro", index, start);
    throw error;
  }
}

function defParse(env: L_Env, tokens: string[]): DefNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, DefKeywords);

    const opt: OptNode = optParse(env, tokens, false);

    let cond: ToCheckNode[] = [];
    if (isCurToken(tokens, ":")) {
      skip(tokens, ":");
      cond = factsParse(env, tokens, L_Ends, false, false);
    }

    const onlyIfs: ToCheckNode[] = [];
    if (isCurToken(tokens, "{")) {
      skip(tokens, "{");
      onlyIfs.push(...factsParse(env, tokens, ["}"], false, false));
      skip(tokens, "}");
      return new DefNode(opt, cond, onlyIfs);
    } else {
      skip(tokens, L_Ends);
      return new DefNode(opt, cond, onlyIfs);
    }
  } catch (error) {
    handleParseError(env, "define", index, start);
    throw error;
  }
}

// export function compositeSymbolParse(
//   env: L_Env,
//   tokens: string[]
// ): CompositeSymbol {
//   const start = tokens[0];
//   const index = tokens.length;

//   try {
//     if (tokens[0].startsWith("\\")) {
//       const name = tokens[0];
//       skip(tokens);
//       skip(tokens, "{");
//       const vars: string[] = [];
//       while (!isCurToken(tokens, "}")) {
//         vars.push(shiftSymbol(tokens));
//         if (isCurToken(tokens, ",")) skip(tokens, ",");
//       }
//       skip(tokens, "}");
//       const req: ToCheckNode[] = [];
//       if (isCurToken(tokens, "[")) {
//         skip(tokens, "[");
//         while (!isCurToken(tokens, "]")) {
//           req.push(...factsParse(env, tokens, ["]"], false, false));
//         }
//         skip(tokens, "]");
//       }
//       return new CompositeSymbol(name, vars, req);
//     } else {
//       throw Error();
//     }
//   } catch (error) {
//     handleParseError(env, "composite symbol", index, start);
//     throw error;
//   }
// }

// --------------------------------------------------------
export function LetCompositeParse(
  env: L_Env,
  tokens: string[]
): LetCompositeNode {
  const start = tokens[0];
  const index = tokens.length;

  try {
    skip(tokens, L_Common.LetCompositeKeyword);
    const composite = compositeParse(env, tokens);
    skip(tokens, ":");
    const facts: ToCheckNode[] = [];
    while (!isCurToken(tokens, L_Ends)) {
      facts.push(...factsParse(env, tokens, [",", ...L_Ends], false, false));
      if (isCurToken(tokens, ",")) skip(tokens, ",");
    }
    skip(tokens, L_Ends);

    return new LetCompositeNode(composite, facts);
  } catch (error) {
    handleParseError(env, "define", index, start);
    throw error;
  }
}
