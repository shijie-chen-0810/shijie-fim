#!/usr/bin/env node

const { execSync } = require("child_process");
const program = require("commander");
const { Connect, UploadDir } = require("./utils");
const path = require("path");
const moment = require("moment");
const ora = require("ora");
const chalk = require("chalk");
const pkg = require("./package.json");

const spinner = ora();
program
  .version(pkg.version, "-v, --version")
  .option("publish --publish <arg>", "必要参数")
  .option("notNecessary --notNecessary [arg]", "非必要参数")
  .parse(process.argv);
if (program.publish) {
  const config = require(process.cwd() + "/fim.config.json");
  const mode = program.publish.split("=")[1];

  const envConfig = config[mode];
  const beforeExec = envConfig["exec"];
  const connectOpt = envConfig["connect"];

  spinner.info(chalk.green("开始打包"));

  const execResult = execSync(beforeExec, { stdio: "inherit" });
  const localDir = path.resolve(process.cwd(), envConfig["localDir"]);
  const remoteDir = envConfig["remoteDir"];
  if (!execResult) {
    Connect(connectOpt, (conc) => {
      const time = moment().format("YYYYMMDD-HH:mm");
      conc.exec(`cp -r ${remoteDir} ${remoteDir}-${time}`, () => {
        spinner.succeed(chalk.green(`备份完成,版本号为:${chalk.yellow(time)}`));
        conc.end();
        spinner.info(chalk.green("开始上传文件"));
        UploadDir(connectOpt, localDir, remoteDir, () => {
          spinner.succeed(chalk.green(`上传完成`));
        });
      });
    });
  }
}
