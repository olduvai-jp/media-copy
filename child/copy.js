const os = require('os');
const path = require('path')
const fs = require('fs-extra');
const klawSync = require('klaw-sync');
const { performance } = require('node:perf_hooks');
const { exit } = require('node:process');

function sendProgress(progress) {
  process.send({
    type: 'progress',
    data: progress
  });
  //console.log(progress)
}

process.on("message", function (msg) {
  const srcDir = msg.srcDir;
  const dstDir = msg.dstDir;
  const include = msg.targets.include;
  const deleteAfterBackup = msg.deleteAfterBackup

  // find include files
  let files = klawSync(srcDir, { nodir: true });

  const includeFiles = files.filter(file => {
    const str = file.path.toLowerCase()
    for(const ext of include) {
      if(str.includes(ext)) return true
    }
    return false
  });
  
  sendProgress(`Found ${includeFiles.length} files. Copying...`);
  
  // copy include files to dstDir
  const startTime = performance.now();
  let prevTime = startTime;
  let sumOfMBytes = 0;
  for (let i = 0; i < includeFiles.length; i++) {
    const srcFile = includeFiles[i].path;
    const dstFile = path.join(dstDir, path.relative(srcDir, srcFile));
    fs.copySync(srcFile, dstFile);

    const bytesize = includeFiles[i].stats.size;
    const size = bytesize / 1024 / 1024;
    const currentTime = performance.now();
    const speed = (size / (currentTime - prevTime)) * 1000;
    sumOfMBytes += size
    prevTime = currentTime
    sendProgress(`${i+1}/${includeFiles.length}:${speed.toFixed(2)} MB/s`);
  }
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000 / 60;
  process.send({
    type: 'done',
    data: `Copied ${includeFiles.length} files in ${totalTime.toFixed(1)} [min].\nTotal: ${sumOfMBytes.toFixed(2)} MB`
  });
  exit(0);
});

setTimeout(()=>{
  process.send({
    type: 'ready'
  });
}, 1000)
