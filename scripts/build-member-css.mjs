import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Build a single ordered stylesheet from the existing design layers.
// Keeps original files editable, prevents requests for 17 separate CSS assets.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[
 'member-shell.css','member-premium.css','member-luxe.css',
 'member-roleplay-v5.css','roleplay-room-v6.css','member-signature-v7.css',
 'site-signature-v7.css','setter-electric-v8.css','member-atelier-v9.css',
 'room-typing-v10.css','platform-growth-v11.css','advanced-studio-v12.css',
 'member-journey-v13.css','roleplay-replay-v14.css','site-luxe.css',
 'site-unified-v15.css','member-design-v15.css'
];
const parts=files.map(file=>{
 const css=readFileSync(path.join(root,'public',file),'utf8');
 if(!css.trim())throw new Error('Missing styles in '+file);
 return '/* SOURCE: '+file+' */\n'+css+'\n';
});
const output=path.join(root,'public','member-ui-v15.css');
writeFileSync(output,parts.join('\n'));
console.log('Built member-ui-v15.css from '+files.length+' ordered stylesheets');
