// ↓settings:
const threashold = 1000000; // file over this size (in bytes) will be deleted.
// ↑settings:

const readline = require('readline'); // the native package that does prompts
const fs = require('fs');
const path = require('path');

printHeader();

var DIR = ''; // a global variable to store the folder that user wants to perform phantom delete on

var CLI = readline.createInterface({ // got this part from node docs - readline
    input: process.stdin,
    output: process.stdout
  });

class File { // a case of File is an actual file, to construct, pass in its path and its name
  constructor(dir, name) {
    this.dir = dir;
    this.name = name;
  }
  get fullname() {
    return path.join(this.dir, this.name);
  }
  get partialName() {
    return '.' + this.fullname.replace(DIR, '');
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
    return ' '.repeat(space) + this.readableSize + '  '+ this.partialName;
  }
  isFolder() {
    return fs.statSync(this.fullname).isDirectory();
  }
  delete() {
    fs.writeFile(this.fullname, '', (err) => {
      if (err) throw err;
    });
  }
  prefix() {
    fs.renameSync(this.fullname, path.join(this.dir, '⨯ ' + this.name));
  }
}

class ToBeDeleted { // a case of ToBeDeleted is an array of Files bigger than the threshold to be deleted, to construct, pass in array of Files
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
    console.log(`\n  ...${this.length} files phantom-deleted.`);
  }
  prefixAll() {
    for (let i of this.fileList)
      i.prefix();
  }
}

run();

async function run() {

  function scanDir(dir) { // scan a folder for big files
    var fileList = fs.readdirSync(dir);
    for (let filename of fileList) {
      let file = new File(dir, filename);
      if (file.isFolder()) {
        if (recursive == 'y') {
          folders.push(file);
          scanDir(file.fullname);
        } else continue;
      }
      else if (file.size < threashold) continue;
      else bigFiles.push(file);
    }
  }

  try {
    DIR = await question('Which folder do you want to perform phantom-delete on? Drag the folder into here:\n');
    DIR = DIR.trim(); // in some terminals, dragging creates space in the end
    if (DIR[0] == DIR.slice(-1) && (DIR[0] == "'" || DIR[0] == '"')) // when there's space in the path, some terminals auto add quotes, resulting in strings with redundant quotes
      DIR = DIR.slice(1, -1);

    var recursive = await question(`\n- (default = n) Include sub-folders? (y / n):`);
    recursive = recursive.toLowerCase().trim();

    var bigFiles = []; // to store an array of files bigger than threshold.
    var folders = []; // to store an array of folders and sub-folders found

    scanDir(DIR);

    bigFiles = new ToBeDeleted(bigFiles);
    console.log(`\n  ...Found ${bigFiles.length} files bigger than 1MB.\n\n- Phantom-delete them will free up ${File.toReadableSize(bigFiles.totalSize)} disk space.`);

    var viewBeforeDelete = await question(`\n- (default = n) Would you like to view a list of them? (y / n):`);
    if (viewBeforeDelete.toLowerCase().trim() == 'y')
      bigFiles.showFiles();

    var confirm = await question('\n- Type "confirm" to proceed (cannot undo):');
    if (confirm.toLowerCase().trim() != 'confirm') {
      console.log('\n  Mission Canceled');
      process.exit();
    }
    bigFiles.deleteAll();

    var prefixFiles = await question(`\n- (default = y) Prefix phantom file names with a "╳"? (y / n):`);
    if (prefixFiles.toLowerCase().trim() != 'n') {
      bigFiles.prefixAll();
      console.log(`\n  ...phantom file names changed.`);
    }

    var prefixFolders = await question(`\n- (default = n) Prefix your folder name(s) with a "╳"? (y / n):`);
    if (prefixFolders.toLowerCase().trim() == 'y') {
      folders.reverse(); // rename the deepest folders first
      folders.push(new File(path.dirname(DIR), path.basename(DIR))); //DIR last
      for (let i of folders)
        i.prefix();
      console.log(`\n  ...folder names changed.`);
    }
    CLI.close();
  }

  catch (error) {
    if (error.message.startsWith('EPERM') || error.message.startsWith('EACCES'))
      console.log("\nError occured:\nPhantom-delete was successful, but failed in prefixing a certain file or folder with ╳. Maybe it's in use. Here's the error message: \n\n", error);
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
