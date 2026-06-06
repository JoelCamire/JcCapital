import puppeteer from 'puppeteer';
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-setuid-sandbox']});
const p=await b.newPage();await p.setViewport({width:1480,height:900,deviceScaleFactor:1.5});
await p.evaluateOnNewDocument(()=>{localStorage.setItem('jc_planner_lang','fr');});
await p.goto('http://localhost:8765/index.html#clients',{waitUntil:'networkidle0'});
await p.waitForSelector('.shell');
await p.evaluate(async()=>{ const {store}=await import('./src/state/store.js'); store.addClient('Boulangerie Lévesque inc.','CA','QC'); store.addClient('Ferme Bergeron','CA','ON'); location.hash='#clients'; window.dispatchEvent(new Event('hashchange')); });
await new Promise(r=>setTimeout(r,800));
await p.screenshot({path:'/tmp/shotsC/clients2.png',fullPage:true}); console.log('done'); await b.close();
