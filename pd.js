// ↓settings:
const threashold = 1000000; // file over this size (in bytes) will be deleted.
// ↑settings:

const readline = require('readline'); // the native package that does prompts
const fs = require('fs');
const path = require('path');

printHeader();

class File { // a case of File is an actual file, to construct, pass in its path and its name
  constructor(dir, name) {
    this.dir = dir;
    this.name = name;
  }
  get fullname() {
    return path.join(this.dir, this.name);
  }
  get size() {
    return fs.statSync(this.fullname).size;
  }
  static toReadableSize(bytes) { // convert file size in bytes to human readable format
    if (bytes < 1000)
      return bytes + 'B'; // separate it out because integers don't have .toFixed()
    for (let i of ['KB', 'MB', 'GB', 'TB']) {
      bytes /= 1000;
      if (bytes < 1000)
        return bytes.toFixed(1) + i;
    }
    return bytes.toFixed(1) + 'TB';
  }
  get readableSize() {
    return File.toReadableSize(this.size);
  }
  get displayInfo() {
    var space = 7 - this.readableSize.length;
    return ' '.repeat(space) + this.readableSize + '  '+ this.name ;
  }
  isFolder() {
    return fs.statSync(this.fullname).isDirectory();
  }
  delete() {
    fs.writeFile(this.fullname, '', (err) => {
      if (err) throw err;
    });
  }
}

class BigFileList { // a case of BigFileList is an array of big files (bigger than the threshold to be deleted), to construct, pass in array of Files
  constructor(fileList) {
    this.fileList = fileList;
  }
  get length() {
    return this.fileList.length;
  }
  get totalSize() {
    return this.fileList.reduce((accumulator, item) => accumulator + item.size, 0);
  }
  showFiles() {
    console.log('');
    this.fileList.forEach((file, index) => {
      console.log(`  #${String(index + 1).padStart(2,'0')} ${file.displayInfo}`);
    });
  }
  deleteAll() {
    for (let i of this.fileList)
      i.delete();
    console.log(`\n- ${this.length} files phantom-deleted.`);
  }
}

var CLI = readline.createInterface({ // got this part from node docs - readline
    input: process.stdin,
    output: process.stdout
  });

run();

async function run() {
  try {
    var dir = await question('Which folder do you want to perform phantom-delete on? Drag the folder into here:\n');
    dir = dir.trim(); // in some terminals, dragging creates space in the end
    if (dir[0] == dir.slice(-1) && (dir[0] == "'" || dir[0] == '"')) // when there's space in the path, some terminals auto add quotes, resulting in strings with redundant quotes
      dir = dir.slice(1, -1);
    var bigFiles = new BigFileList([]); // the object that stores the to-be-deleted files
    var fileList = fs.readdirSync(dir);
    for (let filename of fileList) {
      let file = new File(dir, filename);
      if (file.size < threashold || file.isFolder()) continue;
      bigFiles.fileList.push(file);
    }
    console.log(`\n- ${fileList.length} files found, ${bigFiles.length} of which are big and will be phantom-deleted. \n- This can free up ${File.toReadableSize(bigFiles.totalSize)} disk space.`);

    var wantSeeFiles = await question(`\n- (default = n) Would you like to view the list of them? (y / n):`);
    if (wantSeeFiles.toLowerCase().trim() == 'y')
      bigFiles.showFiles();

    var confirm = await question('\n- Type "confirm" to proceed (cannot undo):');
    if (confirm.toLowerCase().trim() != 'confirm') {
      console.log('\n  Mission Canceled');
      process.exit();
    }
    bigFiles.deleteAll();

    var wantPrefix = await question(`\n- (default = y) Prefix your folder name with a "╳"? (y / n):`);
    if (wantPrefix.toLowerCase().trim() != 'n') {
      let newBasename = '⨯' + path.basename(dir); // ⨯ is the real char used, but it doesn't show well in some terminals. ╳ shows better.
      fs.renameSync(dir, path.join(path.dirname(dir), newBasename));
      console.log(`\n- Your folder name has been changed to "${'╳' + newBasename.slice(1, newBasename.length)}"`);
    }
    CLI.close();
  }

  catch (error) {
    if (error.message.startsWith('EPERM') || error.message.startsWith('EACCES'))
      console.log('\nPhantom-delete successful, but failed to prefix your folder with a "╳"');
    else if (error.message.startsWith('ENOENT'))
      console.log('\nUnrecognized Path. Are you using WSL? If yes, try cmd, or Git Bash, or Powershell, they all work.');
    else {
      console.log('');
      throw error;
    }
    process.exit();
  }
}

function question(question) {
  return new Promise(resolve => {
    CLI.question(question, answer => {
      resolve(answer);
    });
  });
}

function printHeader() {
  console.log(`
   _____ _           _                ____      _     _
  |  _  | |_ ___ ___| |_ ___ _____   |    \\ ___| |___| |_ ___
  |   __|   | .'|   |  _| . |     |  |  |  | -_| | -_|  _| -_|
  |__|  |_|_|__,|_|_|_| |___|_|_|_|  |____/|___|_|___|_| |___|

  `);
}
