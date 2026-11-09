const fs = require("fs");
let file = fs.readFileSync("src/components/organizer/OrganizerPortal.tsx", "utf8");

file = file.replace(`<table className="w-full text-left text-xs">`, `<table className="w-full text-left text-xs block xl:table">`);
file = file.replace(`<thead className="bg-slate-950 text-slate-400 border-b border-slate-700/80 uppercase text-[10px] tracking-wider">`, `<thead className="hidden xl:table-header-group bg-slate-950 text-slate-400 border-b border-slate-700/80 uppercase text-[10px] tracking-wider">`);
file = file.replace(`<tbody className="divide-y divide-slate-800">`, `<tbody className="block xl:table-row-group space-y-4 xl:space-y-0 xl:divide-y xl:divide-slate-800 p-2 xl:p-0">`);

// Replace tr
file = file.replace(/<tr\s+key=\{team\.teamId\}\s+className=\{`hover:bg-slate-800\/50 transition \$\{/g, `<tr key={team.teamId} className={\`block xl:table-row bg-slate-900/40 xl:bg-transparent border border-slate-700/50 xl:border-none rounded-2xl xl:rounded-none p-3 xl:p-0 mb-3 xl:mb-0 hover:bg-slate-800/50 transition \${`);

// Replace td to be flex
file = file.replace(/<td className=\{\`\$\{cellPadding\} text-center\`\}>/g, `<td className={\`\${cellPadding} flex xl:table-cell justify-between items-center border-b border-slate-800 xl:border-none text-center\`}>`);
file = file.replace(/<td className=\{\`\$\{cellPadding\} font-mono font-bold text-cyan-300\`\}>/g, `<td className={\`\${cellPadding} flex xl:table-cell justify-between items-center border-b border-slate-800 xl:border-none font-mono font-bold text-cyan-300\`}>`);
file = file.replace(/<td className=\{cellPadding\}>/g, `<td className={\`\${cellPadding} flex xl:table-cell justify-between items-center border-b border-slate-800 xl:border-none\`}>`);
file = file.replace(/<td className=\{\`\$\{cellPadding\} text-right\`\}>/g, `<td className={\`\${cellPadding} flex xl:table-cell justify-between items-center xl:text-right\`}>`);

fs.writeFileSync("src/components/organizer/OrganizerPortal.tsx", file);
console.log("Table classes updated");

