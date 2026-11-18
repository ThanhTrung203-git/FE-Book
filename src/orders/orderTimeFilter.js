export function defaultOrderTimeValue(unit,now=new Date()) {
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23",
  }).formatToParts(new Date(now));
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const day=values.year+"-"+values.month+"-"+values.day;
  if(unit==="month")return day.slice(0,7);
  if(unit==="day")return day;
  if(unit==="hour")return day+"T"+values.hour+":00";
  if(unit==="week"){
    const date=new Date(day+"T00:00:00Z");
    date.setUTCDate(date.getUTCDate()+3-(date.getUTCDay()+6)%7);
    const year=date.getUTCFullYear(),jan4=new Date(Date.UTC(year,0,4));
    jan4.setUTCDate(jan4.getUTCDate()+3-(jan4.getUTCDay()+6)%7);
    const week=1+Math.round((date-jan4)/(7*86400000));
    return year+"-W"+String(week).padStart(2,"0");
  }
  return "";
}
