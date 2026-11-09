const test = require('node:test');
const assert = require('node:assert/strict');
const {buildLanguageURL,safeLabel} = require('../assets/languages.js');
test('undecided language switch preserves safe labels without any storage API',()=>{
 const url=new URL(buildLanguageURL('bryllup-en.html','https://flowandgreen.dk/bryllup.html?utm_source=google&utm_medium=cpc&utm_campaign=bryllup_google#musik',{decided:false,analytics:false}));
 assert.equal(url.pathname,'/bryllup-en.html');assert.equal(url.searchParams.get('utm_campaign'),'bryllup_google');assert.equal(url.hash,'#musik');
});
test('explicit analytics rejection removes campaign parameters from language links',()=>{
 const url=new URL(buildLanguageURL('en.html','https://flowandgreen.dk/?utm_source=google#kontakt',{decided:true,analytics:false}));
 assert.equal(url.search,'');assert.equal(url.hash,'#kontakt');
});
test('email, raw URLs, click identifiers and arbitrary queries never propagate',()=>{
 const url=new URL(buildLanguageURL('privacy.html','https://flowandgreen.dk/privatliv.html?utm_source=test%40example.test&utm_medium=https.example&utm_content=123456789&utm_campaign=ok_campaign&gclid=secret&name=Private#test@example.test',{}));
 assert.equal(url.search,'?utm_campaign=ok_campaign');assert.equal(url.hash,'');assert.equal(safeLabel('person@example.test'),'');
});
test('consented navigation can use only safe stored campaign labels',()=>{
 const url=new URL(buildLanguageURL('firmafest-en.html','https://flowandgreen.dk/firmafest.html',{decided:true,analytics:true},{utm_source:'instagram',utm_campaign:'firmafest_instagram',name:'Private'}));
 assert.equal(url.searchParams.get('utm_campaign'),'firmafest_instagram');assert.equal(url.searchParams.has('name'),false);
});
test('campaign labels are not attached to cross-origin destinations',()=>{
 assert.equal(buildLanguageURL('https://elsewhere.example/','https://flowandgreen.dk/?utm_source=google',{}),'https://elsewhere.example/');
});
