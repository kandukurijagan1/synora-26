const fs = require("fs");
let file = fs.readFileSync("src/index.css", "utf8");
file = file.replace(/width: 100vw;/g, "width: 100%;");
file = file.replace(/max-width: 100vw;/g, "max-width: 100%;");
fs.writeFileSync("src/index.css", file);
console.log("CSS updated");

