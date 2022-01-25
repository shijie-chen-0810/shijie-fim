const events = require("events");
const Client = require("ssh2").Client;
const fs = require("fs");
const ora = require("ora");
const chalk = require("chalk");
const path = require("path");

const print = ora();
/**
 * 描述：控制上传或者下载一个一个的执行
 */
class Control extends events.EventEmitter {
  constructor(props) {
    super(props);
    events.EventEmitter.call(this);
    this.listenEvent();
  }
  listenEvent() {
    this.on("donext", (todos, then) => {
      if (todos.length > 0) {
        const func = todos.shift();
        func((err, result) => {
          if (err) {
            throw err;
          } else {
            this.emit("donext", todos, then);
          }
        });
      } else {
        then(null);
      }
    });
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new Control();
    }
    return this._instance;
  }
}

/**
 * 描述：连接远程电脑
 * @param {object} server 远程电脑凭证
 * @param {function} then then(conn) 连接远程的client对象
 */
function Connect(server, then) {
  const conn = new Client();
  conn
    .on("ready", function () {
      then(conn);
    })
    .on("error", function (err) {
      //console.log("connect error!");
    })
    .on("end", function () {
      //console.log("connect end!");
    })
    .on("close", function (had_error) {
      //console.log("connect close");
    })
    .connect(server);
}

/**
 * 描述：运行shell命令
 * @param {object} server 远程电脑凭证
 * @param {string} cmd 执行的命令
 * @param {function} then 回调：then(err, data) ： data 运行命令之后的返回数据信息
 */
function Shell(server, cmd, then) {
  Connect(server, function (conn) {
    conn.shell(function (err, stream) {
      if (err) {
        then(err);
      } else {
        // end of if
        let buf = "";
        stream
          .on("close", function () {
            conn.end();
            then(err, buf);
          })
          .on("data", function (data) {
            buf = buf + data;
          })
          .stderr.on("data", function (data) {
            console.log("stderr: " + data);
          });
        stream.end(cmd);
      }
    });
  });
}

/**
 * 描述：上传文件
 * @param {object} server 远程电脑凭证
 * @param {string} localPath 本地路径
 * @param {string} remotePath 远程路径
 * @param {Function} then 回调函数
 */
function UploadFile(server, localPath, remotePath, then) {
  Connect(server, function (conn) {
    conn.sftp(function (err, sftp) {
      if (err) {
        then(err);
      } else {
        sftp.fastPut(localPath, remotePath, function (err, result) {
          print.succeed(
            chalk.gray(
              "本地文件:" + localPath + "\n" + "远端地址:" + remotePath
            )
          );
          conn.end();
          then(err, result);
        });
      }
    });
  });
}

/**
 * 描述：下载文件
 * @param {object} server 远程电脑凭证
 * @param {string} remotePath 远程路径
 * @param {string} localPath 本地路径
 * @param {Function} then 回调函数
 */
function DownloadFile(server, remotePath, localPath, then) {
  Connect(server, function (conn) {
    conn.sftp(function (err, sftp) {
      if (err) {
        then(err);
      } else {
        sftp.fastGet(remotePath, localPath, function (err, result) {
          if (err) {
            then(err);
          } else {
            conn.end();
            then(err, result);
          }
        });
      }
    });
  });
}

/**
 *
 * @param {object} server 远程电脑凭证
 * @param {string} remotePath 远程路径
 * @param {Function} then 回调函数
 */
function ReadRemoteFile(server, remotePath, then) {
  Connect(server, (conc) => {
    conc.exec(`cat ${remotePath}`, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code, signal) => {
          conc.end();
        })
        .on("data", (data) => {
          then(data);
        });
    });
  });
}

/**
 * 描述：获取远程文件路径下文件列表信息
 * @param {object} server 远程电脑凭证；
 * @param {string} remotePath 远程路径
 * @param {boolean} isFile 是否是获取文件，true获取文件信息，false获取目录信息
 * @param {function} then then(err, dirs) ： dir, 获取的列表信息
 */
function GetFileOrDirList(server, remotePath, isFile, then) {
  const cmd =
    "find " +
    remotePath +
    " -type " +
    (isFile == true ? "f" : "d") +
    "\r\nexit\r\n";
  Shell(server, cmd, function (err, data) {
    let arr = [];
    const remoteFile = [];
    arr = data.split("\r\n");
    arr.forEach(function (dir) {
      if (dir.indexOf(remotePath) == 0) {
        remoteFile.push(dir);
      }
    });
    then(err, remoteFile);
  });
}

/**
 * 描述：下载目录到本地
 * @param {object} server 远程电脑凭证；
 * @param {string} remoteDir 远程路径；
 * @param {string} localDir 本地路径
 * @param {function} then 回调函数then(err)
 */
function DownloadDir(server, remoteDir, localDir, then) {
  GetFileOrDirList(server, remoteDir, false, function (err, dirs) {
    if (err) {
      throw err;
    } else {
      GetFileOrDirList(server, remoteDir, true, function (err, files) {
        if (err) {
          throw err;
        } else {
          dirs.shift();
          dirs.forEach(function (dir) {
            const tmpDir = path
              .join(localDir, dir.slice(remoteDir.length + 1))
              .replace(/[//]\g/, "\\");
            // 创建目录
            fs.mkdirSync(tmpDir);
          });
          const todoFiles = [];
          files.forEach(function (file) {
            const tmpPath = path
              .join(localDir, file.slice(remoteDir.length + 1))
              .replace(/[//]\g/, "\\");
            todoFiles.push(function (done) {
              DownloadFile(server, file, tmpPath, done);
              console.log("downloading the " + file);
            });
          });
          Control.getInstance().emit("donext", todoFiles, then);
        }
      });
    }
  });
}
/**
 * 描述：获取windows上的文件目录以及文件列表信息
 * @param {string} localDir 本地路径
 * @param {string[]} dirs 存放的目录列表
 * @param {string[]} files 存放的文件列表
 */
function GetFileAndDirList(localDir, dirs, files) {
  const dir = fs.readdirSync(localDir);
  for (let i = 0; i < dir.length; i++) {
    const p = path.join(localDir, dir[i]);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      dirs.push(p);
      GetFileAndDirList(p, dirs, files);
    } else {
      files.push(p);
    }
  }
}

/**
 *描述：上传文件夹到远程目录
 * @param {object} server 远程电脑凭证
 * @param {string} localDir 本地路径
 * @param {string} remoteDir 远程路径
 * @param {function} then 回调函数:then(err)
 */
function UploadDir(server, localDir, remoteDir, then) {
  const dirs = [];
  const files = [];
  GetFileAndDirList(localDir, dirs, files);

  // 创建远程目录
  const todoDir = [];
  dirs.forEach(function (dir) {
    todoDir.push(function (done) {
      const to = path
        .join(remoteDir, dir.slice(localDir.length + 1))
        .replace(/[\\]/g, "/");
      const cmd = "mkdir -p " + to + "\r\nexit\r\n";
      Shell(server, cmd, done);
    });
  });

  // 上传文件
  const todoFile = [];
  files.forEach(function (file) {
    todoFile.push(function (done) {
      const to = path
        .join(remoteDir, file.slice(localDir.length + 1))
        .replace(/[\\]/g, "/");
      UploadFile(server, file, to, done);
    });
  });

  Control.getInstance().emit("donext", todoDir, function (err) {
    if (err) {
      throw err;
    } else {
      Control.getInstance().emit("donext", todoFile, then);
    }
  });
}

/**
 *描述：查找目录下所有文件
 * @param {string} folderPath 本地文件夹的绝对路径
 * @returns 该文件夹下的所有文件
 */
function mapFolderPath(folderPath) {
  let fileList = fs.readdirSync(folderPath);
  const getFileList = (fileList, route) => {
    let _fileName = fileList.shift();
    let resultUrl = [];
    if (!_fileName) return resultUrl;
    let routeResult = !!route ? `${route}/${_fileName}` : _fileName;
    let isDirectory = fs
      .statSync(path.join(folderPath, routeResult))
      .isDirectory();
    if (isDirectory) {
      let subFiles = fs.readdirSync(path.join(folderPath, routeResult));
      if (subFiles.length > 0) {
        resultUrl = resultUrl.concat(getFileList(subFiles, routeResult));
      }
    } else {
      resultUrl.push(routeResult);
    }
    resultUrl = resultUrl.concat(getFileList(fileList, route));
    return resultUrl;
  };
  const fileListResult = getFileList(fileList);
  return fileListResult;
}
module.exports = {
  mapFolderPath,
  Connect,
  Shell,
  UploadFile,
  DownloadFile,
  GetFileOrDirList,
  DownloadDir,
  UploadDir,
  ReadRemoteFile,
};
