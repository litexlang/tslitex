// import { on } from "events";
import { on } from "events";
import { LiTeXKeywords, OptsConnectionSymbol } from "./common";
import { LiTeXEnv } from "./env";
import {
  // _paramsInOptAreDeclared,
  // _VarsAreNotDeclared,
  hInfo,
  RInfo,
  hRunErr,
  RType,
} from "./executor";

// There are several things in LiTex: Declaration (var, fact-template) ; check; know(let); emit
export enum LiTeXNodeType {
  Error,
  Node,

  // Fact
  CallOptNode,
  CallOptsNode,

  // Operator | ImpliesFactNodes
  KnowNode,
  ExistNode,
  HaveNode,
  LetNode,
  ProofNode,
  CheckInProof,
  ImpliesFactNode,

  // Template
  InferNode,
  DefNode,

  // Helper
  FreeVarsWithFactsNode,
  DollarMarkNode,
}

export abstract class LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.Node;
  constructor() {}
}

export class CallOptNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.CallOptNode;
  optName: string = "";
  optParams: string[][] = [];
  optNameAsLst: string[] = [];
  requirements: CallOptNode[][] = [];

  constructor(opts: [string, string[]][], requirements: CallOptNode[][] = []) {
    super();

    this.optName = opts.map((e) => e[0]).join(OptsConnectionSymbol);
    this.optParams = opts.map((e) => e[1]);
    this.optNameAsLst = opts.map((e) => e[0]);
    this.requirements = requirements;
  }

  static create(name: string, params: string[][]) {
    const names = name.split(OptsConnectionSymbol);
    return new CallOptNode(names.map((e, i) => [e, params[i]]));
  }
}

export type TemplateNodeFact = {
  params: string[][];
  onlyIfs: CallOptNode[];
  requirements: CallOptNode[];
  activated: Boolean;
};
export function makeTemplateNodeFact(
  params: string[][],
  onlyIfs: CallOptNode[] = [],
  requirements: CallOptNode[] = [],
  activated: Boolean = true
) {
  return {
    params: params,
    onlyIfs: onlyIfs,
    activated: activated,
    requirements: requirements,
  };
}

// Main data structure of the whole project
export abstract class TemplateNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.InferNode;
  declOptName: string;
  freeVars: string[];
  requirements: CallOptNode[] = [];
  onlyIfExprs: LiTeXNode[] = []; // After declaration, this becomes CallOpt[]
  declaredTemplates = new Map<string, TemplateNode>();
  // facts: TemplateNodeFact[] = [];
  private fathers: TemplateNode[] = [];
  // Fix all free variables in this template, no matter it's declared in fathers or itself
  // private freeFixMap: Map<string, string> = new Map<string, string>();
  // private fixedFullParams: string[][] = [];
  isRedefine: Boolean = false;

  constructor(
    declOptName: string,
    freeVars: string[],
    requirements: CallOptNode[]
  ) {
    super();
    this.declOptName = declOptName;
    this.freeVars = freeVars;
    this.requirements = requirements;
  }

  // newFact(env: LiTeXEnv, fact: TemplateNodeFact): RInfo {
  //   if (!_paramsInOptAreDeclared(env, fact.params))
  //     return _VarsAreNotDeclared(fact);
  //   else {
  //     env.newStoredFact(fact.params, this);
  //     // this.facts.push(fact);
  //   }
  //   return hInfo(RType.True);
  // }

  // Input a full name with colons and get descendants from any depth
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

  // If a node is DollarMarkNode or TemplateNode, i.e. it is the son template of this, then it is pushed into this.declaredTemplates and it is removed from this.onlyIfExprs. If there is non-def, non-call node in block, report error
  //! REFACTOR THIS SO THAT DEF IN REQ CAN APPEAR HERE.
  initDeclaredTemplates(env: LiTeXEnv, fathers: TemplateNode[] = []): RInfo {
    this.fathers = fathers;

    // process DollarMarks
    for (let i = this.onlyIfExprs.length - 1; i >= 0; i--) {
      const value = this.onlyIfExprs[i];

      if (value instanceof DollarMarkNode) {
        this.onlyIfExprs.splice(i, 1);

        const callNode = new CallOptNode([
          [value.template.declOptName, value.template.freeVars],
        ]);
        const templateNode: TemplateNode = value.template;

        //! Here lies a problem: the templateNode's optName should start with : and anything start with : means it inherits from all above.
        this.onlyIfExprs.splice(i, 0, templateNode, callNode);
      }
    }

    // eliminate template declarations in onlyIfs, retain callOpts
    for (let i = this.onlyIfExprs.length - 1; i >= 0; i--) {
      const value = this.onlyIfExprs[i];
      if (value instanceof TemplateNode) {
        if (LiTeXKeywords.includes(value.declOptName))
          return hRunErr(
            env,
            RType.DefError,
            `Template '${value.declOptName}' is LiTeX keyword.`
          );
        value.initDeclaredTemplates(env, [...fathers, this]);
        this.declaredTemplates.set(value.declOptName, value);
        this.onlyIfExprs.splice(i, 1);
      } else if (value instanceof CallOptsNode) {
        this.onlyIfExprs = insertListIntoListAndDeleteElemOnIndex(
          this.onlyIfExprs,
          (value as CallOptsNode).nodes,
          i
        );
      }
    }

    // make sure everything is done well.
    for (let i = 0; i < this.onlyIfExprs.length; i++) {
      if (this.onlyIfExprs[i].type !== LiTeXNodeType.CallOptNode) {
        return hInfo(
          RType.DefError,
          `arguments of def block should have type callOpt-type or def-type.`
        );
      }
    }
    return hInfo(RType.DefTrue);

    function insertListIntoListAndDeleteElemOnIndex<T>(
      originalList: T[],
      itemsToInsert: T[],
      position: number
    ): T[] {
      const newList = [...originalList];
      newList.splice(position, 1, ...itemsToInsert);
      return newList;
    }
  }

  // Fix all free variables in this template, no matter it's declared in fathers or itself
  // callOptParams: the fullOpt that calls this template
  fix(
    callOptParams: CallOptNode | string[][]
  ): Map<string, string> | undefined {
    if (callOptParams instanceof CallOptNode) {
      callOptParams = callOptParams.optParams;
    }
    callOptParams = callOptParams as string[][];

    const freeFixMap = new Map<string, string>();

    const relatedTemplates = [...this.fathers, this];

    if (
      !areArraysEqual(
        callOptParams,
        relatedTemplates.map((e) => e.freeVars)
      )
    ) {
      return undefined;
    }

    for (let [i, template] of relatedTemplates.entries()) {
      template.freeVars.forEach((v, j: number) =>
        freeFixMap.set(v, callOptParams[i][j])
      );
    }

    return freeFixMap;

    function areArraysEqual(arr1: string[][], arr2: string[][]): boolean {
      if (arr1.length !== arr2.length) {
        return false;
      }

      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i].length !== arr2[i].length) {
          return false;
        }
      }

      return true;
    }
  }

  emit(
    env: LiTeXEnv,
    freeFixMap: Map<string, string>,
    fathers: string[][] = []
  ): RInfo {
    try {
      const keys = fathers.map((arr) => [...arr]);
      keys.push([...this.freeVars].map((e) => freeFixMap.get(e) || e));

      env.newStoredFact(keys, this);

      return hInfo(RType.True);
    } catch (error) {
      return hInfo(
        RType.Error,
        "error when emitting new fact into environment."
      );
    }
  }

  emitOnlyIfs(
    env: LiTeXEnv,
    freeFixMap: Map<string, string>,
    fathers: string[][] = []
  ) {
    for (let onlyIf of this.onlyIfExprs) {
      (env.getDeclaredTemplate(onlyIf as CallOptNode) as TemplateNode).emit(
        env,
        freeFixMap,
        fathers
      );
    }
  }

  emitRequirements(
    env: LiTeXEnv,
    freeFixMap: Map<string, string>,
    fathers: string[][] = []
  ) {
    for (let requirement of this.requirements) {
      const relatedTemplate = env.getDeclaredTemplate(
        requirement as CallOptNode
      ) as TemplateNode;
      if (!relatedTemplate) return false;
      relatedTemplate.emit(env, freeFixMap, fathers);
    }
    return true;
  }

  requirementsSatisfied(env: LiTeXEnv, mapping: Map<string, string>): Boolean {
    let allRequirementsAreSatisfied: Boolean = true;
    for (let requirement of this.requirements) {
      if (requirement instanceof CallOptNode) {
        const keys: string[][] = [
          ...(requirement as CallOptNode).optParams,
        ].map((sArr) => sArr.map((s) => mapping.get(s) || ""));
        let calledT = env.getDeclaredTemplate(requirement as CallOptNode);
        if (!calledT) return false;
        let res = env.isStoredTrueFact(keys, calledT);
        if (!res) {
          allRequirementsAreSatisfied = false;
          break;
        }
      }
    }
    return allRequirementsAreSatisfied;
  }
}

export class DefNode extends TemplateNode {
  type: LiTeXNodeType = LiTeXNodeType.DefNode;
}

export class InferNode extends TemplateNode {
  type: LiTeXNodeType = LiTeXNodeType.InferNode;
}

export class ExistNode extends TemplateNode {
  type = LiTeXNodeType.ExistNode;
  isTrue = false;
}

export type CanBeKnownNode = FactNode | TemplateNode | ImpliesFactNode;
export class KnowNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.KnowNode;
  facts: CanBeKnownNode[] = [];
  isKnowEverything: Boolean = false;
}

export type FactNode = CallOptNode | CallOptsNode;
export enum CallOptsNodeType {
  And,
  Or,
  Not,
}
export class CallOptsNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.CallOptsNode;
  nodes: CallOptNode[] = [];
  factType: CallOptsNodeType = CallOptsNodeType.And;

  constructor(nodes: CallOptNode[]) {
    super();
    this.nodes = nodes;
  }
}

export class LetNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.LetNode;
  vars: string[];
  properties: CallOptNode[];

  constructor(node: { freeVars: string[]; properties: CallOptNode[] }) {
    super();
    this.vars = node.freeVars;
    this.properties = node.properties;
  }
}

// Declare and call at the same time.
export class DollarMarkNode extends LiTeXNode {
  type = LiTeXNodeType.DollarMarkNode;
  template: TemplateNode;

  constructor(template: TemplateNode) {
    super();
    this.template = template;
  }
}

// export class ProveNode extends LiTeXNode {
//   type = LiTeXNodeType.ProofNode;
//   templateName: string;
//   freeVars: string[];
//   requirements: LiTeXNode[];
//   onlyIfExprs: LiTeXNode[];

//   constructor(
//     templateName: string,
//     freeVars: string[],
//     requirements: LiTeXNode[],
//     onlyIfExprs: LiTeXNode[]
//   ) {
//     super();
//     this.templateName = templateName;
//     this.freeVars = freeVars;
//     this.requirements = requirements;
//     this.onlyIfExprs = onlyIfExprs;
//   }
// }

export class YAProveNode extends LiTeXNode {
  type = LiTeXNodeType.ProofNode;
  templateNames: string[];
  vars: string[][];
  requirements: CallOptNode[][];
  onlyIfExprs: LiTeXNode[];

  constructor(
    templateNames: string[],
    vars: string[][],
    requirements: CallOptNode[][],
    onlyIfExprs: LiTeXNode[]
  ) {
    super();
    this.templateNames = templateNames;
    this.vars = vars;
    this.requirements = requirements;
    this.onlyIfExprs = onlyIfExprs;
    //! It's impossible to get template here at parsing time, because in current interpreter, we parse everything then run, which leads to empty env at parsing time.
  }
}

export class HaveNode extends LiTeXNode {
  type = LiTeXNodeType.HaveNode;
  params: string[];
  opt: CallOptNode;
  constructor(params: string[], opt: CallOptNode) {
    super();
    this.params = params;
    this.opt = opt;
  }
}

export class ImpliesFactNode extends LiTeXNode {
  type: LiTeXNodeType = LiTeXNodeType.ImpliesFactNode;
  callOpt: CallOptNode;
  requirements: CallOptNode[][] = [];
  onlyIfExprs: CallOptNode[] = [];

  constructor(
    callOpt: CallOptNode,
    onlyIfExprs: CallOptNode[],
    requirements: CallOptNode[][] = []
  ) {
    super();
    this.callOpt = callOpt;
    this.requirements = requirements;
    this.onlyIfExprs = onlyIfExprs;
  }
}
