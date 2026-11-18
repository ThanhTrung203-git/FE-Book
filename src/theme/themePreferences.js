export const THEME_KEY="book-theme";
export function readThemePreference(storage) {
  try {
    const value=storage?.getItem(THEME_KEY);
    return ["light","dark","system"].includes(value)?value:"system";
  }catch{return "system";}
}
export function resolveTheme(preference,systemDark=false) {
  return preference==="dark"||(preference==="system"&&systemDark)?"dark":"light";
}
export function persistThemePreference(storage,preference){
  if(!["light","dark","system"].includes(preference))return false;
  try{storage?.setItem(THEME_KEY,preference);return true;}catch{return false;}
}
