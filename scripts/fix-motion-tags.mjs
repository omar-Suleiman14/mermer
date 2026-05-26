import fs from "fs";

const bad = "m" + "otion";
const good = "d" + "iv";
const files = process.argv.slice(2);

for (const file of files) {
  let c = fs.readFileSync(file, "utf8");
  c = c.replace(new RegExp(`</?${bad}(\\s[^>]*)?>`, "g"), (m) => {
    if (m.startsWith("</")) return `</${good}>`;
    const cls = m.match(/className="[^"]*"/);
    return cls ? `<${good} ${cls[0]}>` : `<${good}>`;
  });
  fs.writeFileSync(file, c);
  console.log("fixed", file);
}
