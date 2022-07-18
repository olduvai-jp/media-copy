import fs from 'fs-extra';
import child_process from 'child_process';
import util from 'util';
const exec = util.promisify(child_process.exec);

export async function mountServer(server, auth, mountPath) {
  
  const method = server.split(':')[0];

  // Create mount path if it doesn't exist
  await fs.mkdir(mountPath, { recursive: true });

  switch(method) {
    case 'smb':
      const url = server.split(':')[1];
      console.log(url)
      await exec(`mount -t cifs -o user=${auth.username},password=${auth.password} ${url} ${mountPath}`);
      break;
    default:
      console.log(`Unsupported method: ${method}`);
      break;
  }
  return mountPath;
}

export async function umountServer(serverPath) {
  await exec(`umount ${serverPath}`);
}

export async function umountMedia(mediPath) {
  await exec(`media-umount ${mediPath}`);
}

export default {
  mountServer,
  umountServer,
  umountMedia
}