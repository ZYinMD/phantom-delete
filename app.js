//settings:
const threashold = 1000000; // file over this size (in bytes) will be deleted.
const readline = require('readline');
const fs = require('fs');
const path = require('path');
var dir, bigFiles, totalSize; // global variables are used since it's just a small app

class File {
  constructor(dir, name) {
    this.dir = dir;
    this.name = name;
  }
  get fullname() {
    return this.dir + '\\' + this.name;
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
}

printHeader();
const CLI = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

question('Which directory do you want to perform phantom-delete on? Paste full path here: \n').then(answer => {
    dir = answer;
    bigFiles = [];
    var fileList = fs.readdirSync(dir);
    totalSize = 0;
    for (let filename of fileList) {
      let file = new File(dir, filename);
      let filesize = file.size;
      if (filesize < threashold) continue;
      totalSize += filesize;
      bigFiles.push(file);
    }
    console.log(`\n- ${fileList.length} files found, ${bigFiles.length} of which are big and will be phantom-deleted. \n- This can free up ${File.toReadableSize(totalSize)} disk space.`);
    return question(`\n- (default = n) Would you like to see a list of them? (y / n):`);
  }).then(answer => {
    if (answer.toLowerCase().trim() == 'y') {
      console.log('\n');
      bigFiles.forEach((file, index) => {
        console.log(`  #${String(index + 1).padStart(2,'0')}    ${file.displayInfo}`);
      });
    }
    return question('\n- Type "confirm" to proceed (cannot undo):');
  }).then(answer => {
    if (answer.toLowerCase().trim() != 'confirm') {
      console.log('\n Mission Canceled');
      process.exit();
    }
    for (let i of bigFiles) {
        if (i.isFolder() || i.size < threashold) continue;
        i.delete();
      }
    console.log(`\n- ${bigFiles.length} files phantom-deleted.`);
    return question(`\n- (default = y) Prefix your folder name with a "╳"? (y / n):`);
  }).then(answer => {
      if (answer.toLowerCase().trim() != 'n') {
        let newBasename = '⨯' + path.basename(dir);
        fs.renameSync(dir, path.join(path.dirname(dir), newBasename));
      }
    CLI.close();
  }).catch(error => {
    if (error.message.startsWith('EPERM: operation not permitted, rename')) {
      console.log('\nPhantom-delete successful, but failed to prefix your folder with a ╳');
    } else console.log(error.message);
    process.exit();
  });


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
