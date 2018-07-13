// ↓settings:
const threashold = 1000000; // file over this size (in bytes) will be deleted.
// ↑settings:

const readline = require('readline'); // the native package that does prompts
const fs = require('fs');
const path = require('path');
var File, BigFileList, CLI; // global variables are used since it's just a small app

init();
run();

async function run() {
  try {
    var dir = await question('Which directory do you want to perform phantom-delete on? Paste full path here: \n');
    var bigFiles = new BigFileList([]); // the object that stores the to-be-deleted files
    var fileList = fs.readdirSync(dir);
    for (let filename of fileList) {
      let file = new File(dir, filename);
      if (file.size < threashold || file.isFolder()) continue;
      bigFiles.fileList.push(file);
    }
    console.log(`\n- ${fileList.length} files found, ${bigFiles.length} of which are big and will be phantom-deleted. \n- This can free up ${File.toReadableSize(bigFiles.totalSize)} disk space.`);

    var wantSeeFiles = await question(`\n- (default = n) Would you like to see a list of them? (y / n):`);
    if (wantSeeFiles.toLowerCase().trim() == 'y') {
      bigFiles.showFiles();
    }

    var confirm = await question('\n- Type "confirm" to proceed (cannot undo):');
    if (confirm.toLowerCase().trim() != 'confirm') {
      console.log('\n  Mission Canceled');
      process.exit();
    }
    bigFiles.deleteAll();

    var wantPrefix = await question(`\n- (default = y) Prefix your folder name with a "╳"? (y / n):`);
    if (wantPrefix.toLowerCase().trim() != 'n') {
      let newBasename = '⨯' + path.basename(dir); // ⨯ is the real char used, but it seems not to show well in some terminals. ╳ shows better.
      fs.renameSync(dir, path.join(path.dirname(dir), newBasename));
      console.log(`\n- Your folder name has been changed to "${'╳' + newBasename.slice(1, newBasename.length)}"`);
    }
    CLI.close();
  }

  catch (error) {
    if (error.message.startsWith('EPERM: operation not permitted, rename')) {
      console.log('\nPhantom-delete successful, but failed to prefix your folder with a "╳"');
    } else console.log('\n', error);
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

function init() {
  File = class {
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
    static toReadableSize(bytes) {
      if (bytes > 1000000) {
        return Math.round(bytes / 1000000) + 'MB';
      } else if (bytes > 10000) {
        return Math.round(bytes / 1000) + 'KB';
      } else {
        return Math.round(bytes / 1000, 1) + 'KB';
      }
    }
    get readableSize() {
      return File.toReadableSize(this.size);
    }
    get displayInfo() {
      var space = 8 - this.readableSize.length;
      return this.readableSize + ' '.repeat(space) + this.name;
    }
    isFolder() {
      return fs.statSync(this.fullname).isDirectory();
    }
    delete() {
      fs.writeFile(this.fullname, '', (err) => {
        if (err) throw err;
      });
    }
  };

  BigFileList = class {
    constructor(fileList) {
      this.fileList = fileList;
    }
    get length() {
      return this.fileList.length;
    }
    get totalSize() {
      console.log('inside totalSize');
      return this.fileList.reduce((accumulator, item) => accumulator + item.size, 0);
    }
    showFiles() {
      console.log('');
      this.fileList.forEach((file, index) => {
        console.log(`  #${String(index + 1).padStart(2,'0')}   ${file.displayInfo}`);
      });
    }
    deleteAll() {
      for (let i of this.fileList) {
        i.delete();
      }
      console.log(`\n- ${this.length} files phantom-deleted.`);
    }
  };

  printHeader();

  CLI = readline.createInterface({ // this part is copied from node docs, I don't really understand it.
    input: process.stdin,
    output: process.stdout
  });
}