import { L_Env } from "./L_Env";

export abstract class L_Node {}

export class FactNode extends L_Node {
  useName: string = "";

  constructor(public isT: Boolean) {
    super();
  }

  varsDeclared(env: L_Env, freeVars: string[]): Boolean {
    return false;
  }
  factsDeclared(env: L_Env): Boolean {
    return false;
  }

  useMapToCopy(map: Map<string, string>): FactNode {
    return new FactNode(true);
  }
}

export class OrNode extends FactNode {
  constructor(
    public facts: FactNode[],
    isT: Boolean = true
  ) {
    super(isT);
  }

  varsDeclared(env: L_Env): Boolean {
    return false;
  }
  factsDeclared(env: L_Env): Boolean {
    return false;
  }
}

export class LogicalOptNode extends FactNode {
  constructor(
    public vars: string[] = [],
    public req: FactNode[] = [],
    //! I think we should onlyIfs: FactNode[] because despite we can not store if-then
    //! we can still check it.
    public onlyIfs: FactNode[] = [],
    isT: Boolean = true,
    public byName: undefined | string = undefined
  ) {
    super(isT);
  }

  useMapToCopy(map: Map<string, string>): FactNode {
    const newVars = [...this.vars];
    const req = this.req.map((e) => e.useMapToCopy(map));
    const onlyIfs = this.onlyIfs.map((e) => e.useMapToCopy(map));

    if (this instanceof IfThenNode)
      return new IfThenNode(newVars, req, onlyIfs, this.isT, this.byName);

    throw Error();
  }

  toString() {
    let type: string = "";
    let separator = "";
    if (this instanceof IffNode) {
      type = "iff";
      separator = "<=>";
    } else if (this instanceof IfThenNode) {
      type = "if";
      separator = "=>";
    } else if (this instanceof OnlyIfNode) {
      type = "only_if";
      separator = "<=";
    }

    const mainPart = `${type} ${this.vars.toString()} | ${this.req.map((e) => e.toString()).join(", ")} ${separator} {${this.onlyIfs.map((e) => e.toString()).join(", ")}}`;
    const useNamePart = this.useName !== "" ? `[${this.useName}]` : "";
    const notPart = !this.isT ? "[not] " : "";

    return notPart + mainPart + useNamePart;
  }

  // static create(
  //   type: string,
  //   vars: string[],
  //   req: FactNode[],
  //   onlyIfs: FactNode[]
  // ): LogicalOptNode {
  //   if (IfKeywords.includes(type)) {
  //     return new IfThenNode(vars, req, onlyIfs);
  //   } else if (IffKeywords.includes(type)) {
  //     return new IffNode(vars, req, onlyIfs);
  //   } else if (OnlyIfKeywords.includes(type)) {
  //     return new OnlyIfNode(vars, req, onlyIfs);
  //   }
  //   throw Error();
  // }

  varsDeclared(env: L_Env, freeVars: string[]): Boolean {
    return [...this.req, ...this.onlyIfs].every((e) =>
      e.varsDeclared(env, this.vars)
    );
  }

  factsDeclared(env: L_Env): Boolean {
    return [...this.req, ...this.onlyIfs].every((e) => e.factsDeclared(env));
  }
}

export class IfThenNode extends LogicalOptNode {}
export class OnlyIfNode extends LogicalOptNode {}
export class IffNode extends LogicalOptNode {}

export class OptNode extends FactNode {
  constructor(
    public fullName: string,
    public vars: string[],
    isT: Boolean = true
  ) {
    super(isT);
  }

  useMapToCopy(map: Map<string, string>): OptNode {
    const newVars: string[] = [];
    for (const v of this.vars) {
      const fixed = map.get(v);
      if (fixed === undefined) throw Error();
      else {
        newVars.push(fixed);
      }
    }
    return new OptNode(this.fullName, newVars, this.isT);
  }

  toString() {
    const mainPart = this.fullName + `(${this.vars.join(", ")})`;
    const useNamePart = this.useName !== "" ? `[${this.useName}]` : "";
    const notPart = !this.isT ? "[not] " : "";
    return notPart + mainPart + useNamePart;
  }

  // hashVars(varsToHash: string[]) {
  //   //! CONVENTION: NEVER INTRODUCE ANY VARIABLE WITH ## PREFIX
  //   this.vars = this.vars.map((s) =>
  //     varsToHash.includes(s) ? (s.startsWith("#") ? s : "#" + s) : s
  //   );
  //   // this.vars = this.vars.map((s) => (varsToHash.includes(s) ? "#" + s : s));
  // }

  // rmvHashFromVars(varsToHash: string[]): void {
  //   this.vars = this.vars.map((s) =>
  //     varsToHash.includes(s.slice(1)) && s[0] === "#" ? s.slice(1) : s
  //   );
  // }

  // replaceVars(mapping: Map<string, string>): void {
  //   this.vars.forEach((v, i) => {
  //     const fixed = mapping.get(v);
  //     if (fixed !== undefined) this.vars[i] = fixed;
  //   });
  // }

  varsDeclared(env: L_Env, freeVars: string[]): Boolean {
    for (const v of this.vars) {
      const declared = env.varDeclared(v) || freeVars.includes(v);
      if (!declared) {
        env.newMessage(`${v} not declared in ${this.fullName}`);
        return false;
      }
    }
    return true;
  }

  factsDeclared(env: L_Env): Boolean {
    if (env.optDeclared(this.fullName)) {
      return true;
    } else {
      env.newMessage(`${this.fullName} not declared.`);
      return false;
    }
  }
}

export class DeclNode extends L_Node {
  constructor(
    public name: string = "",
    public vars: string[] = [],
    public req: FactNode[] = [],
    public onlyIfs: FactNode[] = [],
    public byName: string | undefined = undefined
  ) {
    super();
  }

  // static create(name: string, node: LogicalOptNode): DeclNode {
  //   if (node instanceof IfThenNode) {
  //     return new IfThenDeclNode(name, node.vars, node.req, node.onlyIfs);
  //   } else if (node instanceof IffNode) {
  //     return new IffDeclNode(name, node.vars, node.req, node.onlyIfs);
  //   } else if (node instanceof OnlyIfNode) {
  //     return new OnlyIfDeclNode(name, node.vars, node.req, node.onlyIfs);
  //   }
  //   throw Error();
  // }

  toString() {
    if (this instanceof IfThenDeclNode)
      return `def if ${this.name}(${this.vars})`;
    else if (this instanceof IffDeclNode)
      return `def iff ${this.name}(${this.vars})`;
    else if (this instanceof OnlyIfDeclNode)
      return `def only_if ${this.name}(${this.vars})`;
    else return `Declaration Error`;
  }
}

export class IffDeclNode extends DeclNode {}
export class IfThenDeclNode extends DeclNode {}
export class OnlyIfDeclNode extends DeclNode {}

export class KnowNode extends L_Node {
  isKnowEverything: Boolean = false;

  constructor(public facts: FactNode[] = []) {
    super();
  }

  toString(): string {
    return (
      "know: " + this.facts.map((e) => (e as FactNode).toString()).join("; ")
    );
  }
}

export class LetNode extends L_Node {
  constructor(
    public vars: string[],
    public facts: FactNode[]
  ) {
    super();
  }

  toString() {
    return `${this.vars.join(", ")}| ${this.facts.map((s) => s.toString()).join(", ")}`;
  }
}

export class ProveNode extends L_Node {
  constructor(
    // Only one of toProve, fixedIfThenOpt exists
    public toProve: IfThenNode | null,
    public fixedIfThenOpt: OptNode | null,
    public block: L_Node[],
    // If contradict !== undefined, then prove_by_contradiction
    public contradict: OptNode | undefined = undefined
  ) {
    super();
  }

  toString() {
    if (this.toProve) return `prove ${this.toProve}`;
    else return `prove ${this.fixedIfThenOpt}`;
  }
}

export class HaveNode extends L_Node {
  constructor(
    public vars: string[],
    public facts: OptNode[]
  ) {
    super();
  }

  toString() {
    return `${this.vars.join(", ")}| ${this.facts.map((s) => s.toString()).join(", ")}`;
  }
}

export class PostfixProve extends L_Node {
  constructor(
    public facts: FactNode[],
    public block: L_Node[]
  ) {
    super();
  }
}

export class LocalEnvNode extends L_Node {
  constructor(public nodes: L_Node[]) {
    super();
  }

  toString() {
    return `{${this.nodes.map((e) => e.toString()).join("; ")}}`;
  }
}

export class ReturnNode extends L_Node {
  constructor(public facts: FactNode[]) {
    super();
  }
}

export class ReturnExistNode extends L_Node {
  constructor(public factNames: string[]) {
    super();
  }
}

export class ExistNode extends L_Node {
  constructor(public facts: OptNode[]) {
    super();
  }
}

export class ByNode extends L_Node {
  constructor(
    public byName: string,
    public vars: string[],
    public onlyIfs: FactNode[]
  ) {
    super();
  }

  toString() {
    return `${this.byName}(${this.vars.join(", ")}) is valid`;
  }
}
