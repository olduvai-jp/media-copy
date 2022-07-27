import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import child_process from 'child_process';
import net from 'net';
import display from './display.mjs'
import {mountServer, umountServer, umountMedia} from './mount.mjs'

const port = "/tmp/server.sock"
const mediaQueue = []

async function createConfigFile(configFile) {
  const configObj = {
    "media_name": "media",
    "server": "example://server/hdd01/",
    "authenticate": {
      "username": "username_here",
      "password": "password_here"
    },
    "targets": {
      "include": [".mp4", ".mov", ".jpg"],
      "exclude": [""]
    },
    "delete_after_backup": "targets"
  }
  await fs.writeFile(configFile, JSON.stringify(configObj));
}

function copyAtChildProcess(srcDir, dstDir, options) {
  return new Promise((resolve, reject) => {
    const targets = options.targets;
    const deleteAfterBackup = options.delete_after_backup;

    let isReady = false
    const __dirname = path.dirname(new URL(import.meta.url).pathname)
    const child = child_process.fork(path.join(__dirname, 'child/copy.js'));
    child.on('message', (msg) => {
      switch(msg.type) {
        case 'ready':
          isReady = true
          child.send({
            srcDir,
            dstDir,
            targets,
            deleteAfterBackup
          });
          break;
        case 'progress':
          console.log(msg.data);
          display.write(msg.data);
          break;
        case 'done':
          console.log(msg.data);
          display.write(msg.data);
          //resolve();
          break;
        case 'error':
          console.error(msg.data);
          display.write(msg.data);
          reject(msg.data);
          break;
        default:
          console.log(msg);
          break;
      }
    })
    child.on('exit', (code)=> {
      resolve(code)
    })
    setTimeout(()=>{
      if(!isReady) reject("timeout")
    }, 10*1000)
  })
}

async function onReceiveAdd(mediaDir) {

  const configFile = path.join(mediaDir, 'config.json');
  let config = {};
  try {
    config = await fs.readJson(configFile);
  } catch (err) {
    console.log(err);
    display.write('Can not read config file.');
    await createConfigFile(configFile);
    return
  }

  console.log('Connecting to server...')
  display.write('Connecting to server...');
  const serverPath = "/mnt/server";
  try {
    await umountServer(serverPath)
  } catch (e) {
    // nothing
  }
  await mountServer(config.server, config.authenticate, serverPath);

  try {
    const targets = config.targets;
    const deleteAfterBackup = config.delete_after_backup;
    const mediaName = config.media_name;
    const srcDir = `${mediaDir}`;
    const dstDir = `${serverPath}/${mediaName}`;

    // create media dir if it doesn't exist
    await fs.mkdir(dstDir, { recursive: true });

    // copy at child process  
    await copyAtChildProcess(srcDir, dstDir, {
      targets,
      deleteAfterBackup
    });

  } catch (e) {
    console.error(e)
  }

  await umountServer(serverPath);
  console.log("DONE!")
  setTimeout(()=>{
    display.clear();
    display.write(`DONE!`);
  }, 5000)
}

const server = net.createServer(socket => {
  socket.on('data', async data => {
    const json = JSON.parse(data.toString())
    console.log(json)
    switch(json.method) {
      case "add":
        mediaQueue.push(json.mediaDir)
        break;
      default:
        console.log("Unknown method")
        break;
    }
  });
});

//// main ////
;(async () => {
  display.init();

  display.write("Hello!");

  try {
    fs.unlinkSync(port);
  } catch (error) {}

  server.listen(port);

  // get ip address of server
  const ifaces = os.networkInterfaces();
  for (const dev in ifaces) {
    ifaces[dev].forEach(details => {
      if (details.family === 'IPv4' && 
        (details.address !== 'localhost' && details.address !== '127.0.0.1')) {
        setTimeout(() => {
          display.write(`${details.address}`);
        }, 5000);
      }
    });
  }

  // main loop
  for(;;) {
    try {
      const mediaDir = mediaQueue.pop()
      if(mediaDir == null) {
        await new Promise((s)=>{setTimeout(s, 1000)})
        continue
      }
      await onReceiveAdd(mediaDir);
      await umountMedia(mediaDir); 
    } catch (error) {
      console.error(error)
    }
  }
})()

