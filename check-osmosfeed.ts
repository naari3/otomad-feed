import commandLineArgs from "command-line-args";
import * as fs from "fs";
import * as Diff from "diff";
import { exit } from "process";

const osmos = fs.readFileSync("osmosfeed.yaml", "utf-8");

const splitToSources = (lines: string[]) => {
  const sourceMap: { [k: string]: string[] } = {};
  let sources: string[] = [];
  let sourceName: string = "";
  lines.forEach((line) => {
    if (line.includes("#")) {
      if (sources.length > 0) {
        sourceMap[sourceName] = sources;
      }
      sourceName = line.split("#")[1].trim();
      sources = [];
    }
    if (line.includes("href:")) {
      const source = line.split("href:")[1].trim();
      sources.push(source);
    }
    return;
  });
  if (sources.length > 0) {
    sourceMap[sourceName] = sources;
  }
  return sourceMap;
};

const sourceMap = splitToSources(osmos.split("\n"));
let newOsmos = osmos.split("sources:")[0] + "sources:\n";
Object.entries(sourceMap).forEach(([name, sources]) => {
  const sorted = [...sources].sort((a, b) => {
    const urlA = new URL(a);
    const urlB = new URL(b);

    if (urlA.hostname === urlB.hostname) {
      return urlA.pathname < urlB.pathname ? -1 : 1;
    } else {
      return urlA.hostname.split(".")[0] < urlB.hostname.split(".")[0] ? -1 : 1;
    }
  });
  newOsmos += `  # ${name}\n`;
  sorted.forEach((source) => {
    newOsmos += `  - href: ${source}\n`;
  });
});

const options = commandLineArgs([
  { name: "fix", type: Boolean },
  { name: "lint", type: Boolean },
]);

if (options.lint) {
  if (osmos !== newOsmos) {
    console.log(Diff.createPatch("osmosfeed.yaml", osmos, newOsmos));
    exit(1);
  } else {
    exit(0);
  }
} else if (options.fix) {
  fs.writeFileSync("osmosfeed.yaml", newOsmos);
  exit(0);
} else {
  console.log(`usage: ${process.argv[0]} ${process.argv[1]} [--lint|--fix]`);
  exit(1);
}
