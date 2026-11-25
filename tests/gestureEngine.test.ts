import { HandGestureEngine } from '../src/services/handGestureEngine';
type P={x:number;y:number;z:number};
// Bàn tay giả lập: ext = ngón [cái,trỏ,giữa,nhẫn,út] duỗi?; dx,dy dịch chuyển; roll xoay trong mặt phẳng; mirror = tay còn lại
function hand(ext:boolean[], o:{dx?:number;dy?:number;roll?:number;mirror?:boolean;pinch?:number}={}):P[]{
  const pts:P[]=new Array(21);
  const s=o.mirror?-1:1;
  pts[0]={x:0,y:0.2,z:0};
  // thumb
  const thumbExt=ext[0];
  pts[1]={x:-0.05*s,y:0.15,z:0};pts[2]={x:-0.09*s,y:0.1,z:0};pts[3]={x:-0.12*s,y:0.05,z:0};
  pts[4]= thumbExt?{x:-0.15*s,y:0.0,z:0}:{x:-0.03*s,y:0.03,z:0};
  const mcpX=[-0.045,-0.015,0.015,0.045].map(v=>v*s);
  for(let f=0;f<4;f++){
    const b=5+f*4; const x=mcpX[f];
    pts[b]={x,y:0,z:0};
    if(ext[f+1]){pts[b+1]={x,y:-0.06,z:0};pts[b+2]={x,y:-0.1,z:0};pts[b+3]={x,y:-0.14,z:0};}
    else {pts[b+1]={x,y:-0.04,z:0};pts[b+2]={x,y:-0.01,z:0};pts[b+3]={x,y:0.02,z:0};}
  }
  if(o.pinch!==undefined){ pts[4]={x:pts[8].x - o.pinch, y:pts[8].y+0.0, z:0}; }
  const r=(o.roll||0);
  return pts.map(p=>{const x=p.x*Math.cos(r)-p.y*Math.sin(r), y=p.x*Math.sin(r)+p.y*Math.cos(r);return {x:0.5+x+(o.dx||0),y:0.5+y+(o.dy||0),z:p.z};});
}
const OPEN=[true,true,true,true,true], FIST=[false,false,false,false,false], POINT=[false,true,false,false,false], PEACE=[true,true,true,false,false];
let t=0; const run=(e:HandGestureEngine,h:P[],n=1)=>{let o:any;for(let i=0;i<n;i++){t+=33;o=e.processHands([h],1.65,t);}return o;};
let ok=0,fail=0; const check=(name:string,c:boolean,info:any='')=>{c?ok++:fail++;console.log((c?'PASS ':'FAIL ')+name,info);};

// 1. Vị trí tay không làm xoay mô hình
{const e=new HandGestureEngine(); const a=run(e,hand(OPEN),20).telemetry; const b=run(e,hand(OPEN,{dx:0.25,dy:-0.2}),20).telemetry;
 check('di chuyển tay không đổi góc', Math.abs(a.handYawDeg-b.handYawDeg)<3&&Math.abs(a.handPitchDeg-b.handPitchDeg)<3,{a:[a.handYawDeg,a.handPitchDeg],b:[b.handYawDeg,b.handPitchDeg]});}
// 2. Nghiêng cổ tay đổi roll
{const e=new HandGestureEngine(); const a=run(e,hand(OPEN),20).telemetry; const b=run(e,hand(OPEN,{roll:0.4}),30).telemetry;
 check('nghiêng cổ tay đổi roll', Math.abs(b.handRollDeg-a.handRollDeg)>25,{a:a.handRollDeg,b:b.handRollDeg});}
// 3. Tay trái và tay phải cho cùng góc (không nhảy 180°)
{const e1=new HandGestureEngine(),e2=new HandGestureEngine(); const a=run(e1,hand(OPEN),20).telemetry; const b=run(e2,hand(OPEN,{mirror:true}),20).telemetry;
 check('tay trái = tay phải', Math.abs(a.handYawDeg-b.handYawDeg)<5,{r:a.handYawDeg,l:b.handYawDeg});}
// 4. Chống nhấp nháy
{const e=new HandGestureEngine(); run(e,hand(OPEN),10); let changed=false;
 for(let i=0;i<12;i++){const o=run(e,hand(i%2?FIST:OPEN)); if(o.telemetry.primaryGesture!=='PALM_3D_ORIENTATION')changed=true;}
 check('nhấp nháy xen kẽ không đổi cử chỉ',!changed);
 const o=run(e,hand(FIST),5); check('giữ nắm tay 5 khung → nhận nắm tay',o.telemetry.primaryGesture==='FIST_INERTIA_GRAB',o.telemetry.primaryGesture);}
// 5. Xoè tay, ngón cái gần ngón trỏ nhưng không chụm → không zoom
{const e=new HandGestureEngine(); const o=run(e,hand(OPEN,{pinch:0.08}),10);
 check('xoè tay (cái gần trỏ) không bị zoom',o.telemetry.primaryGesture!=='PINCH_ZOOM',[o.telemetry.primaryGesture,o.telemetry.pinchDistance]);}
// 6. Chụm rồi mở → zoom tăng
{const e=new HandGestureEngine(); run(e,hand(POINT,{pinch:0.01}),8); const z0=run(e,hand(POINT,{pinch:0.01}),2).telemetry.zoomLevelNormalized;
 let o; for(let k=1;k<=10;k++) o=run(e,hand(POINT,{pinch:0.01+k*0.012}),2);
 check('chụm rồi mở → phóng to',o.telemetry.primaryGesture==='PINCH_ZOOM'&&o.telemetry.zoomLevelNormalized>z0+0.3,[z0,o.telemetry.zoomLevelNormalized,o.telemetry.primaryGesture]);}
// 7. Các cử chỉ còn lại vẫn nhận đúng
{const e=new HandGestureEngine(); check('chữ V',run(e,hand(PEACE),8).telemetry.primaryGesture==='PEACE_TOP_VIEW');
 const e2=new HandGestureEngine(); check('chỉ trỏ',run(e2,hand(POINT),8).telemetry.primaryGesture==='POINT_INSPECT');
 const e3=new HandGestureEngine(); check('xoè tay',run(e3,hand(OPEN),8).telemetry.primaryGesture==='PALM_3D_ORIENTATION');}
// 8. Quán tính không phụ thuộc tốc độ khung hình
{const imp=(fps:number)=>{const e=new HandGestureEngine(); let tt=0; const dt=1000/fps; let o:any;
  for(let i=0;i<8;i++){tt+=dt;o=e.processHands([hand(FIST)],1.65,tt);} for(let i=0;i<3;i++){tt+=dt;o=e.processHands([hand(FIST,{dx:0.3*(i+1)/fps})],1.65,tt);} return o.inertiaImpulse.y;};
 const a=imp(30),b=imp(60); check('quán tính 30fps ≈ 60fps',Math.abs(a-b)/Math.abs(a)<0.05,{a,b});}
// 9. Hai tay xoè kéo xa nhau → phóng to
{const e=new HandGestureEngine(); const two=(gap:number,ext:boolean[])=>[hand(ext,{dx:-gap}),hand(ext,{dx:gap,mirror:true})];
 let o:any; for(let i=0;i<8;i++){t+=33;o=e.processHands(two(0.12,OPEN),1.65,t);} const z0=o.telemetry.zoomLevelNormalized;
 for(let k=1;k<=12;k++){t+=33;o=e.processHands(two(0.12+k*0.01,OPEN),1.65,t);}
 check('hai tay xoè kéo xa → phóng to',o.telemetry.primaryGesture==='TWO_HAND_ZOOM'&&o.telemetry.zoomLevelNormalized>z0+0.4,[o.telemetry.primaryGesture,z0,o.telemetry.zoomLevelNormalized]);
// 10. Hai nắm tay kéo ra hai bên → tách mạch
 const e2=new HandGestureEngine(); for(let i=0;i<8;i++){t+=33;o=e2.processHands(two(0.1,FIST),1.65,t);}
 const u0=o.targetUnzipFactor??0; for(let k=1;k<=12;k++){t+=33;o=e2.processHands(two(0.1+k*0.015,FIST),1.65,t);}
 check('hai nắm tay kéo ra → tách mạch',o.telemetry.primaryGesture==='TWO_HAND_UNZIP'&&o.targetUnzipFactor>u0+0.5,[o.telemetry.primaryGesture,u0,o.targetUnzipFactor]);
// 11. Hai tay khác tư thế → dùng tay thứ nhất
 const e3=new HandGestureEngine(); for(let i=0;i<8;i++){t+=33;o=e3.processHands([hand(POINT),hand(FIST,{dx:0.3})],1.65,t);}
 check('hai tay khác tư thế → cử chỉ 1 tay',o.telemetry.primaryGesture==='POINT_INSPECT',o.telemetry.primaryGesture);}
console.log(`\n${ok} đạt, ${fail} lỗi`);
process.exitCode = fail > 0 ? 1 : 0;
