import { L_Env } from "./L_Env";
import { runFile, runString } from "./L_Runner";

function L_REPL(files: string[]) {
  const env = new L_Env(undefined);
  console.log("LiTeX 0.0.1\n");
  console.log(
    `More information about LiTeX is available at <https://github.com/litexlang/tslitex>\n`,
  );
  console.log(`Exit by inputting 'exit'\n`);

  if (process.argv.length > 2) {
    const fileName = process.argv[2];
    runFile(env, fileName, true, false);
  }

  for (const fileName of files) {
    runFile(env, fileName, true, false);
  }

  while (true) {
    const expr = prompt(">");
    if (expr === "exit") {
      console.log("See you later.");
      break;
    }
    if (expr === null) continue;
    runString(env, expr, true, false);
  }
}

L_REPL([]);
