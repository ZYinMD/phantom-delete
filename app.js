const readline = require('readline');
const fs = require('fs');
var path = '';

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

settings().then(res => {
  path = res;
  var filenames = fs.readdirSync(path);
  var files = filenames.map(filename => new File(path, filename));
  for (let i of files) {
    if (i.isFolder() || i.size < 100) continue;
    i.delete();
  }
});


function settings() { //this function makes a prompt and returns a promise of the answer. Didn't use npm inquire because I want this to be a single file app.
  const settings = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    settings.question('What directory do you want to phantom delete? Paste full path here: \n', (answer) => {
      resolve(answer);
      settings.close();
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
