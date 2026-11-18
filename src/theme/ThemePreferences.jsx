import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { useLanguage } from "../shared/i18n.jsx";
import { THEME_KEY, persistThemePreference, readThemePreference, resolveTheme } from "./themePreferences.js";

const ThemeContext=createContext(null);
function storage(){
  try{return window.localStorage;}catch{return null;}
}
export function ThemeProvider({children}){
  const [preference,setPreference]=useState(()=>readThemePreference(storage()));
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia?.("(prefers-color-scheme: dark)").matches||false);
  const theme=resolveTheme(preference,systemDark);
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#17141e":"#f8f5fc");
  },[theme]);
  useEffect(()=>{
    const media=window.matchMedia?.("(prefers-color-scheme: dark)");
    const changed=event=>setSystemDark(event.matches);
    media?.addEventListener("change",changed);
    const synchronized=event=>{if(event.key===THEME_KEY||event.key===null)setPreference(readThemePreference(storage()));};
    window.addEventListener("storage",synchronized);
    return()=>{media?.removeEventListener("change",changed);window.removeEventListener("storage",synchronized);};
  },[]);
  const value=useMemo(()=>({
    theme,preference,
    setTheme:next=>{
      if(!["light","dark","system"].includes(next))return;
      persistThemePreference(storage(),next);setPreference(next);
    },
  }),[theme,preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function HeaderDisplayControls(){
  const {theme,setTheme}=useContext(ThemeContext);
  const {language,setLanguage,t}=useLanguage();
  const dark=theme==="dark";
  const label=t(dark?"Chuyển sang giao diện sáng":"Chuyển sang giao diện tối");
  return <div className="header-display-controls" aria-label={t("Giao diện và ngôn ngữ")}>
    <button type="button" className="header-display-button" aria-label={label} title={label} aria-pressed={dark}
      onClick={()=>setTheme(dark?"light":"dark")}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
    <button type="button" className="header-display-button language-icon-button"
      aria-label={t("Ngôn ngữ") + ": " + (language === "vi" ? "English" : "Tiếng Việt")}
      title={t("Ngôn ngữ") + ": " + (language === "vi" ? "English" : "Tiếng Việt")}
      onClick={()=>setLanguage(language === "vi" ? "en" : "vi")}>
      <Languages size={17}/><span>{language.toUpperCase()}</span>
    </button>
  </div>;
}
