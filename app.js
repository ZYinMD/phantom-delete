const fs = require('fs');
var path = process.argv[2];

class File {
  constructor(path, name) {
    this.path = path;
    this.name = name;
  }
  get fullname() {
    return this.path + '\\' + this.name;
  }
  get size() {
    return Math.round(fs.statSync(this.fullname).size / 1024); // return file size in KB
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

var filenames = fs.readdirSync(path);
var files = filenames.map(filename => new File(path, filename));

for (let i of files) {
  if (i.isFolder() || i.size < 100) continue;
  i.delete();
}


function printHeader() {
  console.log(`
   _____ _           _                ____      _     _
  |  _  | |_ ___ ___| |_ ___ _____   |    \\ ___| |___| |_ ___
  |   __|   | .'|   |  _| . |     |  |  |  | -_| | -_|  _| -_|
  |__|  |_|_|__,|_|_|_| |___|_|_|_|  |____/|___|_|___|_| |___|

  `);
}
