/* Isometric spot illustrations. World axes are measured in drawing units. */
(function (global) {
  "use strict";
  function drawCityArt(ctx, id) {
    if (!Number.isInteger(id) || id < 0 || id > 25) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const ink = "rgba(48,64,61,.28)";
    const cream = "#ffedca", blue = "#548aa3", glass = "#8ac1cb";
    const green = "#70a78a", terra = "#df8966", ochre = "#e5b455";
    const p = (x,y,z = 0) => [50 + (x-y)*1.03, 72 + (x+y)*.45-z];
    function shade(hex, factor) {
      const n = parseInt(hex.slice(1),16);
      const component = k => Math.min(255,Math.round(((n >> k)&255)*factor));
      return "rgb("+[component(16),component(8),component(0)].join(",")+")";
    }
    function poly(points, fill, edge = null, width = .65) {
      ctx.beginPath();
      points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath();
      if (fill) { ctx.fillStyle=fill; ctx.fill(); }
      if (edge) { ctx.strokeStyle=edge; ctx.lineWidth=width; ctx.stroke(); }
    }
    function line(points,col,width=1) {
      ctx.beginPath();
      points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.strokeStyle=col; ctx.lineWidth=width; ctx.stroke();
    }
    const quad = (points,col,edge) => poly(points.map(q=>p(...q)),col,edge);
    function ground(x,y,w,d,c,z=.1) {
      quad([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]],c);
    }
    function box(x,y,w,d,z,h,wall,roof=wall) {
      quad([[x+w,y,z+h],[x+w,y+d,z+h],[x+w,y+d,z],[x+w,y,z]], shade(wall,.79),ink);
      quad([[x,y+d,z+h],[x+w,y+d,z+h],[x+w,y+d,z],[x,y+d,z]],wall,ink);
      quad([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],roof,ink);
    }
    function front(x,y,z,w,h,col) {
      quad([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],col);
    }
    function side(x,y,z,d,h,col) {
      quad([[x,y,z],[x,y+d,z],[x,y+d,z+h],[x,y,z+h]],col);
    }
    function facade(x,y,w,d,h,n,rows=1,base=0) {
      for(let r=0;r<rows;r++) {
        const z=base+3+r*(h-3)/rows;
        const wh=Math.min(4,(h-3)/rows*.68);
        for(let i=0;i<n;i++) front(x+(i+.18)*w/n,y+d+.05,z,w/n*.62,wh,"#658b95");
        const count=Math.max(1,Math.round(n*d/w));
        for(let i=0;i<count;i++) side(x+w+.05,y+(i+.2)*d/count,z,d/count*.62,wh,"#577b86");
      }
    }
    function ribbon(x,y,w,d,z,h,col=glass) {
      front(x+.8,y+d+.1,z,w-1.6,h,col);
      side(x+w+.1,y+.8,z,d-1.6,h,shade(col,.84));
    }
    function dot(point,rx,ry,col,angle=0) {
      ctx.beginPath();ctx.ellipse(point[0],point[1],rx,ry,angle,0,Math.PI*2);
      ctx.fillStyle=col;ctx.fill();
    }
    function tree(x,y,s=1) {
      const [a,b]=p(x,y);
      dot([a+1.3*s,b],3.5*s,1.35*s,"rgba(60,85,66,.15)");
      line([[a,b],[a,b-6*s]],"#9a7453",1.65*s);
      dot([a,b-7.3*s],3.8*s,5*s,"#608f6b");
      dot([a-.8*s,b-8.6*s],3*s,3.7*s,"#87b680");
    }
    function pitched(x,y,w,d,z,r,col) {
      const ridge=y+d/2;
      quad([[x,y,z],[x+w,y,z],[x+w,ridge,z+r],[x,ridge,z+r]],shade(col,.93),ink);
      quad([[x+w,y,z],[x+w,y+d,z],[x+w,ridge,z+r]],shade(col,.78),ink);
      quad([[x,ridge,z+r],[x+w,ridge,z+r],[x+w,y+d,z],[x,y+d,z]],col,ink);
    }
    function flag(x,y,z,col) {
      const [a,b]=p(x,y,z);line([[a,b],[a,b-10]],"#716f63",1);
      poly([[a+.4,b-10],[a+8,b-8.5],[a+.4,b-5.6]],col);
    }
    function stairs(x,y,w,steps) {
      for(let i=0;i<steps;i++) box(x,y+i*1.5,w,1.5,0,(steps-i)*1.15,"#d4c9b0","#eee3c9");
    }
    function columns(x,y,w,count,h) {
      for(let i=0;i<count;i++) {
        const pos=x+(w-2)*i/(count-1);
        box(pos,y,2.2,2,0,h,"#f4dfa9","#fff4d6");
      }
    }
    function bus(x,y,col) {
      box(x,y,5,13,1,4.3,col,"#fbdfaf");
      side(x+5.1,y+.6,3,11.8,1.7,"#476f7e");
      front(x+.5,y+13.1,2.8,4,1.85,"#517482");
      for (const dy of [2,10]) dot(p(x+5.2,y+dy,1.1),1.05,1.2,"#50545b");
    }
    function symbol(x,y,z,text,col,size) {
      const [a,b]=p(x,y,z);ctx.save();ctx.translate(a,b);ctx.transform(1,.437,0,1,0,0);
      ctx.fillStyle=col;ctx.font="bold "+size+"px Arial, sans-serif";ctx.textAlign="center";
      ctx.textBaseline="middle";ctx.fillText(text,0,0);ctx.restore();
    }
    function hut(x,y,w,d,h,tiles) {
      box(x,y,w,d,0,h,cream);
      pitched(x-1,y-1,w+2,d+2,h,4,tiles);
    }
    const nature = id===24 || id===25;
    dot([52,75],40,13,"rgba(66,79,52,.12)");
    box(-22,-21,44,42,-2,2,nature?"#95af76":"#c7beaa",nature?"#acd08d":"#e5dec9");
    switch(id) {
      case 0: { // Metro entrance, stairwell, arched glass shelter and line marker
        ground(-15,-14,23,29,"#748987");
        for (let i=0;i<7;i++) ground(-14,-12+3.5*i,19,1.4,"#c4c6b4",.4);
        box(-16,-15,2.3,31,0,4.5,green);box(6,-15,2.3,30,0,4.5,green);
        for(const a of [-14,6]) for(const b of [-13,6]) box(a,b,1.4,1.4,0,14.5,green);
        for(let i=0;i<5;i++){
          const z=14+Math.sin((i+.5)/5*Math.PI)*4;
          box(-16+i*5,-15,5,24,z,.8,"#89b1aa",i%2?"#a2d1cd":"#b3dcd1");
        }
        box(11,7,1.6,1.6,0,16,blue);box(7.5,6.3,9,2,13.5,8,green);
        symbol(12,8.5,17.4,"M","#fff7d5",5.9); tree(-15,17,.75);break;
      }
      case 1: { // Train station: clock gable and blue passenger train
        ground(6,-20,11,40,"#b7b2a0");
        for(let y=-18;y<20;y+=4)ground(6,y,11,1.3,"#918b76");
        ground(7,-20,.9,40,"#edefdc");ground(14,-20,.9,40,"#edefdc");
        hut(-18,-13,22,24,14,"#738f9d"); facade(-18,-13,22,24,14,3);
        hut(-7,5,11,10,19,"#628b98");front(-5,15,0,6.3,8,blue);
        const [a,b]=p(-1.7,15,16);dot([a,b],3.3,3.5,"#eab766");dot([a,b],2.4,2.6,"#fff2cc");line([[a,b-1.5],[a,b],[a+1.1,b+.6]],"#5d696c",.8);
        box(8,-13,7,23,1,6,"#73a9b0","#eee3bf");side(15.1,-12,4,20,2.1,blue);front(9,10.1,3.6,5,2.2,blue);
        tree(-16,17,.85);break;
      }
      case 2: { // Bus terminal with aligned bays
        box(-19,-16,32,14,0,13,"#e5c89b","#628ea0");ribbon(-19,-16,32,14,4,6);
        for(let i=0;i<3;i++){
          const x=-14+i*11;ground(x-1,0,1,17,"#fff2cc");bus(x,2,["#dc8664","#699b85","#e7ba5e"][i]);
        }
        box(-19,-4,33,4,11,2,"#ddb65e","#f0d079");break;
      }
      case 3: { // Passenger ferry at a waterfront pier
        ground(-1,-20,21,39,"#82bdc5");
        for(let y=-15;y<19;y+=7)ground(13,y,5,.65,"#cee3d4");
        box(-18,-14,15,23,0,12,cream,"#739ca0");ribbon(-18,-14,15,23,4,5);
        box(-5,-8,8,19,0,2.5,"#bc9570","#d6ae80");
        const hull=[[4,-13],[11,-16],[14,-9],[14,9],[9.5,16],[4,10]];
        poly(hull.map(([x,y])=>p(x,y,1)),"#4f7d94");
        poly(hull.map(([x,y])=>p(x,y,3.8)),"#fff0d4",ink);
        box(5,-8,7,16,3.8,3.6,cream,"#80acb1");ribbon(5,-8,7,16,4.6,1.7,blue);
        box(7,-6,3,3,7.4,3.6,terra);flag(10,1,7.4,ochre);break;
      }
      case 4: { // Traditional market, multicoloured rows of peaked stalls
        ground(-3,-19,7,38,"#c8ae8c");
        for(let j=0;j<3;j++) for(let i=0;i<2;i++){
          const x=-17+i*22,y=-17+j*12,col=[terra,ochre,green,"#ce7760","#5e969c","#e3aa60"][j*2+i];
          box(x,y,12,9,0,5,"#c39870");
          for(const a of [x,x+11])box(a,y+8,1,1,5,4,"#9d795f");
          pitched(x-1,y-1,14,11,9,3.5,col);
          for(let k=0;k<3;k++)box(x+k*3.5+.5,y+8.4,2.5,1.2,4.3,1.7,["#95ae62","#e39b4f","#c9775b"][k]);
        }break;
      }
      case 5: { // Department store with cream levels and curved central tower
        box(-16,-14,32,27,0,19,"#e8d3ba","#f4dba9");ribbon(-16,-14,32,27,6,8,"#9cbaca");
        box(-14,-12,28,23,19,6,"#e8d4b5","#f4e0b7");ribbon(-14,-12,28,23,20,2.2);
        box(-7,5,14,11,0,29,"#d89582","#e8b79e");
        for(let i=0;i<3;i++) front(-5,16.1,4+i*7,10,4.4,cream);
        box(-9,12,18,7,8,2,"#d3ab78","#efd09b");tree(-15,18,.8);break;
      }
      case 6: { // Hypermarket with large striped canopy and cart bays
        box(-18,-16,35,26,0,16,"#edce9e","#f4d7a9");
        for(let i=0;i<8;i++)box(-18+i*4.4,8,4.4,5,10,2,i%2?"#fff0c9":"#d76f57");
        ribbon(-18,-16,35,26,2,6);
        box(-13,9.9,25,1,13,3.7,"#df8c63");symbol(0,11,14.8,"MART","#fff8db",3.9);
        for(let i=0;i<3;i++){ box(5+i*2.2,14,1.7,4,0,2.8,"#8da8a7"); }break;
      }
      case 7: { // Office high-rise: setbacks, glass bands, rooftop antenna
        box(-16,-11,18,20,0,19,"#c8c9b8","#e1ded0");facade(-16,-11,18,20,19,3,2);
        box(-6,-13,20,22,0,43,"#7da1ac","#b8cac7");
        for(let z=4;z<42;z+=5)ribbon(-6,-13,20,22,z,2.8,"#acd5d6");
        box(-3,-10,14,16,43,5,"#92aeb0","#c3d3c8");
        box(1,-5,1.1,1.1,48,9,"#8f9c98");tree(11,15,.8);break;
      }
      case 8: { // Sawtooth production hall and twin chimneys
        for(let i=0;i<2;i++){
          box(4+i*6,-17,3.4,3.4,0,27+i*5,"#cf967a");
          for(let z=14;z<=24;z+=7)box(4+i*6,-17,3.4,3.4,z,2.3,"#ecdbc1");
        }
        box(-18,-9,32,24,0,12,"#c99272","#cca47a");facade(-18,-9,32,24,12,6);
        for(let j=0;j<3;j++){
          const y=-9+j*8;
          quad([[-18,y,12],[14,y,12],[14,y+7.8,17],[-18,y+7.8,17]],"#799e9c",ink);
          front(-18,y+7.8,12,32,4.9,"#a4c1b8");
        }break;
      }
      case 9: { // Distribution centre with containers and loading truck
        box(-18,-15,33,22,0,15,"#d2c8ab","#92abb1");
        for(let i=0;i<6;i++)ground(-15+i*5,-14,.65,19,"#b8c5bd",15.1);
        for(let i=0;i<3;i++)front(-15+i*10,7.1,1,7,7,"#758b89");
        box(-14,9,8,11,0,5,"#d59165","#e6ab78");box(-4,9,7,10,0,5,"#7daaa3","#a6c2ac");
        box(7,8,6,8,1,5,cream);box(7,16,6,4,1,3.6,terra);
        front(8,20.1,2.5,4,1.5,blue);break;
      }
      case 10: { // City hall with administrative tower and clock
        box(-18,-13,34,22,0,12,cream,"#82a79e");facade(-18,-13,34,22,12,6);
        box(-6,-9,12,21,0,23,"#ecdcb6","#a9bfab");
        dot(p(0,12.2,18.9),2.7,2.9,"#fff9d7");
        const [a,b]=p(0,12.2,18.9);line([[a,b-1.8],[a,b],[a+1.3,b]],"#677e76",.85);
        stairs(-5,12,10,4);flag(0,-1,23,terra);tree(-15,16,1);tree(13,16,1);break;
      }
      case 11: { // Courthouse: raised steps, six columns, stone pediment
        box(-16,-14,32,23,0,14,"#ddd1b2","#d9c4a0");
        stairs(-15,9,30,6);columns(-14,12,28,5,14);
        box(-17,6,34,10,14,2.6,cream,"#e7d7b1");
        quad([[-17,16,16.6],[17,16,16.6],[0,16,24]],"#f1ddb4",ink);
        quad([[0,16,24],[17,16,16.6],[17,-13,16.6],[0,-13,24]],"#a8a482",ink);
        symbol(0,16.3,18.7,"✦","#ad925c",4.5);break;
      }
      case 12: { // Police headquarters, badge and patrol vehicle
        box(-16,-13,30,24,0,18,"#d4dbd2","#6995ad");ribbon(-16,-13,30,24,5,6);
        box(-7,5,13,9,0,22,"#5e8198","#83a3ad");
        const [a,b]=p(0,14.3,17);poly([[a-3.3,b-2.6],[a+3.1,b-1.5],[a+2.7,b+1.1],[a,b+3.8],[a-3,b+1.1]],"#f5d588");
        front(-4,14.1,0,7,8,glass);
        box(7,13,5,8,1,2.8,"#e2ede2");box(7.6,14,3.8,3.8,3.8,1.6,blue);tree(-14,17,.9);break;
      }
      case 13: { // Fire station: scarlet hose tower and a ladder engine in the forecourt.
        box(4,-19,12,12,0,39,"#cc5142","#ffdb9b");
        for(const z of [12,20,28]) front(6,-6.9,z,6.5,4,"#644b4d");
        box(3,-20,14,14,37,2,"#bd443a","#ffb780");
        box(-19,-11,32,21,0,18,"#cf5144","#ed8660");
        for(const x of [-16,-2]) {
          front(x,10.1,1,11,12,"#61494a");
          front(x,10.2,8,11,4,"#789090");
        }
        symbol(-3,10.2,15,"119","#fff8d9",6.4);
        box(-9,10,10,13,1.4,6,"#d84533","#ee6551");
        box(-9,18,10,5,3,6.4,"#e34f3e","#fff0c6");
        front(-8.1,23.1,5.2,8.2,3.4,"#52808a");
        for(const y of [12,20])dot(p(1.1,y,1.6),1.55,2.05,"#3c4b49");
        const ladderBase=p(-4,12,8), ladderTop=[ladderBase[0]-11,ladderBase[1]-26];
        line([ladderBase,ladderTop],"#5f7472",2.2);
        line([[ladderBase[0]+4,ladderBase[1]],[ladderTop[0]+4,ladderTop[1]]],"#5f7472",2.2);
        for(let i=0;i<=5;i++){const f=i/5,x=ladderBase[0]-11*f,y=ladderBase[1]-26*f;line([[x,y],[x+4,y]],"#e3d9b8",1.3)}
        break;
      }
      case 14: { // Post office: broad red mansard and envelope emblem
        box(-16,-13,31,24,0,15,"#f1d3ae","#cc795e");ribbon(-16,-13,31,24,4,5);
        pitched(-17,-14,33,25,15,4,"#d47c63");
        box(-7,9,15,5,0,12.5,"#f3d9ad","#d88862");front(-4,14.1,0,8,6.2,glass);
        front(-3,14.1,8,9,4.5,"#e09164");
        line([p(-3,14.3,12.3),p(1.5,14.3,9.1),p(6,14.3,12.3)],cream,.8);
        box(-13,15,3,3,0,6.4,terra);front(-12.6,18,4.6,2,.6,"#6e7168");tree(13,15,.83);break;
      }
      case 15: { // Hospital: segmented wings and prominent cross
        box(-17,-12,15,23,0,17,"#e5e7d8","#a3c3bb");facade(-17,-12,15,23,17,3,2);
        box(-4,-15,19,26,0,30,"#e5e8da","#b3d4cc");
        for(let z=4;z<22;z+=6)ribbon(-4,-15,19,26,z,3.3);
        front(2,11.1,22,7,2.4,"#dc7864");front(4.3,11.1,19.8,2.4,7,"#dc7864");
        box(-6,9,15,7,7,2,"#86b3b0","#a2cebf");tree(13,17,.8);break;
      }
      case 16: { // University: red-brick academic quad with a clock tower
        hut(-17,-15,31,13,13,"#6f8c8e");front(-17,-1.9,0,31,12,"#c98e70");facade(-17,-15,31,13,13,6);
        hut(-17,-1,11,16,9,"#749493");hut(6,-1,10,13,9,"#749493");
        box(-6,-7,10,12,0,26,"#cb9677","#ead1a4");pitched(-7,-8,12,14,26,6,"#628388");
        dot(p(-1,5.1,22),2,2.2,cream);ground(-4,6,8,12,"#d3b99b");tree(-10,17,.72);tree(13,17,.72);break;
      }
      case 17: { // Public library: open-book canopy with contrasting glazed spine
        box(-17,-13,33,24,0,16,"#dfbc90","#f4e4bb");ribbon(-17,-13,33,24,3,9);
        for(let i=0;i<6;i++)box(-15+i*5.4,10.7,1,1.4,2,12,"#ce9870");
        quad([[-18,-14,21],[-1,-14,16.5],[-1,13,16.5],[-18,13,21]],"#f1dab0",ink);
        quad([[-1,-14,16.5],[17,-14,21],[17,13,21],[-1,13,16.5]],"#fff0c9",ink);
        line([p(-18,13,21),p(-1,13,16.5),p(17,13,21)],"#a47e5b",1.5);
        stairs(-6,12,13,3);tree(14,17,.85);break;
      }
      case 18: { // Performing arts: an open proscenium, parted velvet curtains, spotlights.
        box(-17,-13,33,23,0,10,"#d8af76","#edc990");
        const stage=[[17,35],[68,42],[68,71],[17,64]];
        poly([[17,35],[31,25],[82,32],[68,42]],"#dda660",ink);
        poly([[68,42],[82,32],[82,61],[68,71]],"#ab7457",ink);
        poly(stage,"#77404e","#956949",1.3);
        poly([[21,39],[64,45],[64,66],[21,60]],"#413344");
        poly([[20,37],[38,40],[32,48],[26,51],[29,59],[20,60]],"#d85864");
        poly([[47,41],[65,43],[65,66],[58,65],[59,55],[53,51]],"#db5d6a");
        line([[20,36],[65,42]],"#ffcf77",2.8);
        line([[21,51],[28,52]],"#eebe67",2);line([[58,54],[65,55]],"#eebe67",2);
        poly([[17,62],[67,69],[76,63],[27,56]],"#c38a58",ink);
        line([[37,57],[40,45],[53,46]],"#ffdf86",2.5);
        dot([38,55],2.7,1.8,"#ffdb79");dot([50,57],2.7,1.8,"#ffdb79");line([[52,56],[53,46]],"#ffdf86",2);
        for(const x of [25,37,49,61])dot([x,36+(x-20)*.13],1.25,1.25,"#fff4b1");
        stairs(-8,14,24,4);break;
      }
      case 19: { // Cinema: giant monochrome clapperboard and luminous theatre marquee.
        box(-18,-14,35,24,0,18,"#9d7585","#d19aa2");
        front(-15,10.1,0,29,10,"#654d60");front(-12,10.2,0,9,8,glass);front(2,10.2,0,9,8,glass);
        box(-18,7,36,7,10,4,"#dfaa4f","#ffdd83");
        for(let i=0;i<8;i++)dot(p(-16+i*4.4,14.2,12),.9,1,"#fff7cf");
        ground(-6,13,12,8,"#c65460");
        poly([[27,32],[66,37],[66,56],[27,51]],"#334652","#233b44",1);
        poly([[27,29],[65,20],[66,25],[28,35]],"#334652",ink);
        for(let i=0;i<4;i++){const x=29+i*9,y=29-i*2.2;poly([[x,y],[x+5,y-1.3],[x+8,y+3.2],[x+3,y+4.5]],"#fff5dc")}
        for(let i=0;i<4;i++){const x=28+i*9,y=33+i*1.2;poly([[x,y],[x+5,y+.7],[x+8,y+4.8],[x+3,y+4.1]],"#ffefcf")}
        poly([[42,39],[42,47],[50,44]],"#fff2bd");
        break;
      }
      case 20: { // History museum: sandstone dome and a mounted long-neck fossil.
        box(-19,-14,36,25,0,19,"#dfba82","#efd6a5");
        const [a,b]=p(0,-5,19);ctx.beginPath();ctx.ellipse(a,b,15,14,0,Math.PI,Math.PI*2);
        ctx.fillStyle="#699990";ctx.fill();dot([a,b],15,3.5,"#82aea1");
        line([[a,b-14],[a,b-17]],"#a6824f",1.5);
        front(-17,11.05,3,32,13,"#836a53");
        const fossil=[[21,62],[29,63],[38,62],[47,59],[54,60],[59,54],[60,49],[65,48]];
        line(fossil,"#fff0c4",2.5);dot([65,48],2.7,1.7,"#fbe5b4");
        for(const x of [36,40,44,48])line([[x,61],[x+1,65],[x+3,66]],"#f9e4b4",1.25);
        line([[36,63],[34,68],[35,72]],"#fff0c4",1.9);line([[51,61],[52,66],[50,70]],"#fff0c4",1.9);
        stairs(-15,12,29,4);tree(18,4,.9);break;
      }
      case 21: { // Art gallery: white interlocking gallery cubes, framed painting, red sculpture.
        box(-18,-17,22,19,0,26,"#eee8d8","#fff6dd");
        box(0,-15,17,23,0,15,"#d7dfd5","#f4eddb");ribbon(0,-15,17,23,3,8,"#7d9fa0");
        front(-16,2.1,7,18,15,"#aa7952");front(-14.3,2.2,8.8,14.7,11.5,"#eee7c9");
        front(-13.2,2.3,10,6,8.6,"#eea548");front(-6,2.3,10,4.7,5.2,"#4c9696");
        box(-9,10,16,10,0,2.7,"#c8c7b8","#eee7d1");
        const [sx,sy]=p(-2,14,2.7);
        poly([[sx-7,sy],[sx-1,sy+1],[sx+10,sy-18],[sx+7,sy-23],[sx,sy-17]],"#b94834",ink);
        poly([[sx-3,sy-24],[sx+5,sy-24],[sx+12,sy-17],[sx+7,sy-12],[sx+2,sy-17]],"#ed7354",ink);
        dot([sx-2,sy-24],4,4,"#efaa50");break;
      }
      case 22: { // Outdoor athletics stadium: open banked seats, running lanes and football pitch.
        const a=50,b=63;
        function oval(rx,ry,fill,dy=0){dot([a,b+dy],rx,ry,fill)}
        oval(39,20,"#737f86",4);oval(39,20,"#d8d8c4");
        oval(36,17.7,"#6998ac");oval(33,15.7,"#e5dabe");oval(31,14.3,"#bf694e");
        for(const [rx,ry] of [[28.5,12.5],[25.9,10.8]]){
          ctx.beginPath();ctx.ellipse(a,b,rx,ry,0,0,Math.PI*2);
          ctx.lineWidth=.8;ctx.strokeStyle="#ffe3bc";ctx.stroke();
        }
        oval(23.7,9,"#70aa62");ctx.save();ctx.translate(a,b);ctx.scale(1,.43);
        ctx.lineWidth=1.5;ctx.strokeStyle="#eff5cc";ctx.strokeRect(-17,-13,34,26);
        line([[0,-13],[0,13]],"#eff5cc",1.3);ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.stroke();
        ctx.strokeRect(-17,-5,4,10);ctx.strokeRect(13,-5,4,10);ctx.restore();
        for(const [x,y] of [[18,52],[80,52],[21,76],[79,76]]){
          line([[x,y],[x,y-19]],"#637e79",1.4);
          line([[x-3,y-19],[x+3,y-19]],"#45676e",3.6);
          for(const dx of [-2,0,2])dot([x+dx,y-19],.75,.85,"#ffecad");
        }break;
      }
      case 23: { // Indoor gym: closed ribbed blue barrel roof and a large orange basketball.
        box(-18,-15,34,28,0,12,"#d2c5a8","#95b4bb");ribbon(-18,-15,34,28,3,5,"#6e929c");
        const roof=(x,t)=>p(x,-15+28*t,12+Math.sin(Math.PI*t)*16);
        for(let j=0;j<12;j++){
          const t=j/12,u=(j+1)/12;
          poly([roof(-19,t),roof(17,t),roof(17,u),roof(-19,u)],["#7baec1","#75a8bc","#689bb0","#588ba4"][Math.min(3,Math.floor(j/3))]);
          poly([p(17,-15+28*t,12),roof(17,t),roof(17,u),p(17,-15+28*u,12)],"#82a6ac");
        }
        for(const x of [-16,-7,2,11,17]){const points=[];for(let j=0;j<=16;j++)points.push(roof(x,j/16));line(points,"#accdd1",1.05)}
        box(-8,10,17,8,0,9,"#d3a877","#efc58a");front(-4,18.1,0,9,6,glass);
        const [x,y]=p(0,14,15);dot([x,y],7.6,7.6,"#995738");dot([x,y],6.8,6.8,"#eea24c");
        line([[x-6.8,y],[x+6.8,y]],"#975c3d",1);line([[x,y-6.8],[x,y+6.8]],"#975c3d",1);
        for(const sign of [-1,1]){const arc=[];for(let i=0;i<=8;i++){const t=i*Math.PI/8;arc.push([x+sign*(1.6+2.4*Math.sin(t)),y-6.6*Math.cos(t)])}line(arc,"#975c3d",.95)}
        break;
      }
      case 24: { // Urban park, pond, looping path and pavilion
        const [a,b]=p(0,0);dot([a,b],22,10,"#dfc796");dot([a,b],17.5,6.5,"#94bd81");
        dot(p(4,-6),9,3.7,"#85bbc1");dot(p(3,-6),5.5,1.6,"#a4d2cd");
        for(const [x,y,s] of [[-16,-10,1.15],[-9,-15,1.3],[13,-12,1.05],[-17,6,.9],[11,14,.95]])tree(x,y,s);
        for(const x of [-4,2])for(const y of [6,12])box(x,y,1,1,0,6,"#9b7b55");
        pitched(-6,4,11,10,6,4.5,"#bc8062");ground(8,6,7,2.2,"#ae8b66",1.7);break;
      }
      case 25: { // Amusement park: wheel, swinging cabins and carousel
        const [a,b]=p(-5,-5,18);
        line([[a-5,b+18],[a,b],[a+5,b+19]],"#739797",2);
        ctx.beginPath();ctx.ellipse(a,b,12,16,.13,0,Math.PI*2);ctx.strokeStyle="#d59a69";ctx.lineWidth=1.9;ctx.stroke();
        for(let i=0;i<9;i++){
          const t=i*Math.PI*2/9,u=a+Math.cos(t)*12,v=b+Math.sin(t)*16;
          line([[a,b],[u,v]],"#e1b77e",.85);dot([u,v+1.4],2.1,1.8,[terra,green,ochre][i%3]);
        }
        dot([a,b],2.5,2.5,"#c78264");
        const [u,v]=p(12,7);dot([u,v],8,3.8,"#cca171");
        for(const dx of [-5,0,5])line([[u+dx,v-1],[u+dx,v-6]],"#b68a56",1);
        for(let i=0;i<4;i++)poly([[u,v-12],[u-9+i*4.5,v-5],[u-4.5+i*4.5,v-4]],i%2?cream:terra);
        tree(-13,14,.8);break;
      }
    }
    ctx.restore();
  }
  global.drawCityArt = drawCityArt;
})(globalThis);
