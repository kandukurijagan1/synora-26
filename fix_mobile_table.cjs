const fs = require("fs");
let css = fs.readFileSync("src/index.css", "utf8");

const responsiveTableCss = `
@media (max-width: 1024px) {
  .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td {
    display: block;
    width: 100%;
  }
  .responsive-table thead {
    display: none;
  }
  .responsive-table tr {
    margin-bottom: 1rem;
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 0.5rem;
  }
  .responsive-table td {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid rgba(51, 65, 85, 0.3);
    padding: 0.75rem 0.5rem !important;
    text-align: right;
  }
  .responsive-table td:last-child {
    border-bottom: none;
  }
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.65rem;
    color: #94a3b8;
    text-align: left;
    margin-right: 1rem;
    flex-shrink: 0;
  }
  .responsive-table td > input[type="checkbox"] {
    margin-left: auto;
  }
  .responsive-table td > div {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
}
`;

if (!css.includes("responsive-table")) {
  fs.appendFileSync("src/index.css", responsiveTableCss);
}

let portal = fs.readFileSync("src/components/organizer/OrganizerPortal.tsx", "utf8");
portal = portal.replace(`<table className="w-full text-left text-xs">`, `<table className="w-full text-left text-xs responsive-table">`);

portal = portal.replace(/<td className=\{\`\$\{cellPadding\} text-center\`\}>/g, `<td className={\`\${cellPadding} text-center\`} data-label="Select">`);
portal = portal.replace(/<td className=\{\`\$\{cellPadding\} font-mono font-bold text-cyan-300\`\}>/g, `<td className={\`\${cellPadding} font-mono font-bold text-cyan-300\`} data-label="Pass ID">`);
portal = portal.replace(/{\/\* Team & College \*\/}\s*<td className=\{cellPadding\}>/g, `{\/\* Team & College \*\/}\n                              <td className={cellPadding} data-label="Team & College">`);
portal = portal.replace(/{\/\* Team Leader \*\/}\s*<td className=\{cellPadding\}>/g, `{\/\* Team Leader \*\/}\n                              <td className={cellPadding} data-label="Team Leader">`);
portal = portal.replace(/{\/\* Co-Delegates \*\/}\s*<td className=\{cellPadding\}>/g, `{\/\* Co-Delegates \*\/}\n                              <td className={cellPadding} data-label="Co-Delegates">`);
portal = portal.replace(/{\/\* Category & Fee \*\/}\s*<td className=\{cellPadding\}>/g, `{\/\* Category & Fee \*\/}\n                              <td className={cellPadding} data-label="Category & Fee">`);
portal = portal.replace(/{\/\* Attendance Status \*\/}\s*<td className=\{cellPadding\}>/g, `{\/\* Attendance Status \*\/}\n                              <td className={cellPadding} data-label="Attendance Status">`);
portal = portal.replace(/{\/\* Actions \*\/}\s*<td className=\{\`\$\{cellPadding\} text-right\`\}>/g, `{\/\* Actions \*\/}\n                              <td className={\`\${cellPadding} text-right\`} data-label="Actions">`);

// Restore overflow-x-auto but add responsive class so it doesnt clip shadows
portal = portal.replace(`<div>\n                  <table className="w-full`, `<div className="overflow-x-auto lg:overflow-x-visible">\n                  <table className="w-full`);

fs.writeFileSync("src/components/organizer/OrganizerPortal.tsx", portal);
console.log("Done");

