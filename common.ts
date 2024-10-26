export const specialChars = [
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ":",
  ",",
  ";",
  "\n",
  "!",
  "&",
  "|",
  "$",
];

export const KnowTypeKeywords = ["know", "assume"];
export const ThenKeywords = ["then", "=>"];
export const OnlyIfThenKeywords = ["<="];
export const IffThenKeywords = ["<=>"];
export const IfKeywords = ["if"];
export const OnlyIfKeywords = ["only_if"];
export const IffKeywords = ["iff"];
export const ExistKeywords = ["exist"];
export const DefKeywords = ["def"];

export const SymbolsFactsSeparator = "|";
export const ProveKeywords = ["prove"];
export const suchThats = ["st", "is"];

export const StdStmtEnds = [";", "\n"];
export const LetKeywords = ["let"];
export const HaveKeywords = ["have"];

export const AssumeByContraKeywords = ["assume_by_contradiction"];

export const IsKeywords = ["is"];
export const AreKeywords = ["are"];
export const IsAreKeywords = [...IsKeywords, ...AreKeywords];
export const NotKeywords = ["not"];
export const OrKeywords = ["or"];

export const L_Keywords: string[] = [
  "#",
  ...specialChars,
  ...KnowTypeKeywords,
  ...ThenKeywords,
  ...OnlyIfThenKeywords,
  ...IffThenKeywords,
  ...IfKeywords,
  ...OnlyIfKeywords,
  ...IffKeywords,
  ...ExistKeywords,
  ...DefKeywords,
  ...ProveKeywords,
  ...suchThats,
  ...StdStmtEnds,
  ...LetKeywords,
  ...HaveKeywords,
  ...AssumeByContraKeywords,
  ...IsKeywords,
  ...AreKeywords,
  ...NotKeywords,
  ...OrKeywords,
];

export const LogicalOptPairs: { [k: string]: string[] } = {
  if: ThenKeywords,
  iff: IffThenKeywords,
  onlyIf: OnlyIfThenKeywords,
};

export const LogicalKeywords = [
  ...IfKeywords,
  ...OnlyIfKeywords,
  ...IffKeywords,
];
