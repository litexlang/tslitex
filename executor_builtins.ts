import { CallOptNode } from "./ast";
import { LiTeXEnv } from "./env";
import { catchRuntimeError, ResultType } from "./executor";

export const builtInCallOptNames: { [key: string]: Function } = {
  is_infer: isInferFunc,
};

export function isInferFunc(env: LiTeXEnv, node: CallOptNode): ResultType {
  try {
    if (node.optParams[0].length !== 1) {
      throw new Error("isDef has one parameter, get too many inputs");
    }

    const name: string = node.optParams[0][0];
    if (env.keyInDefs(name)) {
      return ResultType.True;
    } else {
      return ResultType.False;
    }
  } catch (error) {
    catchRuntimeError(env, error, "is_infer");
    return ResultType.Error;
  }
}
