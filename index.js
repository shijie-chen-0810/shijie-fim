#!/usr/bin/env node

const program = require("commander");
const pkg = require("./package.json");

program
  .version(pkg.version)
  .option("-n, --yourname [yourname]", "Your name")
  .option("-g, --glad", "Tell us you are happy")
  .parse(process.argv);

if (program.yourname) {
  console.log(
    `Hello, ${program.yourname}! ${
      program.glad ? "I am very happy to see you!" : ""
    }`
  );
}
