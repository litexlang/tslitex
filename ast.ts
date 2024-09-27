import { OptsConnectionSymbol } from "./common";

// There are 3 things in LiTex: Declaration (var, fact-template) ; check; know
export enum LiTexNodeType {
  Error,
  Node,

  // Logic
  NotNode,
  OrNode,

  // Fact
  CallOptNode,
  CallOptsNode,

  // Operators
  KnowNode,
  ExistNode,
  HaveNode,
  LetNode,
  ProofNode,

  // Template
  InferNode,
  DefNode,

  // Helper
  FreeVarsWithFactsNode,
  QuestionMarkNode,
}

export class LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.Node;
  constructor() {}
}

export class CallOptNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.CallOptNode;
  optName: string = "";
  optParams: string[][] = [];
  optNameAsLst: string[] = [];

  constructor(opts: [string, string[]][]) {
    super();
    this.optName = opts.map((e) => e[0]).join(OptsConnectionSymbol);
    this.optParams = opts.map((e) => e[1]);
    this.optNameAsLst = opts.map((e) => e[0]);
  }

  getOptNameParamsPairs(): [string, string[]][] {
    return this.optNameAsLst.map((v, i) => {
      return [this.optName, this.optParams[i]];
    });
  }

  pushNewNameParamsPair(pair: [string, string[]]) {
    if (this.optName !== "") this.optName += OptsConnectionSymbol + pair[0];
    else this.optName += pair[0];

    this.optParams.push(pair[1]);
  }
}

// Main data structure of the whole project
export class TemplateNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.InferNode;
  declOptName: string;
  requirements: LiTeXNode[] = [];
  onlyIfExprs: LiTeXNode[] = [];
  declaredTemplates = new Map<string, TemplateNode>();
  facts: string[][][] = [];

  constructor(declOptName: string, requirements: LiTeXNode[]) {
    super();
    this.declOptName = declOptName;
    this.requirements = requirements;
  }

  getDeclaredSubTemplate(s: string): undefined | TemplateNode {
    const names: string[] = s.split(":");
    let curTemplate: TemplateNode | undefined = this;
    for (let i = 1; i < names.length; i++) {
      curTemplate = curTemplate?.declaredTemplates.get(names[i]);
      if (!curTemplate) {
        return undefined;
      }
    }
    return curTemplate;
  }

  initDeclaredTemplates() {
    for (let i = this.onlyIfExprs.length - 1; i >= 0; i--) {
      const value = this.onlyIfExprs[i];
      if (value instanceof TemplateNode) {
        value.initDeclaredTemplates();
        this.declaredTemplates.set(value.declOptName, value);
        this.onlyIfExprs.splice(i, 1);
      }
    }
  }
}

export class InferNode extends TemplateNode {
  type: LiTexNodeType = LiTexNodeType.InferNode;

  constructor(declOptName: string, requirements: LiTeXNode[]) {
    super(declOptName, requirements);
  }
}

export type CanBeKnownNode = FactNode | InferNode | DefNode | TemplateNode;
export class KnowNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.KnowNode;
  facts: CanBeKnownNode[] = [];
}

export class HaveNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.HaveNode;
  params: string[];
  properties: CallOptNode[];

  constructor(node: FreeVarsWithFactsNode) {
    super();
    this.params = node.params;
    this.properties = node.properties;
  }
}

export class FreeVarsWithFactsNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.FreeVarsWithFactsNode;
  params: string[];
  properties: CallOptNode[];

  constructor(params: string[], properties: CallOptNode[]) {
    super();
    this.params = params;
    this.properties = properties;
  }
}

export class ExistNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.ExistNode;
  declOptName: string = "";
  params: string[] = [];
  requirements: CallOptNode[] = [];

  constructor(
    declOptName: string,
    params: string[],
    requirements: CallOptNode[]
  ) {
    super();
    this.declOptName = declOptName;
    this.params = params;
    this.requirements = requirements;
  }
}

export class NotNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.NotNode;
  exprs: CallOptNode[] = [];

  constructor(exprs: CallOptNode[]) {
    super();
    this.exprs = exprs;
  }
}

export class OrNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.OrNode;
  blocks: CallOptNode[][] = [];
}

export type FactNode = CallOptNode;
export class CallOptsNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.CallOptsNode;
  nodes: CallOptNode[] = [];
  constructor(nodes: CallOptNode[]) {
    super();
    this.nodes = nodes;
  }
}

export class LetNode extends LiTeXNode {
  type: LiTexNodeType = LiTexNodeType.LetNode;
  params: string[];
  properties: CallOptNode[];

  constructor(node: FreeVarsWithFactsNode) {
    super();
    this.params = node.params;
    this.properties = node.properties;
  }
}

export class DefNode extends TemplateNode {
  type: LiTexNodeType = LiTexNodeType.DefNode;

  constructor(declOptName: string, requirements: LiTeXNode[]) {
    super(declOptName, requirements);
  }
}

export class QuestionMarkNode extends LiTeXNode {
  type = LiTexNodeType.QuestionMarkNode;
  template: TemplateNode;

  constructor(template: TemplateNode) {
    super();
    this.template = template;
  }
}
