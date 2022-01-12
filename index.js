#!/usr/bin/env node

const program = require("commander");
const pkg = require("./package.json");

program
  .version(pkg.version, "-v, --version")
  .option("necessary --necessary <arg>", "必要参数")
  .option("notNecessary --notNecessary [arg]", "非必要参数")
  .parse(process.argv);
if (program.publish) {
}
