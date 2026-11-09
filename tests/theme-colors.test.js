import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { darkColor, darkDeclaration } from "../scripts/theme-colors.mjs";
function luminance(hex){
  const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255)
    .map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test("reading text and status colors remain legible on dark cards",()=>{
  for(const color of ["#30283b","#85768e","#a18aaa","#347b62","#a6424c","#7355bb"]){
    const transformed=darkColor(color,"text");
    assert.ok(contrast(transformed,"#231e2c")>=4.5,color+" => "+transformed);
  }
  assert.ok(contrast("#ffffff",darkColor("#765bdd","background"))>=4.5);
});
test("surface conversion preserves brand buttons, alpha overlays, image URLs and geometry",()=>{
  assert.equal(darkColor("white","background"),"#231e2c");
  assert.equal(darkColor("#f7f7fb","background"),"#17141e");
  assert.equal(darkColor("#765bdd","background"),"#765bdd");
  assert.equal(darkColor("#ffffffed","background"),"#231e2ced");
  assert.equal(darkDeclaration("background","url(/cover.jpg) center / cover #fff"),"url(/cover.jpg) center / cover #231e2c");
  assert.equal(darkDeclaration("width","min(100%, 980px)"),"min(100%, 980px)");
  assert.equal(darkDeclaration("filter","none"),"none");
});
test("generated dark rules are scoped, include responsive rules and cover principal screens",()=>{
  const css=readFileSync(new URL("../src/darkPalette.css",import.meta.url),"utf8");
  const root=postcss.parse(css);
  root.walkRules(rule=>assert.ok(rule.selectors.every(selector=>selector.startsWith('html[data-theme="dark"]')),rule.selector));
  assert.ok(css.includes("@media"));
  for(const name of ["styles.css","storefront.css","catalog.css","dashboard.css","customerFeatures.css","bookImport.css","bulkActions.css","promotions.css"])
    assert.ok(css.includes("/* "+name+" */"),name);
});
