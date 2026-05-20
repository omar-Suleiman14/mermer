const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
};

const appFiles = walkSync('d:/ZainOs/ibnsina/app').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
const compFiles = walkSync('d:/ZainOs/ibnsina/components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const allFiles = [...appFiles, ...compFiles];

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('from "@/lib/i18n"')) {
    content = content.replace(/from "@\/lib\/i18n"/g, 'from "@/lib/i18n/client"');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
