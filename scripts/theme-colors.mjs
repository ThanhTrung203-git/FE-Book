function channels(color){
  let hex=color.toLowerCase()==="white"?"ffffff":color.toLowerCase()==="black"?"000000":color.replace("#","");
  if(hex.length===3||hex.length===4)hex=[...hex].map(char=>char+char).join("");
  if(!/^[\da-f]{6}([\da-f]{2})?$/i.test(hex))return null;
  const rgb=[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255);
  return {rgb,alpha:hex.length===8?hex.slice(6):"",hex:hex.slice(0,6)};
}
function hsl([r,g,b]){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
  if(!delta)return [270,0,l];
  const s=delta/(1-Math.abs(2*l-1));
  let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
  return [(h*60+360)%360,s,l];
}
function rgbHex(h,s,l){
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return rgb.map(value=>Math.round((value+m)*255).toString(16).padStart(2,"0")).join("");
}
const pageColors=new Set(["f7f7fb","f7f6f9","f6f7fb","f8f5fc"]);
export function darkColor(color,role){
  const value=channels(color);if(!value)return color;
  const [h,s,l]=hsl(value.rgb);let hex;
  if(role==="text"){
    if(value.rgb.every(channel=>channel>.96))hex="ffffff"; // Text on brand buttons.
    else if(s<.16)hex=l<.42?"eee6f6":"bcb1c9";
    else hex=rgbHex(h,Math.min(.65,Math.max(.3,s)),l<.45?.8:.76);
  }else if(role==="border"){
    if(value.alpha&&value.hex==="ffffff")return color;
    hex=s>.4&&l<.8?rgbHex(h,.4,.56):rgbHex(s<.1?270:h,.18,.29);
  }else if(role==="shadow"){
    hex=l>.75?rgbHex(h,.2,.2):"000000";
  }else{
    if(pageColors.has(value.hex))hex="17141e";
    else if(value.hex==="ffffff")hex="231e2c";
    else if(l>.78)hex=rgbHex(s<.08?270:h,Math.min(.3,Math.max(.12,s)),.17);
    else if(s>.18&&l>.28)hex=value.hex; // Keep solid brand/illustration colors.
    else if(l<=.28)hex=value.hex;
    else hex=rgbHex(s<.08?270:h,Math.min(.25,s),.24);
  }
  return "#"+hex+value.alpha;
}
export function darkDeclaration(property,value){
  const prop=property.toLowerCase();
  let role;
  if(prop.startsWith("--")){
    if(/background/.test(prop))role="background";
    else if(/border/.test(prop))role="border";
    else if(/(?:ink|muted|purple|color)/.test(prop))role="text";
  }else if(/^background(?:-color|-image)?$/.test(prop))role="background";
  else if(prop==="color"||prop==="fill"||prop==="caret-color")role="text";
  else if(/^(?:border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|stroke|text-decoration-color)$/.test(prop))role="border";
  else if(/shadow/.test(prop))role="shadow";
  if(!role)return value;
  let result=value.replace(/#[\da-f]{3,8}\b|\b(?:white|black)\b/gi,color=>darkColor(color,role));
  if(role==="background"){
    result=result.replaceAll("var(--mp-purple)","var(--theme-brand)");
    result=result.replaceAll("var(--status-color)","color-mix(in srgb, var(--status-color) 60%, #000)");
  }
  return result;
}
