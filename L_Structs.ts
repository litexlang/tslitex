import { L_Env } from "./L_Env";
import {
  L_ReportBoolErr,
  L_ReportErr,
  messageVarNotDeclared,
} from "./L_Report";
import { LogicNode, OptFactNode, L_FactNode } from "./L_Nodes";
import { checkFact } from "./L_Checker";
import { L_KW } from "./L_Keywords";

export abstract class L_Symbol {
  abstract tryVarsDeclared(env: L_Env): boolean;
  abstract fix(env: L_Env, freeFixedPairs: [L_Symbol, L_Symbol][]): L_Symbol;

  static structurallyIdentical(a: L_Symbol, b: L_Symbol): boolean {
    if (a instanceof L_Singleton && b instanceof L_Singleton) {
      return true;
    } else if (a instanceof L_Composite && b instanceof L_Composite) {
      if (a.name === b.name && a.values.length === b.values.length) {
        return a.values.every((v, i) =>
          this.structurallyIdentical(v, b.values[i])
        );
      }
      return false;
    }

    return false;
  }

  static rootSingletonPairsOfStructurallyIdenticalSymbols(
    a: L_Symbol,
    b: L_Symbol
  ): [L_Singleton, L_Singleton][] {
    if (a instanceof L_Singleton && b instanceof L_Singleton) {
      return [[a, b]];
    } else if (a instanceof L_Composite && b instanceof L_Composite) {
      if (a.name === b.name && a.values.length === b.values.length) {
        return a.values
          .map((v, i) =>
            this.rootSingletonPairsOfStructurallyIdenticalSymbols(
              v,
              b.values[i]
            )
          )
          .flat();
      }
      throw Error();
    }

    throw Error();
  }

  static isExistSymbol(symbol: L_Symbol): boolean {
    return symbol instanceof L_Singleton && symbol.value === L_KW.ExistSymbol;
  }

  static isAnySymbol(symbol: L_Symbol): boolean {
    return symbol instanceof L_Singleton && symbol.value === L_KW.AnySymbol;
  }

  static symbolArrLiterallyIdentical(
    env: L_Env,
    given: L_Symbol[],
    expected: L_Symbol[]
  ): boolean {
    return (
      given.length === expected.length &&
      given.every((e, i) => L_Symbol.literallyIdentical(env, e, expected[i]))
    );
  }

  // * ONE OF MAIN FUNCTION OF THE WHOLE PROJECT
  static literallyIdentical(
    env: L_Env,
    given: L_Symbol,
    expected: L_Symbol,
    useAlias: boolean = true
  ): boolean {
    try {
      //* ANY symbol is equal to any symbol, except EXIST
      if (provedByAny(env, given, expected)) return true;
      if (regexIdentical(env, given, expected)) return true;
      if (pureSingleIdentical(env, given, expected)) return true;
      if (compareComposites(env, given, expected)) return true;

      if (useAlias) {
        if (provedByAlias(env, given, expected)) return true;
      }

      return false;
    } catch {
      L_ReportErr(env, L_Symbol.literallyIdentical);
      return false;
    }

    function provedByAlias(
      env: L_Env,
      given: L_Symbol,
      expected: L_Symbol
    ): boolean {
      if (given instanceof L_Singleton && env.isAlias(given.value)) {
        for (const alias of env.getAlias(given.value) as L_Symbol[]) {
          if (L_Symbol.literallyIdentical(env, given, expected, false)) {
            return true;
          }
        }
      }

      if (expected instanceof L_Singleton && env.isAlias(expected.value)) {
        for (const alias of env.getAlias(expected.value) as L_Symbol[]) {
          if (L_Symbol.literallyIdentical(env, given, expected, false)) {
            return true;
          }
        }
      }

      return false;
    }

    function compareComposites(
      env: L_Env,
      given: L_Symbol,
      expected: L_Symbol
    ): boolean {
      if (given instanceof L_Composite && expected instanceof L_Composite) {
        // name of composite symbol must be equal
        if (given.name !== expected.name) {
          return false;
        }

        if (given.values.length !== expected.values.length) {
          return false;
        } else {
          for (let i = 0; i < given.values.length; i++) {
            const giv = given.values[i];
            const exp = expected.values[i];
            if (!L_Symbol.literallyIdentical(env, giv, exp)) return false;
          }
          return true;
        }
      } else {
        return false;
      }
    }

    function provedByAny(
      env: L_Env,
      given: L_Symbol,
      expected: L_Symbol
    ): boolean {
      // Exist can not be proved by any. it can only be proved by exist.
      if (L_Symbol.isAnySymbol(expected) && !L_Symbol.isExistSymbol(given))
        return true;
      if (L_Symbol.isAnySymbol(given) && !L_Symbol.isExistSymbol(expected))
        return true;

      return false;
    }

    function pureSingleIdentical(
      env: L_Env,
      given: L_Symbol,
      expected: L_Symbol
    ) {
      if (given instanceof L_Singleton && expected instanceof L_Singleton) {
        return given.value === expected.value;
      }

      return false;
    }

    function regexIdentical(
      env: L_Env,
      given: L_Symbol,
      expected: L_Symbol
    ): boolean {
      if (given instanceof L_Singleton && expected instanceof L_Singleton) {
        let relatedLets = env.getLetsVar(expected.value);
        if (relatedLets !== undefined) {
          if (relatedLets.regex.test(given.value)) return true;
        }
        return false;
      }
      return false;
    }
  }
}

// Used for TS API FOR USERS
export class L_UndefinedSymbol extends L_Symbol {
  constructor() {
    super();
  }

  containFormalVar(env: L_Env): FormalSymbol[] {
    throw Error();
  }

  tryVarsDeclared(env: L_Env): boolean {
    throw Error();
  }

  fix(env: L_Env, freeFixedPairs: [L_Symbol, L_Symbol][]): L_Symbol {
    throw Error();
  }
}

export class L_Singleton extends L_Symbol {
  constructor(public value: string) {
    super();
  }

  equal(symbol: L_Symbol) {
    return symbol instanceof L_Singleton && symbol.value === this.value;
  }

  withIfVarPrefix() {
    return new L_Singleton(L_KW.IfVarPrefix + this.value);
  }

  //* IMPORTANT METHOD
  tryVarsDeclared(env: L_Env): boolean {
    if (env.isSingletonDeclared(this.value)) return true;
    else throw Error(messageVarNotDeclared(this.value));
    // else {
    // return L_ReportBoolErr(
    //   env,
    //   this.varsDeclared,
    //   `Variable ${this.value} is not declared`
    // );
    // }
  }

  toString() {
    return this.value;
  }

  fix(env: L_Env, freeFixedPairs: [L_Symbol, L_Symbol][]): L_Symbol {
    for (const freeFixed of freeFixedPairs) {
      if (L_Symbol.literallyIdentical(env, freeFixed[0], this))
        return freeFixed[1];
    }
    return this;
  }
}

const ExistSymbol = new L_Singleton(L_KW.ExistSymbol);
const AnySymbol = new L_Singleton(L_KW.And);

export class IndexedSymbol extends L_Symbol {
  constructor(public given: L_Symbol, public indexes: number[]) {
    super();
  }

  tryVarsDeclared(env: L_Env): boolean {
    return this.given.tryVarsDeclared(env);
  }

  // ! IndexedSymbol fix has 2 effects: 1. fix frees 2. return the symbol under the index
  fix(env: L_Env, freeFixedPairs: [L_Symbol, L_Symbol][]): L_Symbol {
    let out: IndexedSymbol = this;

    for (const freeFixed of freeFixedPairs) {
      if (L_Symbol.literallyIdentical(env, freeFixed[0], this.given)) {
        out = new IndexedSymbol(freeFixed[1], this.indexes);
      }
    }

    return out;
  }

  toString() {
    return `${L_KW.IndexedSymbol}(${this.given}, ${this.indexes})`;
  }
}

// e.g. \frac{1,2} ; \+{1,2} ; \union{A,B} ; \set{x}
export class L_Composite extends L_Symbol {
  insideFormalSymbols: FormalSymbol[];

  constructor(public name: string, public values: L_Symbol[]) {
    super();
    this.insideFormalSymbols = this.extractInsideFormalSymbols();
  }

  private extractInsideFormalSymbols(): FormalSymbol[] {
    const out: FormalSymbol[] = [];
    for (const v of this.values) {
      if (v instanceof FormalSymbol) {
        out.push(v);
      } else if (v instanceof L_Composite) {
        out.push(...v.extractInsideFormalSymbols());
      }
    }

    return out;
  }

  getInsideFormalSymbols() {
    return this.insideFormalSymbols;
  }

  hasFormalSymbols() {
    return this.insideFormalSymbols.length !== 0;
  }

  getIndexedSubNode(indexes: number[]): L_Symbol {
    let curComposite: L_Composite = this;
    for (let i = 0; i < indexes.length - 1; i++) {
      const cur = curComposite.values[indexes[i]];
      if (cur instanceof L_Composite) curComposite = cur;
    }

    return curComposite.values[indexes[indexes.length - 1]];
  }

  compositeSatisfyItsReq(env: L_Env): boolean {
    try {
      const declaration = env.getCompositeVar(this.name);

      if (declaration === undefined) {
        env.report(`[Error] ${this.name} undeclared`);
        throw Error();
      }

      if (this.values.length !== declaration.composite.values.length) {
        env.report(`[Error] ${this.name} invalid number of parameters.`);
        throw Error();
      }

      const freeFixPairs: [L_Symbol, L_Symbol][] = LogicNode.makeFreeFixPairs(
        env,
        this.values,
        declaration.composite.values
      );

      const newFacts = declaration.facts.map((e) =>
        e.fixByIfVars(env, freeFixPairs)
      );

      for (const fact of newFacts) {
        if (checkFact(env, fact) !== L_Out.True) {
          env.report(
            `[Unknown] failed to check ${fact} when checking requirements of sub-symbols of composite ${this}`
          );
          return false;
        }
      }

      return true;
    } catch {
      return L_ReportBoolErr(env, this.compositeSatisfyItsReq, ``);
    }
  }

  compositesInside(): L_Composite[] {
    const out: L_Composite[] = [this];
    for (const v of this.values) {
      if (v instanceof L_Composite) {
        out.push(...v.compositesInside());
      }
    }
    return out;
  }

  tryVarsDeclared(env: L_Env): boolean {
    if (env.getCompositeVar(this.name) === undefined) return false;

    for (const value of this.values) {
      value.tryVarsDeclared(env);
      // if (value instanceof L_Singleton) {
      // if (!env.isSingletonDeclared(value.value)) {
      //   let ok = false;
      //   if (!ok) {
      //     throw Error(messageVarNotDeclared(value.value));
      //     return false;
      //   }
      // }
      // } else if (value instanceof L_Composite) {

      // if (!value.tryVarsDeclared(env)) {
      //   return false;
      // }
      // }
    }

    return true;
  }

  fix(env: L_Env, freeFixedPairs: [L_Symbol, L_Symbol][]): L_Symbol {
    const outValues: L_Symbol[] = [];
    for (const value of this.values) {
      const fixed = value.fix(env, freeFixedPairs);
      outValues.push(fixed);
    }

    return new L_Composite(this.name, outValues);
  }

  toString() {
    return `\\${this.name}{${this.values.map((e) => e.toString()).join(", ")}}`;
  }

  // the current symbol is free, use a fixed one to fix. the fixed and current symbol must be of the same structure.
  fixUsingGivenFixedComposite(
    env: L_Env,
    fixed: L_Composite
  ): L_Composite | undefined {
    if (!structureIdentical(env, this, fixed)) return undefined;

    const newValues: L_Symbol[] = [];
    for (const [i, v] of this.values.entries()) {
      if (v instanceof L_Singleton) continue;
      else if (v instanceof L_Composite) {
        const newV = v.fixUsingGivenFixedComposite(
          env,
          fixed.values[i] as L_Composite
        );
        if (newV !== undefined) newValues.push(newV);
        else return undefined;
      }
    }

    return new L_Composite(this.name, newValues);

    function structureIdentical(
      env: L_Env,
      expected: L_Symbol,
      candidate: L_Symbol
    ): boolean {
      if (expected instanceof L_Singleton) {
        return true;
      } else if (expected instanceof L_Composite) {
        if (
          candidate instanceof L_Composite &&
          candidate.name === expected.name &&
          candidate.values.length === expected.values.length
        ) {
          for (const [i, v] of candidate.values.entries()) {
            if (!structureIdentical(env, v, expected.values[i])) {
              return false;
            }
          }

          return true;
        }
      }

      throw Error();
    }
  }
}

export class FormalSymbol extends L_Singleton {}

export class L_OptSymbol {
  constructor(public name: string) {}

  toString() {
    return this.name;
  }
}

export enum L_Out {
  Error,
  True,
  Unknown,
  False,
}

export type ExampleItem = {
  name: string;
  code: string[];
  debug: boolean;
  print: boolean;
  // test?: string[] | undefined;
  // runTest?: boolean;
};

export abstract class L_KnownFactReq {
  constructor() {}
}

export class OptKnownFactReq extends L_KnownFactReq {
  constructor(public opt: OptFactNode) {
    super();
  }
}

export class IfKnownFactReq extends L_KnownFactReq {
  constructor(public req: L_FactNode[]) {
    super();
  }
}

export class FormulaKnownFactReq extends L_KnownFactReq {
  constructor(public req: L_FactNode[]) {
    super();
  }
}
