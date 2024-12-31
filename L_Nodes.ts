import { L_Env } from "./L_Env";
import { L_Keywords } from "./L_Keywords";
import { L_Composite, L_OptSymbol, L_Singleton, L_Symbol } from "./L_Structs";

export abstract class L_Node {}

export abstract class ToCheckNode extends L_Node {
  constructor(public isT: boolean) {
    super();
  }

  // called by L_Memory
  abstract varsDeclared(env: L_Env): boolean;
  // called by checker
  abstract fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): ToCheckNode;
  // called by prove_by_contradiction
  abstract copyWithIsTReverse(): ToCheckNode;
  // called by "using known fact to check given fact. when doing so, get all root opts and filter opt with the same name."
  abstract getRootOptNodes(): [OptNode, ToCheckNode[]][];
}

export abstract class LogicNode extends ToCheckNode {
  constructor(
    public vars: L_Singleton[] = [],
    public req: ToCheckNode[] = [],
    public onlyIfs: ToCheckNode[] = [],
    public env: L_Env,
    isT: boolean = true
  ) {
    super(isT);
  }

  addPrefixToVars(): boolean {
    this.vars = this.vars.map(
      (e) => new L_Singleton(L_Keywords.IfVarPrefix + e)
    );

    for (const r of this.req) {
      if (r instanceof LogicNode) {
        r.addPrefixToVars();
      }
    }

    for (const onlyIf of this.onlyIfs) {
      if (onlyIf instanceof LogicNode) {
        onlyIf.addPrefixToVars();
      }
    }

    return true;
  }

  fixUsingIfPrefix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): boolean {
    try {
      const newFreeFixPairs: [L_Symbol, L_Symbol][] = this.vars.map((e) => [
        e,
        new L_Singleton(L_Keywords.IfVarPrefix + e.value),
      ]);
      freeFixPairs = [...freeFixPairs, ...newFreeFixPairs];
      this.req = this.req.map((r) => r.fix(env, freeFixPairs));
      this.onlyIfs = this.onlyIfs.map((onlyIf) =>
        onlyIf.fix(env, freeFixPairs)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  static makeFreeFixPairs(
    env: L_Env,
    fixed: L_Symbol[],
    free: L_Symbol[]
  ): [L_Symbol, L_Symbol][] {
    const out: [L_Symbol, L_Symbol][] = [];
    for (let i = 0; i < free.length; i++) {
      out.push([free[i], fixed[i]]);
    }

    return out;
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    const roots = this.onlyIfs.map((e) => e.getRootOptNodes()).flat();
    for (const root of roots) {
      root[1] = [this, ...root[1]];
    }
    return roots;
  }

  varsDeclared(env: L_Env): boolean {
    for (const req of this.req) {
      if (!req.varsDeclared(this.env)) {
        return env.pushMessagesFromEnvReturnFalse(this.env);
      }
    }

    for (const onlyIf of this.onlyIfs) {
      if (!onlyIf.varsDeclared(this.env)) {
        return env.pushMessagesFromEnvReturnFalse(this.env);
      }
    }

    return true;
  }
}

export class IffNode extends LogicNode {
  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): LogicNode {
    const newReq: ToCheckNode[] = [];
    for (const r of this.req) {
      newReq.push(r.fix(env, freeFixPairs));
    }

    const newOnlyIf: ToCheckNode[] = [];
    for (const onlyIf of this.onlyIfs) {
      newOnlyIf.push(onlyIf.fix(env, freeFixPairs));
    }

    return new IffNode(this.vars, newReq, newOnlyIf, new L_Env(env));
  }

  override copyWithIsTReverse(): IffNode {
    return new IffNode(this.vars, this.req, this.onlyIfs, this.env, !this.isT);
  }

  override toString() {
    const mainPart = `iff ${this.vars.toString()} : ${this.req} {${
      this.onlyIfs
    }}`;
    const notPart = !this.isT ? "[not] " : "";

    return notPart + mainPart;
  }
}
export class IfNode extends LogicNode {
  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): LogicNode {
    const newReq: ToCheckNode[] = [];
    for (const r of this.req) {
      newReq.push(r.fix(env, freeFixPairs));
    }

    const newOnlyIf: ToCheckNode[] = [];
    for (const onlyIf of this.onlyIfs) {
      newOnlyIf.push(onlyIf.fix(env, freeFixPairs));
    }

    return new IfNode(this.vars, newReq, newOnlyIf, new L_Env(env));
  }

  override copyWithIsTReverse(): IfNode {
    return new IfNode(this.vars, this.req, this.onlyIfs, this.env, !this.isT);
  }

  override toString() {
    const mainPart = `if ${this.vars.toString()} : ${this.req} {${
      this.onlyIfs
    }}`;
    const notPart = !this.isT ? "[not] " : "";

    return notPart + mainPart;
  }
}

export class IfReqNode {
  constructor(public fact: ToCheckNode, public vars: L_Symbol[]) {}
}

export class OptNode extends ToCheckNode {
  constructor(
    public optSymbol: L_OptSymbol,
    public vars: L_Symbol[],
    isT: boolean = true,
    public checkVars: L_Symbol[][] | undefined = undefined
  ) {
    super(isT);
  }

  static literallyIdentical(
    env: L_Env,
    given: OptNode,
    expects: OptNode
  ): boolean {
    if (given.optSymbol.name !== expects.optSymbol.name) return false;
    return L_Symbol.symbolArrLiterallyIdentical(env, given.vars, expects.vars);
  }

  copyCommutatively(): OptNode | undefined {
    if (this.vars.length !== 2) {
      return undefined;
    }
    const newVars: L_Symbol[] = [this.vars[1], this.vars[0]];
    return new OptNode(this.optSymbol, newVars, this.isT, this.checkVars);
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    return [[this, []]];
  }

  varsDeclared(env: L_Env): boolean {
    for (const v of this.vars) {
      if (!v.varsDeclared(env)) {
        return false;
      }
    }

    if (this.checkVars === undefined) return true;

    for (const layer of this.checkVars) {
      for (const v of layer) {
        if (!v.varsDeclared(env)) {
          return false;
        }
      }
    }

    return true;
  }

  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): OptNode {
    const newVars: L_Symbol[] = [];
    for (let v of this.vars) {
      let fixed = false;
      v = v.fix(env, freeFixPairs); // if v is singleton, then fix itself; if v is composite, then fix its variables.
      if (!fixed) newVars.push(v);
    }

    return new OptNode(this.optSymbol, newVars, this.isT, undefined);
  }

  override copyWithIsTReverse(): OptNode {
    return new OptNode(this.optSymbol, this.vars, !this.isT, this.checkVars);
  }

  override toString() {
    const mainPart = "$" + this.optSymbol.name + `(${this.vars})`;
    const notPart = !this.isT ? "[not] " : "";
    const checkVarsStr =
      this.checkVars === undefined
        ? ""
        : "[" +
          this.checkVars
            .map((e) => e.map((j) => j.toString()).join(", "))
            .join("; ") +
          "]";
    return notPart + mainPart + checkVarsStr;
  }
}

export class DefNode extends L_Node {
  constructor(
    public opt: OptNode,
    public cond: ToCheckNode[], // TODO, 类似composite的要求
    public onlyIfs: ToCheckNode[],
    public commutative: boolean
  ) {
    super();
  }

  override toString(): string {
    return `${this.opt.toString()};`;
  }
}

export class KnowNode extends L_Node {
  isKnowEverything: boolean = false;

  constructor(public facts: ToCheckNode[], public names: string[]) {
    super();
  }

  override toString(): string {
    return `${L_Keywords.Know} ${this.facts};`;
  }
}

export class LetNode extends L_Node {
  constructor(public vars: string[], public facts: ToCheckNode[]) {
    super();
  }

  override toString() {
    return `${L_Keywords.Let} ${this.vars}: ${this.facts};`;
  }
}

export class LetFormalSymbolNode extends L_Node {
  constructor(public vars: string[], public facts: ToCheckNode[]) {
    super();
  }

  override toString() {
    return `${L_Keywords.LetFormal} ${this.vars}: ${this.facts};`;
  }
}

export class ProveNode extends L_Node {
  constructor(public toProve: ToCheckNode, public block: L_Node[]) {
    super();
  }

  override toString() {
    return `${L_Keywords.Prove} ${this.toProve}`;
  }
}
export class ProveContradictNode extends L_Node {
  constructor(
    public toProve: ToCheckNode,
    public block: L_Node[],
    public contradict: OptNode
  ) {
    super();
  }

  override toString() {
    return `${L_Keywords.ProveByContradiction} ${this.toProve}`;
  }
}

export class LocalEnvNode extends L_Node {
  constructor(public nodes: L_Node[], public localEnv: L_Env) {
    super();
  }

  override toString() {
    return `{${this.nodes.map((e) => e.toString()).join("; ")}}`;
  }
}

export class HaveNode extends L_Node {
  constructor(public vars: L_Singleton[], public fact: OptNode) {
    super();
  }

  override toString() {
    return `${L_Keywords.Have} ${this.vars}: ${this.fact}`;
  }
}

export class DefCompositeNode extends L_Node {
  constructor(public composite: L_Composite, public facts: ToCheckNode[]) {
    super();
  }

  toString(): string {
    return `${L_Keywords.DefComposite} ${this.composite}: ${this.facts}`;
  }
}

export class LetsNode extends L_Node {
  constructor(
    public name: string,
    public regex: RegExp,
    public facts: ToCheckNode[]
  ) {
    super();
  }

  toString() {
    return `lets ${this.name} ${this.regex} : ${this.facts
      .map((e) => e.toString())
      .join(", ")}`;
  }
}

export class IncludeNode extends L_Node {
  constructor(public path: string) {
    super();
  }

  toString() {
    return `include "${this.path}";`;
  }
}

export class DefLiteralOptNode extends L_Node {
  constructor(
    public name: string,
    public vars: L_Symbol[],
    public facts: ToCheckNode[],
    public path: string,
    public func: string
  ) {
    super();
  }
}

// export class DefFunctionalSymbolNode extends L_Node {
//   constructor(
//     public functional: FunctionalSymbol,
//     public facts: ToCheckNode[]
//   ) {
//     super();
//   }

//   toString(): string {
//     return `${L_Keywords.DefFunctional} ${this.functional}: ${this.facts}`;
//   }
// }

export class LetAliasNode extends L_Node {
  constructor(public name: L_Singleton, public toBeAliased: L_Symbol[]) {
    super();
  }

  toString() {
    return `${L_Keywords.LetAlias} ${this.name} ${this.toBeAliased}`;
  }
}

// The Followings are half implemented. --------------------------------------

export abstract class BuiltinCheckNode extends ToCheckNode {}

// TODO IsProperty logic is not implemented
export class IsPropertyNode extends BuiltinCheckNode {
  constructor(public propertyName: string, isT: boolean) {
    super(isT);
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    throw Error();
  }

  copyWithIsTReverse(): ToCheckNode {
    return new IsPropertyNode(this.propertyName, !this.isT);
  }

  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): ToCheckNode {
    return this;
  }

  toString() {
    return `${L_Keywords.isProperty}(${this.propertyName})`;
  }

  varsDeclared(env: L_Env): boolean {
    return true;
  }
}

export class IsFormNode extends BuiltinCheckNode {
  constructor(
    public candidate: L_Symbol,
    public baseline: L_Composite,
    public facts: ToCheckNode[],
    isT: boolean
  ) {
    super(isT);
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    throw Error();
  }

  copyWithIsTReverse(): ToCheckNode {
    return new IsFormNode(this.candidate, this.baseline, this.facts, !this.isT);
  }

  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): ToCheckNode {
    let fixed: L_Symbol | undefined = undefined;
    for (const freeFix of freeFixPairs) {
      if (L_Symbol.literallyIdentical(env, freeFix[0], this.candidate)) {
        fixed = freeFix[1];
      }
    }

    if (fixed === undefined) {
      env.report(`IsFormNode.fix failed`);
      throw Error();
    } else {
      return new IsFormNode(fixed, this.baseline, this.facts, this.isT);
    }
  }

  varsDeclared(env: L_Env): boolean {
    // TODO
    return true;
  }

  toString(): string {
    const notStr = this.isT ? "" : "[not]";
    const mainStr = `${L_Keywords.isForm}(${this.candidate}, ${this.baseline}, {${this.facts}})`;
    return notStr + mainStr;
  }
}

export abstract class ToCheckFormulaNode extends ToCheckNode {
  constructor(
    public left: OptNode | ToCheckFormulaNode,
    public right: OptNode | ToCheckFormulaNode,
    isT: boolean
  ) {
    super(isT);
  }

  getWhereIsGivenFactAndAnotherBranch(fact: ToCheckNode): {
    itself: FormulaSubNode;
    anotherBranch: FormulaSubNode;
  } {
    if (fact === this.left) {
      return { itself: this.left, anotherBranch: this.right };
    } else if (fact === this.right) {
      return { itself: this.right, anotherBranch: this.left };
    }

    throw Error();
  }

  varsDeclared(env: L_Env): boolean {
    return this.left.varsDeclared(env) && this.right.varsDeclared(env);
  }

  fix(env: L_Env, freeFixPairs: [L_Symbol, L_Symbol][]): ToCheckFormulaNode {
    const left = this.left.fix(env, freeFixPairs);
    const right = this.right.fix(env, freeFixPairs);
    if (this instanceof OrToCheckNode) {
      return new OrToCheckNode(left, right, this.isT);
    } else if (this instanceof AndToCheckNode) {
      return new AndToCheckNode(left, right, this.isT);
    }

    throw Error();
  }

  copyWithIsTReverse(): ToCheckNode {
    throw Error();
  }

  getLeftRight(): ToCheckNode[] {
    return [this.left, this.right];
  }

  whereIsOpt(opt: OptNode) {
    const out = { left: false, right: false };
    if (this.left instanceof OptNode) {
      if (opt.optSymbol.name === this.left.optSymbol.name) {
        out.left = true;
      }
    } else if (this.left instanceof ToCheckFormulaNode) {
      const got = this.left.whereIsOpt(opt);
      if (got.left || got.right) out.left = true;
    }

    if (this.right instanceof OptNode) {
      if (opt.optSymbol.name === this.right.optSymbol.name) {
        out.right = true;
      }
    } else if (this.right instanceof ToCheckFormulaNode) {
      const got = this.right.whereIsOpt(opt);
      if (got.left || got.right) out.right = true;
    }

    return out;
  }
}

export class OrToCheckNode extends ToCheckFormulaNode {
  copyWithIsTReverse(): ToCheckNode {
    return new OrToCheckNode(this.left, this.right, !this.isT);
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    const out: [OptNode, ToCheckNode[]][] = [];
    for (const node of this.getLeftRight()) {
      const roots = node.getRootOptNodes();
      for (const root of roots) {
        root[1] = [this, ...root[1]];
      }
      out.push(...roots);
    }
    return out;
  }

  toString() {
    return `(${this.left} or ${this.right})`;
  }

  getRootOpts(): OptNode[] | null {
    const allRoots: OptNode[] = [];
    for (const subNode of this.getLeftRight()) {
      if (subNode instanceof OrToCheckNode) {
        const roots = subNode.getRootOpts();
        if (roots === null) {
          return null;
        } else {
          allRoots.push(...roots);
        }
      } else if (subNode instanceof OptNode) {
        allRoots.push(subNode);
      } else {
        return null;
      }
    }

    return allRoots;
  }
}

export class AndToCheckNode extends ToCheckFormulaNode {
  copyWithIsTReverse(): ToCheckNode {
    return new AndToCheckNode(this.left, this.right, !this.isT);
  }

  getRootOptNodes(): [OptNode, ToCheckNode[]][] {
    const out: [OptNode, ToCheckNode[]][] = [];
    for (const node of this.getLeftRight()) {
      const roots = node.getRootOptNodes();
      for (const root of roots) {
        root[1] = [this, ...root[1]];
      }
      out.push(...roots);
    }
    return out;
  }

  toString() {
    return `(${this.left} and ${this.right})`;
  }
}

export type FormulaSubNode = ToCheckFormulaNode | OptNode;
