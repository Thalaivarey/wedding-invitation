// Small vector characters, rendered into a transparent looping GIF.
// Rebuild with: node scripts/make-dancing-couple.cjs (requires sharp + ImageMagick).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execFileSync } = require('child_process');
const output = path.resolve(__dirname, '../assets/generated');
const frames = path.resolve(__dirname, '../.dance-frames');
fs.mkdirSync(output, {recursive:true});
fs.mkdirSync(frames, {recursive:true});
function frame(t) {
  const swing = Math.sin(t), bounce = Math.cos(t * 2) * 3;
  const brideAngle = swing * 7, groomAngle = -swing * 7;
  const heart = `<path d="M0 3 C-7-6 -13 1 -8 7 L0 14 L8 7 C13 1 7-6 0 3" fill="#c96d7a"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <circle cx="96" cy="100" r="84" fill="#fff4db" stroke="#dbb976" stroke-width="2"/>
  <circle cx="96" cy="100" r="77" fill="none" stroke="#e5caa0" stroke-dasharray="2 7"/>
  <ellipse cx="96" cy="165" rx="57" ry="7" fill="#ae8461" opacity=".15"/>
  <g transform="translate(96 ${21+bounce}) scale(.65)">${heart}</g>
  <g transform="translate(29 ${69-bounce}) scale(.32)">${heart}</g>
  <g transform="translate(165 ${60+bounce}) scale(.4)">${heart}</g>
  <g transform="translate(67 ${94+bounce}) rotate(${brideAngle})">
    <path d="M-10 54L-11 65M10 54L12 65" stroke="#a25d39" stroke-width="9" stroke-linecap="round"/>
    <path d="M-15 65H-6M8 65H17" stroke="#833d36" stroke-width="6" stroke-linecap="round"/>
    <g transform="rotate(${-32+swing*23} -13 9)"><path d="M-13 9L-28 29L-22 40" fill="none" stroke="#d58e62" stroke-width="8" stroke-linecap="round"/><path d="M-13 9L-20 18" stroke="#a84c48" stroke-width="12" stroke-linecap="round"/><path d="M-27 31L-21 34" stroke="#e8bc4b" stroke-width="4"/></g>
    <g transform="rotate(${25+swing*25} 13 9)"><path d="M13 9L25 23L32 8" fill="none" stroke="#d58e62" stroke-width="8" stroke-linecap="round"/><path d="M13 9L19 17" stroke="#a84c48" stroke-width="12" stroke-linecap="round"/><path d="M28 15L34 18" stroke="#e8bc4b" stroke-width="4"/></g>
    <path d="M-14 2Q0-5 14 2L25 59Q0 71-25 59Z" fill="#3c987b" stroke="#28785d" stroke-width="1.5"/>
    <path d="M11 2L-17 51L-24 59M11 2L23 57" fill="none" stroke="#e5ba53" stroke-width="6"/>
    <path d="M-19 59Q0 66 21 58" fill="none" stroke="#f2d18b" stroke-width="3"/>
    <path d="M-2 31L-4 58M5 37L7 60M13 42L16 58" stroke="#2d7764" opacity=".55"/>
    <path d="M-8 3Q0 15 9 3" fill="none" stroke="#edc861" stroke-width="3"/>
    <circle cy="11" r="3" fill="#f6d46b"/>
    <rect x="-5" y="-10" width="10" height="13" rx="4" fill="#cf865a"/>
    <ellipse cx="0" cy="-22" rx="25" ry="29" fill="#322128"/>
    <circle cx="-21" cy="-8" r="8" fill="#322128"/>
    <circle cx="-23" cy="-16" r="4" fill="#fff8dc"/><circle cx="-26" cy="-10" r="4" fill="#fff8dc"/><circle cx="-24" cy="-3" r="4" fill="#fff8dc"/>
    <ellipse cy="-20" rx="21" ry="24" fill="#e8a97c"/>
    <path d="M-22-25Q-20-51 0-48Q24-49 23-22Q11-29 2-39Q-5-27-22-25" fill="#342128"/>
    <path d="M0-44V-32" stroke="#eac264" stroke-width="2"/><circle cy="-32" r="3" fill="#f4cf65"/>
    <circle cy="-25" r="1.8" fill="#ac4145"/>
    <path d="M-13-20Q-9-24-5-20M5-20Q9-24 13-20" fill="none" stroke="#35242a" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="-13" cy="-13" rx="4" ry="2" fill="#d66e66" opacity=".6"/><ellipse cx="13" cy="-13" rx="4" ry="2" fill="#d66e66" opacity=".6"/>
    <path d="M-6-10Q0-4 6-10" fill="#fff7e6" stroke="#aa5352" stroke-width="1.3"/>
    <circle cx="-22" cy="-12" r="3" fill="#f0ca63"/><circle cx="22" cy="-12" r="3" fill="#f0ca63"/>
  </g>
  <g transform="translate(127 ${91-bounce}) rotate(${groomAngle})">
    <path d="M-9 43L${-12+swing*4} 70M8 43L${12-swing*4} 69" stroke="#273b58" stroke-width="11" stroke-linecap="round"/>
    <path d="M${-18+swing*4} 71H${-8+swing*4}M${9-swing*4} 70H${20-swing*4}" stroke="#302830" stroke-width="6" stroke-linecap="round"/>
    <g transform="rotate(${32-swing*22} -13 8)"><path d="M-13 8L-25 24L-30 10" fill="none" stroke="#334d70" stroke-width="10" stroke-linecap="round"/><circle cx="-30" cy="7" r="5" fill="#d69a6c"/></g>
    <g transform="rotate(${-18-swing*24} 13 8)"><path d="M13 8L25 21L30 5" fill="none" stroke="#334d70" stroke-width="10" stroke-linecap="round"/><circle cx="31" cy="3" r="5" fill="#d69a6c"/></g>
    <path d="M-15 2Q0-5 15 2L18 44Q0 50-18 44Z" fill="#324d70" stroke="#24364e" stroke-width="1.5"/>
    <path d="M-8 0L0 24L8 0" fill="#fff6e6"/>
    <path d="M-12 1L-6 17L0 24L-10 31M12 1L7 17L0 24L10 31" fill="none" stroke="#59708e" stroke-width="2"/>
    <circle cy="29" r="1.7" fill="#c6a16a"/><circle cy="37" r="1.7" fill="#c6a16a"/>
    <rect x="-5" y="-10" width="10" height="13" rx="4" fill="#c38459"/>
    <ellipse cy="-24" rx="23" ry="27" fill="#dca174"/>
    <path d="M-23-21Q-33-45-17-49Q-6-63 9-54Q31-55 24-22L15-33Q6-34 3-42Q-8-31-20-33Z" fill="#302229"/>
    <path d="M-13-23Q-9-27-5-23M5-23Q9-27 13-23" fill="none" stroke="#35242a" stroke-width="2" stroke-linecap="round"/>
    <path d="M-8-13Q-3-17 0-13Q3-17 8-13L4-10L0-11L-4-10Z" fill="#44302b"/>
    <path d="M-5-6Q0-2 5-6" fill="none" stroke="#995441" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="-14" cy="-14" r="3" fill="#c67560" opacity=".3"/><circle cx="14" cy="-14" r="3" fill="#c67560" opacity=".3"/>
  </g></svg>`;
}
(async () => {
  fs.writeFileSync(path.join(output,'dancing-couple.svg'),frame(0));
  const files=[];
  for(let i=0;i<28;i++) {
    const file=path.join(frames,`${String(i).padStart(2,'0')}.png`);
    await sharp(Buffer.from(frame(i/28*Math.PI*2))).png().toFile(file);
    files.push(file);
  }
  execFileSync('convert',['-delay','7','-dispose','Background',...files,'-loop','0','-layers','Optimize',path.join(output,'dancing-couple.gif')]);
  console.log('Created 28-frame looping dancing couple GIF and still SVG.');
})();
