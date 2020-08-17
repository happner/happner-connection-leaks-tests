/* eslint-disable no-console */
const CLIENTS_COUNT = 1;
const CLIENTS_VERSION = "10.4.0";
//const CLIENTS_VERSION = "11.3.0";
const Mesh = require('happner-2');
const delay = require('await-delay');
const clientProcesses = [];
const shell = require('shelljs');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const ChildProcess = require('child_process');
let proxyProc;

async function runTest() {
  proxyProc = await startProxy();
  console.log('starting server...');
  await startServer();
  console.log('starting clients...');
  await startClients(CLIENTS_COUNT, true);
  await restartProxy();
  await restartProxy(); 
  await restartProxy();
  await restartProxy();
  console.log('measuring reconnects...');
  measureReconnects();
}

async function restartProxy(){
  await delay(30e3);
  console.log('stopping proxy...');
  proxyProc.kill();
  await delay(30e3);
  console.log('starting proxy again...');
  proxyProc = await startProxy();
}

runTest();

async function startProxy() {
    let proxyPath = path.resolve(__dirname, './proxy/proxy.js');
    let thisProxyProc = ChildProcess.fork(proxyPath, []);
    await delay(2e3);
    return thisProxyProc;
  }

function startServer() {
    return new Promise((resolve, reject) => {
        const mesh = new Mesh();
        mesh.initialize({
            name: 'connection-leaks-tests',
            happn: {
              port: 56000,
              secure: true
            },
            modules: {
                module: {
                  instance: {
                    method1: function($happn, callback) {
                      $happn.emit('event1');
                      callback(null, 'reply1');
                    },
                    method2: function($happn, callback) {
                      $happn.emit('event2');
                      callback(null, 'reply2');
                    },
                    webmethod1: function(req, res) {
                      res.end('ok1');
                    },
                    webmethod2: function(req, res) {
                      res.end('ok2');
                    }
                  }
                }
              },
              components: {
                component: {
                  module: 'module',
                  web: {
                    routes: {
                      webmethod1: 'webmethod1',
                      webmethod2: 'webmethod2'
                    }
                  }
                }
              }
          }, function(err) {
            if (err)  return reject(err); 
            //console.log(mesh._mesh.happn.server);
            mesh.start(err => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}

async function startClients(clientCount) {
  let clientDirectory = path.resolve(__dirname, './client');
  await clientSetup(clientDirectory);
  for (let i = 0; i < clientCount; i++) {
    let clientProc = await startClientProc(clientDirectory);
    clientProcesses.push(clientProc);
  }
}

async function startClientProc(clientDirectory) {
    let clientPath = `${clientDirectory}/start`;
    let clientProc = ChildProcess.fork(clientPath, []);
    await delay(2e3);
    return clientProc;
}

async function clientSetup(clientDirectory) {
    tryUnlink(`${clientDirectory}/package.json`);
    tryUnlink(`${clientDirectory}/package-lock.json`);
    tryUnlink(`${clientDirectory}/install.sh`);

    const tplPackage = handlebars.compile(fs.readFileSync(`${clientDirectory}/package.json.hbs`).toString('utf-8'));
    fs.writeFileSync(`${clientDirectory}/package.json`, tplPackage({CLIENTS_VERSION}));

    const tplScript = handlebars.compile(fs.readFileSync(`${clientDirectory}/install.sh.hbs`).toString('utf-8'));
    fs.writeFileSync(`${clientDirectory}/install.sh`, tplScript({CLIENT_WORKING_DIRECTORY:clientDirectory}));
    fs.chmodSync(`${clientDirectory}/install.sh`, "755");

    let clientInstallPath = `${clientDirectory}/install.sh`;
    shell.exec(clientInstallPath);
    await delay(5e3);
}

function tryUnlink(path){
    try {
        fs.unlinkSync(path);
    } catch(e){
        //do nothing
    }
}

function measureReconnects() {}
