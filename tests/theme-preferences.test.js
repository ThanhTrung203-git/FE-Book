import test from "node:test";
import assert from "node:assert/strict";
import { THEME_KEY, readThemePreference, persistThemePreference, resolveTheme } from "../src/themePreferences.js";
test("first visit follows system and invalid preferences fall back to system",()=>{
  assert.equal(readThemePreference({getItem:()=>null}),"system");
  assert.equal(readThemePreference({getItem:()=>"broken"}),"system");
  assert.equal(resolveTheme("system",true),"dark");
  assert.equal(resolveTheme("system",false),"light");
});
test("explicit choices override the system and persist across reloads",()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(persistThemePreference(storage,"dark"),true);
  assert.equal(values.get(THEME_KEY),"dark");
  assert.equal(resolveTheme(readThemePreference(storage),false),"dark");
  persistThemePreference(storage,"light");
  assert.equal(resolveTheme(readThemePreference(storage),true),"light");
  assert.equal(persistThemePreference(storage,"invalid"),false);
  assert.equal(values.get(THEME_KEY),"light");
});
test("blocked browser storage does not break theme switching",()=>{
  const blocked={getItem(){throw Error("blocked");},setItem(){throw Error("blocked");}};
  assert.equal(readThemePreference(blocked),"system");
  assert.equal(persistThemePreference(blocked,"dark"),false);
  assert.equal(resolveTheme("dark",false),"dark");
});
