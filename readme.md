## shijie-fim 使用指南

#### 一、首先安装[shijie-fim](https://www.npmjs.com/package/shijie-fim)到全局

```shell
npm i shijie-fim         //window
sudo npm i shijie-fim    //mac
```

> 执行 `fim -v`后打印出版本号即为安装成功

#### 二、在自己项目的根目录中新建一个`fim.config.json`文件里面内容格式如下

```json
{
  "dev": {
    // 区分环境(开发环境)
    "exec": "yarn build", // 前置执行的操作
    "localDir": "./build", // 要上传的文件夹
    "remoteDir": "/project/fimProject", // 要上传到的远端服务器地址
    "connect": {
      "host": "**.**.**.**", // 服务器IP
      "port": 22, //   服务器端口
      "username": "root", //   连接账号
      "password": "12******22" //  连接密码
    }
  },
  "test": {
    // 区分环境(测试环境)
    "exec": "yarn build", // 前置执行的操作
    "localDir": "./build", // 要上传的文件夹
    "remoteDir": "/project/fimProject", // 要上传到的远端服务器地址
    "connect": {
      "host": "**.**.**.**", // 服务器IP
      "port": 22, //   服务器端口
      "username": "root", //   连接账号
      "password": "12******22" //  连接密码
    }
  }
}
```

#### 三、在自己项目的`package.json`文件添加一下代码

```json
{
  "name": "",
  "version": "",
  "private": true,
  "description": "",
  "scripts": {
    "publish:dev": "fim publish mode=dev",
    "publish:test": "fim publish mode=test",
    ...,
  },
  "dependencies": {
    ...
  },
  "devDependencies": {
    ...
  },
}

```

#### 四：上线时只要`yarn publish:dev`或者`yarn publish:test`
