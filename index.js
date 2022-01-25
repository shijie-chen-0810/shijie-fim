#!/usr/bin/env node

const { execSync } = require("child_process");
const program = require("commander");
const {
  Connect,
  UploadDir,
  GetFileOrDirList,
  ReadRemoteFile,
} = require("./utils");
const path = require("path");
const fs = require("fs");
const ora = require("ora");
const chalk = require("chalk");
const pkg = require("./package.json");

const spinner = ora();
program
  .version(pkg.version, "-v, --version")
  .option("publish --publish <arg>", "mode=环境")
  .option("revert --revert [arg]", "回滚的次数")
  .parse(process.argv);

// 发布版本
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
    GetFileOrDirList(connectOpt, remoteDir, true, (res, remoteFile) => {
      const versionFile = remoteFile.includes(
        path.join(remoteDir, "/version.json")
      );
      if (versionFile) {
        ReadRemoteFile(
          connectOpt,
          path.join(remoteDir, "/version.json"),
          (res) => {
            const { version: versionList, ...other } = JSON.parse(String(res));
            const nowVersion = Number(
              ([...versionList].pop() + 0.1).toFixed(1)
            );
            Connect(connectOpt, (conc) => {
              conc.exec(`cp -r ${remoteDir} ${remoteDir}-${nowVersion}`, () => {
                spinner.succeed(
                  chalk.green(`备份完成,版本号为:${chalk.yellow(nowVersion)}`)
                );
                conc.end();
                // 写入上一个版本信息
                fs.writeFileSync(
                  path.join(localDir, "/version.json"),
                  JSON.stringify({
                    ...other,
                    version: versionList.concat(nowVersion),
                  })
                );
                spinner.info(chalk.green("开始上传文件"));
                UploadDir(connectOpt, localDir, remoteDir, () => {
                  spinner.succeed(chalk.green(`上传完成`));
                  fs.unlinkSync(path.join(localDir, "/version.json"));
                });
              });
            });
          }
        );
      } else {
        fs.writeFileSync(
          path.join(localDir, "/version.json"),
          JSON.stringify({
            version: [1.0],
          })
        );
        spinner.info(chalk.green("开始上传文件"));
        UploadDir(connectOpt, localDir, remoteDir, () => {
          spinner.succeed(chalk.green(`上传完成`));
          fs.unlinkSync(path.join(localDir, "/version.json"));
        });
      }
    });
  }
}

// 版本回退
if (program.revert) {
  const config = require(process.cwd() + "/fim.config.json");
  const mode = program.revert.split("=")[1];

  const envConfig = config[mode];
  const connectOpt = envConfig["connect"];
  const remoteDir = envConfig["remoteDir"];

  ReadRemoteFile(connectOpt, path.join(remoteDir, "/version.json"), (res) => {
    const { version: versionList } = JSON.parse(String(res));
    const preVersion = versionList[versionList.length - 1];
    Connect(connectOpt, (conc) => {
      conc.exec(`\\cp -rf ${remoteDir}-${preVersion}/* ${remoteDir}`, () => {
        spinner.succeed(
          chalk.green(`回滚完成,已回滚到${chalk.yellow(preVersion)}版本`)
        );
        conc.exec(`rm -rf ${remoteDir}-${preVersion}`, () => {
          spinner.succeed(
            chalk.green(`删除历史${chalk.yellow(preVersion)}版本成功`)
          );
          conc.end();
        });
      });
    });
  });
}
