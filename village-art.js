/* Hand-drawn miniature buildings, keyed by their saved village item IDs. */
(function () {
  "use strict";
  const paper = "#fff4d9", blueGlass = "#a8d9d3", darkGlass = "#486d73";
  const clay = "#cd795a", sage = "#82aa89", teal = "#4d9794", rose = "#d48d92";

  function drawVillageArt(ctx, id) {
    if (!Number.isInteger(id) || id < 0 || id > 25) return;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    function point(x, y, h = 0) { return [15 + x + y * .6, 76 + x * .17 - y * .45 - h]; }
    function tint(hex, scale) {
      const channels = [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * scale))));
      return "rgb(" + channels.join(",") + ")";
    }
    function polygon(coords, color) {
      ctx.beginPath(); coords.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
    function face(coords, color) { polygon(coords.map(p => point(...p)), color); }
    function line(coords, color, weight = 1.5) {
      ctx.beginPath(); coords.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
    }
    function rail(coords, color, weight) { line(coords.map(p => point(...p)), color, weight); }
    function oval(x,y,rx,ry,color) {
      ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
    }
    function box(x,y,w,d,z,h, wall, top=wall, side=null) {
      const a=x+w,b=y+d,k=z+h;
      face([[x,y,z],[a,y,z],[a,y,k],[x,y,k]],wall);
      face([[a,y,z],[a,b,z],[a,b,k],[a,y,k]], side || tint(wall,.8));
      face([[x,y,k],[a,y,k],[a,b,k],[x,b,k]],top);
    }
    function front(x,y,h,w,height,color) {
      face([[x,y,h],[x+w,y,h],[x+w,y,h+height],[x,y,h+height]],color);
    }
    function window(x,y,h,w,height) {
      front(x,y,h,w,height,"#fff2dc"); front(x+.8,y-.1,h+1,w-1.6,height-1.9,blueGlass);
      if(w>7) front(x+w*.5-.4,y-.2,h+1,.8,height-2,"#fff0cf");
      rail([[x-.3,y-.2,h],[x+w+.3,y-.2,h]],"#b69b79",1);
    }
    function door(x,y,h,w,height) {
      front(x,y,h,w,height,"#735e59"); front(x+.9,y-.1,h+.7,w-1.8,height-1.7,darkGlass);
      front(x+1.6,y-.2,h+height*.45,w-3.2,height*.46,blueGlass);
      front(x+w-2,y-.3,h+height*.3,.8,1.5,paper);
    }
    function slopeRoof(x,y,w,d,z,rise,col) {
      const a=x-2,b=x+w+2,f=y-2,t=y+d+2,m=(f+t)/2;
      face([[a,m,z+rise],[b,m,z+rise],[b,t,z],[a,t,z]],tint(col,.85));
      face([[a,f,z],[b,f,z],[b,m,z+rise],[a,m,z+rise]],col);
      face([[b,f,z],[b,t,z],[b,m,z+rise]],tint(col,.72));
      rail([[a,f,z],[b,f,z]],tint(col,.77),2);
      rail([[a,m,z+rise],[b,m,z+rise]],tint(col,1.13),1.6);
      for(let u=a+7;u<b-2;u+=8) rail([[u,f+.8,z+.6],[u,m-.5,z+rise-.4]],tint(col,.92),.65);
    }
    function flatRoof(x,y,w,d,h,c) {
      box(x-1,y-1,w+2,d+2,h,2,c,tintHex(c,.92));
      face([[x+2,y+2,h+2.1],[x+w-2,y+2,h+2.1],[x+w-2,y+d-2,h+2.1],[x+2,y+d-2,h+2.1]],tint(c,.78));
    }
    function tintHex(c, amount) {
      return "#"+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(c.slice(i,i+2),16)*amount)).toString(16).padStart(2,"0")).join("");
    }
    function plant(x,y,size=5,flowers=false) {
      const [a,b]=point(x,y);
      oval(a+.5,b+.2,size*.75,size*.25,"#b8ad86");
      polygon([[a-size*.6,b-size],[a+size*.6,b-size],[a+size*.42,b],[a-size*.43,b]],"#c18668");
      oval(a-.24*size,b-size*1.3,.6*size,.62*size,sage);
      oval(a+.25*size,b-size*1.55,.56*size,.66*size,"#528675");
      if(flowers) {
        oval(a-size*.4,b-size*1.55,size*.27,size*.27,"#ffcb71");
        oval(a+size*.24,b-size*1.84,size*.3,size*.3,"#ed9992");
      }
    }
    function awning(x,y,z,w,col) {
      for(let i=0;i<6;i++) {
        const a=x+i*w/6,b=x+(i+1)*w/6,c=i%2?paper:col;
        face([[a,y,z+1],[b,y,z+1],[b,y-6,z-1.5],[a,y-6,z-1.5]],c);
        front(a,y-6,z-3.7,b-a,2.4,c);
      }
    }
    // Painter's drawing space for signage fixed to the building facade.
    function emblem(x,y,h,s,type) {
      const [a,b]=point(x,y,h); ctx.save(); ctx.transform(s,.17*s,0,s,a,b);
      const lo="#654f49", red="#cb6956", yellow="#edb65e";
      switch(type) {
        case "rice":
          oval(0,1,7,3,lo); polygon([[-7,1],[7,1],[3,5],[-3,5]],"#cb765f");
          for(let i=-3;i<=3;i+=3) line([[i-1,0],[i+1,-3]],paper,2.1); break;
        case "bread":
          ctx.save(); ctx.rotate(-.23); oval(0,0,7,3.6,"#cd8953");
          [-3,0,3].forEach(n=>line([[n-1,-2],[n+.6,.1]],"#ffe4a5",1.2)); ctx.restore(); break;
        case "chicken":
          line([[0,0],[5,3]],paper,2.8); oval(6,3,1.8,2,paper); oval(-2,-1,5.3,3.9,"#ce8852"); break;
        case "pizza":
          polygon([[-6,-4],[7,-3],[-1,6]],"#eebd5b"); line([[-6,-4],[7,-3]],"#a96e4d",2);
          oval(-1,-1,1.25,1.25,red); oval(2,-1,1,1,red); break;
        case "burger":
          oval(0,-1.5,6.4,3.3,yellow); line([[-5.8,.6],[5.8,.6]],sage,1.9);
          line([[-5.5,2.2],[5.5,2.2]],lo,1.7); line([[-4.8,4],[4.8,4]],yellow,2.5); break;
        case "cup":
          line([[3,-2],[7,-2],[6,1],[3,1]],lo,1.4); polygon([[-5,-3],[4,-3],[3,3],[-3,3]],"#91644f");
          line([[-5,4],[5,4]],lo,1); line([[-2,-5],[-1,-7]],"#bd9872",1); break;
        case "pencil":
          line([[-4,3],[4,-5]],yellow,3); polygon([[-5,4],[-2,3],[-4,1]],lo); break;
        case "wash":
          polygon([[-5,-5],[5,-5],[5,5],[-5,5]],"#edf2e9"); oval(0,1,3,3,"#6f9eaf"); oval(0,1,1.8,1.8,blueGlass); break;
        case "scissors":
          oval(-3,2,2,2,"#a75b66"); oval(2,3,2,2,"#a75b66"); line([[-2,1],[4,-5]],lo,1.4); line([[1,1],[-2,-5]],lo,1.4); break;
        case "cross":
          polygon([[-2,-5],[2,-5],[2,-2],[5,-2],[5,2],[2,2],[2,5],[-2,5],[-2,2],[-5,2],[-5,-2],[-2,-2]],"#578b72"); break;
        case "flower":
          [[0,-3],[3,-1],[2,2],[-2,2],[-3,-1]].forEach(([u,v])=>oval(u,v,2.3,2.3,rose)); oval(0,0,1.8,1.8,yellow); break;
        case "belt":
          polygon([[-7,-4],[-3,-5],[0,0],[3,-5],[7,-4],[4,4],[-4,4]],"#faf1da");
          line([[-5,1],[4,1],[5,3]],lo,1.6); break;
        case "piano":
          polygon([[-7,-4],[7,-4],[7,4],[-7,4]],"#fff7e1");
          [-4,-1,3,5].forEach(n=>line([[n,-4],[n,-.7]],lo,1.5)); break;
        case "book":
          polygon([[-7,-4],[0,-2],[0,5],[-7,3]],"#ccd6a3"); polygon([[0,-2],[7,-5],[7,2],[0,5]],"#fff3d2"); break;
        case "clock":
          oval(0,0,4.8,4.8,"#fff2cc"); line([[0,-3],[0,.2],[2,1.4]],lo,1.1); break;
        case "bus":
          polygon([[-5,-4],[5,-4],[5,3],[-5,3]],paper); polygon([[-3.3,-2.7],[3.3,-2.7],[3.3,.5],[-3.3,.5]],teal);
          oval(-2.8,3.8,1.1,1.1,lo); oval(2.8,3.8,1.1,1.1,lo); break;
      }
      ctx.restore();
    }
    function shadowPad(c="#e4d7b5") {
      face([[-3,-3,-1],[58,-3,-1],[58,34,-1],[-3,34,-1]],"#c5b692");
      face([[-3,-3,.4],[58,-3,.4],[58,34,.4],[-3,34,.4]],c);
    }
    function shop(settings) {
      const {roof,body="#f3dcb7",mark, sign="#fff0d2", w=45,h=25,pitched=false, striped=true}=settings;
      const x=4,y=4,d=23; shadowPad(); box(x,y,w,d,.5,h,body);
      if(pitched) slopeRoof(x,y,w,d,h+1,9,roof);
      else flatRoof(x,y,w,d,h+1,roof);
      front(x+1,y-.1,h-7,w-2,7,sign);
      emblem(x+w*.49,y-.3,h-3.2,.78,mark);
      window(x+3,y-.1,3,w*.48,11); door(x+w*.66,y-.1,1,9,13);
      for(let i=0;i<2;i++) {
        const v=y+5+i*9;
        face([[x+w+.1,v,6],[x+w+.1,v+5,6],[x+w+.1,v+5,14],[x+w+.1,v,14]],darkGlass);
      }
      if(striped) awning(x+1,y-.4,h-8,w-2,roof);
      plant(x+w+3,y+1,4.6,mark==="flower");
    }
    // Small-screen landmarks use broad silhouettes: most occupy half the roof.
    function snackStall() {
      shadowPad();box(7,9,37,19,1,17,"#be5745","#edb583");
      box(4,5,43,8,10,3,"#733e37","#f3d3a3");
      for(const x of [9,40])rail([[x,8,12],[x,8,33]],"#835449",2.3);
      slopeRoof(5,7,40,22,29,5,"#ee7654");awning(5,6,29,40,"#d65e4e");
      const [u,v]=point(25,14,37);
      oval(u,v+3,16,5,"#854333");
      polygon([[u-16,v+2],[u+16,v+2],[u+10,v+11],[u+4,v+13],[u-7,v+12]],"#cb5444");
      oval(u,v+1,15,4.5,"#e78443");
      for(const [a,b] of [[-8,0],[0,-1],[7,0]])line([[u+a-2,v+b+1],[u+a+1,v+b-2]],"#fff0bb",3.7);
      line([[u+4,v],[u+13,v-16]],"#835b3b",2);
      line([[u+10,v-1],[u+19,v-16]],"#835b3b",2);
      box(5,-1,9,5,1,4,"#dcb154");box(39,0,9,5,1,4,"#dcb154");
    }
    function bakehouse() {
      shadowPad();box(6,6,42,24,1,22,"#e6b37b");flatRoof(6,6,42,24,23,"#a56a49");
      const [u,v]=point(27,15,35);ctx.save();ctx.translate(u,v);ctx.rotate(-.25);
      oval(1,3,26,10,"#9b613d");oval(0,0,26,10,"#e6a24f");
      oval(-3,-3,20,5,"#f4bd70");
      [-12,-1,10].forEach(a=>line([[a-3,-6],[a+2,1]],"#fff0bd",3));ctx.restore();
      door(9,5.8,1,8,16);window(23,5.8,5,20,12);
      for(const x of [25,31,37]){const [a,b]=point(x,5,8);oval(a,b,2.5,1.8,"#e59d52")}
      box(44,0,8,5,1,7,"#a87854","#e5c198");plant(2,4,4.5);
    }
    function chickenKitchen() {
      shadowPad();box(10,7,31,23,1,24,"#ffda86");flatRoof(10,7,31,23,25,"#a74f39");
      door(13,6.8,1,8,14);window(26,6.8,5,11,10);
      const [u,v]=point(25,13,31);
      polygon([[u-18,v-15],[u+19,v-13],[u+13,v+8],[u-11,v+5]],"#c8493c");
      polygon([[u-11,v-13],[u-4,v-13],[u-3,v+6],[u-8,v+5]],paper);
      polygon([[u+3,v-13],[u+11,v-13],[u+6,v+6],[u+2,v+6]],paper);
      oval(u,v-14,19,5,"#974638");oval(u,v-15,16,3,"#e5a46a");
      line([[u+8,v-20],[u+16,v-31]],paper,5);
      oval(u+15,v-31,3,3,"#fff6d9");oval(u+19,v-29,3.1,3.1,"#fff6d9");
      oval(u+5,v-21,8,9,"#b77139");oval(u+3,v-23,6.8,7.4,"#e9a149");
      oval(u-9,v-19,6,6.5,"#d9883d");
    }
    function pizzeria() {
      shadowPad();box(4,7,38,21,1,24,"#e7b38c");slopeRoof(4,7,38,21,25,7,"#578663");
      box(40,14,9,10,1,34,"#b56c50");box(38.5,13,12,12,34,3,"#a35b46","#d79b75");
      door(8,6.8,1,8,14);window(20,6.8,5,17,9);
      const [u,v]=point(24,16,43);
      polygon([[u-15,v-9],[u+18,v-7],[u+4,v+14],[u+1,v+16]],"#ac683b");
      polygon([[u-15,v-10],[u+18,v-8],[u+2,v+13]],"#f5c851");
      line([[u-15,v-10],[u+1,v-12],[u+18,v-8]],"#cd8249",4);
      [[-6,-6],[8,-5],[1,2]].forEach(([a,b])=>oval(u+a,v+b,2.6,2.4,"#bd4c3d"));
      box(43,-1,9,6,1,4,"#b77e52");plant(1,2,4.5);
    }
    function coffeeHouse() {
      shadowPad();box(8,8,32,23,1,22,"#b88a69");flatRoof(8,8,32,23,23,"#597e72");
      door(11,7.8,1,8,15);window(23,7.8,4,13,12);
      const [u,v]=point(23,17,34);
      oval(u,v+9,20,4,"#ded1a1");oval(u,v+7,19,3,"#f6e9c2");
      ctx.beginPath();ctx.ellipse(u+14,v-2,7,6,-.3,0,Math.PI*2);ctx.strokeStyle="#477c75";ctx.lineWidth=4;ctx.stroke();
      polygon([[u-15,v-9],[u+13,v-8],[u+11,v+3],[u+5,v+7],[u-5,v+7],[u-11,v+3]],"#4d9389");
      oval(u-1,v-9,14,4.3,"#c6e8d1");oval(u-1,v-9,11.5,2.7,"#75523f");
      line([[u-4,v-17],[u-6,v-20],[u-3,v-23]],"#b6b394",1.9);
      const [a,b]=point(48,1);line([[a,b],[a,b-6]],"#79583f",2);oval(a,b-7,7,3,"#d2a375");
    }
    function cornerStore() {
      shadowPad();box(2,8,47,22,1,20,"#d1e7dc");flatRoof(2,8,47,22,21,"#528b8c");
      for(const [i,c] of ["#197e76","#fff4d6","#eca54b"].entries())box(1,6,49,25,19+2*i,2,c);
      door(7,7.8,1,9,15);window(19,7.8,3,25,13);
      const [a,b]=point(47,0);line([[a,b],[a,b-38]],"#777d70",2.6);
      polygon([[a-9,b-43],[a+10,b-43],[a+10,b-30],[a-9,b-30]],"#267e78");
      ctx.save();ctx.fillStyle="#fff6df";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.fillText("24",a+.3,b-33);ctx.restore();
    }
    function grocer() {
      shadowPad();box(4,11,38,20,1,21,"#bd905e");slopeRoof(4,11,38,20,22,7,"#6e9a58");
      awning(2,9,22,44,"#78a760");front(7,10,4,29,12,"#735f43");door(34,10,1,6,14);
      for(const [i,x] of [3,17,31].entries()){box(x,0,12,8,1,6,"#a5784b","#bb925b");for(const [a,b] of [[2,3],[7,3],[4,6],[9,6]]){const [u,v]=point(x+a,b,8);oval(u,v,3.2,3,["#e48743","#be5842","#91a956"][i])}}
      const [u,v]=point(24,18,35);oval(u,v,9,8,"#dd903f");oval(u+9,v+1,6,6,"#efaa4c");
      line([[u,v-6],[u+1,v-10]],"#72563a",2);oval(u+5,v-9,4.6,2,"#58864e");
    }
    function stationery() {
      shadowPad();box(11,9,33,20,1,21,"#e7b96a");flatRoof(11,9,33,20,22,"#d88955");
      door(17,8.8,1,8,14);window(28,8.8,4,12,10);
      for(const [x,z,c] of [[6,35,"#e49e3f"],[15,44,"#579b99"],[24,32,"#cf756d"]]){
        const [u,v]=point(x,18,22);polygon([[u-3,v],[u+4,v+1],[u+5,v-z+7],[u-2,v-z+6]],c);
        polygon([[u-2,v-z+6],[u+5,v-z+7],[u+2,v-z-2]],"#f8d9a7");
        polygon([[u+.5,v-z+1],[u+3.4,v-z+2],[u+2,v-z-2]],"#53535b");
      }
      box(44,1,8,4,1,9,"#b1815a");front(45,.8,3,6,5,"#f2d9a1");
    }
    function laundry() {
      shadowPad();box(8,7,37,22,1,26,"#bedde1");flatRoof(8,7,37,22,27,"#6e9aaa");
      box(10,5,24,18,1,29,"#f7f1dc","#f1ecd9");front(11,4.9,24,22,4,"#b8d8da");
      const [u,v]=point(22,4.8,14);oval(u,v,10.2,10.6,"#7299a6");oval(u,v,7.8,8.2,"#396879");oval(u-.3,v+1,5.7,5.2,"#7ebcc3");
      rail([[17,4.5,15],[21,4.5,13],[26,4.5,16]],"#dae9de",1.5);door(36,6.8,1,6,17);
      const [a,b]=point(32,18,33);for(const [dx,dy,r]of [[0,0,6],[7,-7,4.3],[1,-13,3]]){oval(a+dx,b+dy,r,r,"#87bfcb");oval(a+dx-.8,b+dy-1,r*.62,r*.62,"#e8f5eb")}
    }
    function salon() {
      shadowPad();box(11,7,29,24,1,25,"#dfb3bd");slopeRoof(11,7,29,24,26,7,"#9b6f89");
      door(15,6.8,1,8,17);window(26,6.8,5,10,12);
      const [u,v]=point(26,18,43);
      polygon([[u-1,v+4],[u+12,v-16],[u+8,v-4],[u+2,v+5]],"#63828d");
      polygon([[u+2,v+4],[u-12,v-17],[u-10,v-5],[u-1,v+6]],"#516c7a");
      for(const dx of [-6,7]){oval(u+dx,v+8,5.6,6,"#ac5370");oval(u+dx,v+8,2.8,3.1,"#fbdfc9")}
      oval(u,v+2,2,2,"#f3c66e");const [a,b]=point(42,6,18);
      line([[a,b+6],[a,b-6]],paper,4);[-4,0,4].forEach(d=>line([[a-1.3,b+d],[a+1.3,b+d+1]],"#d9777e",1.6));
    }
    function pharmacy() {
      shadowPad();box(6,7,42,22,1,22,"#e6eee1");flatRoof(6,7,42,22,23,"#6b9d86");
      box(6,6,15,9,1,31,"#8ebab0","#afd1b6");door(9,5.8,1,8,16);window(24,6.8,4,17,12);
      const [u,v]=point(24,16,39);
      const cross=[[-5,-13],[5,-13],[5,-5],[13,-5],[13,5],[5,5],[5,13],[-5,13],[-5,5],[-13,5],[-13,-5],[-5,-5]];
      polygon(cross.map(([x,y])=>[u+x+2,v+y+2]),"#375f53");
      polygon(cross.map(([x,y])=>[u+x,v+y]),"#348f6d");
      line([[u-7,v],[u+7,v]],"#ecf4d5",2.8);line([[u,v-7],[u,v+7]],"#ecf4d5",2.8);
    }
    function florist() {
      shadowPad("#e2dcc2");box(8,10,33,20,1,19,"#b7d8bd");slopeRoof(8,10,33,20,20,12,"#9fc5ae");
      [12,21,30].forEach(x=>window(x,9.8,4,7,11));
      const [u,v]=point(25,18,40);line([[u,v+16],[u,v]],"#528351",3);
      oval(u+6,v+10,5,2.5,"#5c9c60");
      for(let i=0;i<6;i++){const a=i*Math.PI/3;oval(u+Math.cos(a)*6.6,v+Math.sin(a)*6.6,5.2,5.2,"#df8792")}
      oval(u,v,5,5,"#f3be56");[5,16,31,43].forEach((x,i)=>plant(x,0,5.6+i%2,true));
    }
    function dojo() {
      shadowPad();box(5,8,41,23,1,23,"#d9d0b4");slopeRoof(4,7,43,25,24,7,"#526b79");
      rail([[1,5,29],[6,7,25],[44,7,25],[50,7,29]],"#475c66",2.8);
      door(10,7.8,1,9,15);window(25,7.8,4,14,10);
      const [u,v]=point(26,18,40);
      const uniform=[[-7,-10],[-14,-6],[-20,3],[-13,6],[-8,0],[-9,13],[10,13],[8,0],[14,6],[20,2],[14,-6],[7,-10],[0,-6]];
      polygon(uniform.map(([x,y])=>[u+x+1,v+y+1.5]),"#5c7378");polygon(uniform.map(([x,y])=>[u+x,v+y]),"#fff6dd");
      line([[u-5,v-9],[u+2,v-2],[u+6,v-8]],"#52616b",2);line([[u-8,v+5],[u+8,v+5]],"#334750",3.6);line([[u+1,v+6],[u+7,v+10]],"#334750",2.5);
    }
    function pianoStudio() {
      shadowPad();box(8,9,35,22,1,29,"#cbbbcf");flatRoof(8,9,35,22,30,"#7d778e");
      door(12,8.8,1,8,14);window(26,8.8,3,10,11);
      box(4,5,43,8,17,6,"#63586d","#f7ead7");
      for(let i=0;i<9;i++){const x=5+i*4.5;front(x,4.8,17.2,4,5.5,"#fff4db");if(![2,6].includes(i))box(x+2.4,6,2.2,5.5,23.1,1.3,"#504d60")}
      const [u,v]=point(25,19,40);line([[u-6,v+3],[u-6,v-11],[u+8,v-15],[u+8,v-1]],"#5b526c",3);line([[u-6,v-8],[u+8,v-12]],"#5b526c",2);
      oval(u-9,v+4,5.5,3.8,"#5b526c");oval(u+5,v,5.5,3.8,"#5b526c");
    }
    function bookshop() {
      shadowPad();box(6,9,39,21,1,22,"#b78a66");door(11,8.7,1,8,15);
      front(23,8.7,3,17,14,"#715c4f");for(let i=0;i<6;i++)front(24+i*2.4,8.6,4,1.9,8+(i%3)*1.6,["#d59b5f","#a0b8a1","#dfc77b"][i%3]);
      const [u,v]=point(23,19,32);const left=[[-21,-6],[-9,-9],[0,-4],[0,9],[-10,5],[-22,6]];
      const right=[[0,-4],[10,-11],[23,-10],[23,3],[12,3],[0,9]];
      for(const poly of [left,right]){polygon(poly.map(([x,y])=>[u+x,v+y+3]),"#96594c");polygon(poly.map(([x,y])=>[u+x,v+y]),"#fff0c8")}
      line([[u,v-4],[u,v+8]],"#b39971",1.6);
      for(const dy of [0,3]){line([[u-16,v-3+dy],[u-10,v-4+dy],[u-4,v-2+dy]],"#baa67f",1);line([[u+5,v-3+dy],[u+11,v-6+dy],[u+19,v-6+dy]],"#baa67f",1)}
      box(43,1,8,4,1,9,"#8b7055");plant(4,4,4);
    }
    if(id===0) {
      shadowPad("#cad5ae"); box(7,6,36,22,1,22,"#f1d9b3"); slopeRoof(7,6,36,22,23,13,clay);
      box(35,15,4,5,32,8,"#be896e"); window(11,5.7,8,10,8); door(29,5.8,1,8,15);
      plant(47,7,6.5); box(5,1,12,3,.4,2,"#b98b67","#f0d0a5");
    } else if(id===1 || id===2) {
      const high=id===2, h=high?52:36,x=high?10:5,y=5,w=high?33:42;
      shadowPad("#d4dbbb"); box(x,y,w,22,1,h,high?"#f3dbc8":"#e4c6ab");
      flatRoof(x,y,w,22,h+1,high?"#9aabb0":"#a8b1a5"); box(x+5,12,9,8,h+3,4,"#c6baad");
      for(let level=0;level<(high?4:2);level++){
        const z=13+level*(high?10:12);
        for(let i=0;i<3;i++) window(x+3+i*(w-6)/3,y-.2,z,6,6);
        if(!high || level===1) box(x+.7,y-2,w-2,2,z-2,1.7,high?"#bd9485":"#a87766");
        face([[x+w,12,z],[x+w,17,z],[x+w,17,z+6],[x+w,12,z+6]],darkGlass);
      }
      door(x+w*.46,y-.2,1,7,10); plant(x+w+4,6,5.6);
    } else if(id>=3 && id<=8) {
      if(id===3) snackStall();
      if(id===4) bakehouse();
      if(id===5) chickenKitchen();
      if(id===6) pizzeria();
      if(id===7) {shop({roof:"#cb7663",mark:"burger",striped:false,body:"#f5d790",w:47});box(9,9,38,16,29,3,"#dfac61","#e5c17f");emblem(26,10,33,1.2,"burger");}
      if(id===8) coffeeHouse();
    } else if(id===9) {
      shadowPad(); box(7,6,39,15,2,11,"#d68e6e","#d8b28c");
      for(const x of [9,43]) {rail([[x,7,9],[x,7,29]],"#856452",2);const [a,b]=point(x,6,1);oval(a,b,3,3,"#645b51");}
      slopeRoof(6,4,40,19,28,5,"#d8775d"); awning(6,5,28,40,"#e59473");
      box(9,4,35,4,12,2,"#ac8a6b","#f5d4ad");emblem(24,3,8,.9,"rice");
      for(const x of [12,19,26]) {const [a,b]=point(x,6,16);oval(a,b,2.7,1.7,"#f6ce86");}
    } else if(id>=10 && id<=16) {
      [cornerStore,grocer,stationery,laundry,salon,pharmacy,florist][id-10]();
    } else if(id===17 || id===18) {
      const kinder=id===18; shadowPad("#d2d7ad");
      box(2,8,46,20,1,22,kinder?"#f1d79d":"#e7cbb5"); slopeRoof(2,8,46,20,23,7,kinder?"#84b5a5":"#9b9db0");
      [5,14,32,41].forEach((x,i)=>{window(x,7.8,9,5.5,7);if(kinder) front(x,7.7,7,5.5,1.8,["#e08d80","#e9b759",teal,rose][i]);});
      box(20,4,10,13,1,kinder?21:28,kinder?"#edb38b":"#e1b994");slopeRoof(20,4,10,13,kinder?22:29,kinder?6:9,kinder?"#d69179":"#888a9e");
      door(22,3.5,1,6,12);if(!kinder) emblem(25,3.6,23,.84,"clock");
      plant(50,6,5); if(kinder) {rail([[6,2,0],[6,2,10]],"#bf9271",1.6);face([[6,2,10],[12,2,8],[6,2,6]],"#e8a08c");}
    } else if(id===19 || id===20 || id===22) {
      if(id===19) dojo();
      if(id===20) pianoStudio();
      if(id===22) bookshop();
    } else if(id===21) {
      shadowPad("#cbd4a5");
      [9,23].forEach(x=>rail([[x,16,0],[x,16,21]],"#a68060",2));box(7,13,19,12,14,2,"#cb9e6d");
      slopeRoof(6,12,20,14,23,6,"#dd9b6e");
      face([[22,13,14],[22,20,14],[38,13,2],[38,6,2]],"#87afac");
      rail([[22,13,15],[38,6,3]],"#648e91",1.5);
      [40,54].forEach(x=>rail([[x,20,0],[x,25,19],[x,31,0]],"#af8664",1.6));rail([[40,25,19],[54,25,19]],"#b48a65",2.1);
      [44,50].forEach(x=>rail([[x,25,18],[x,24,6]],"#847e67",.75));box(43,22,8,4,5,1.6,"#dd9c70");
    } else if(id===23) {
      shadowPad();box(8,13,36,2,1,19,"#9bbcbc");
      [8,43].forEach(x=>rail([[x,7,0],[x,7,23]],"#678b88",1.8));flatRoof(6,6,40,13,23,"#83b0a4");
      [12,36].forEach(x=>box(x,7,1.8,3,1,5,"#816d56"));box(10,6,31,5,7,2,"#c49c73");
      rail([[49,2,0],[49,2,23]],"#797e71",2.3);front(44,1.5,19,10,9,teal);emblem(49,1.4,23,.74,"bus");
    } else if(id===24) {
      shadowPad();[10,40].forEach(x=>rail([[x,24,1],[x,24,22]],"#8b9b91",2));
      face([[5,13,21],[43,13,21],[43,29,24],[5,29,24]],"#a4c3b5");rail([[5,13,21],[43,13,21]],"#709b8e",2.1);
      function bike(x,y,col) {
        const [a,b]=point(x,y,4.2);
        for(const dx of [0,12]){ctx.beginPath();ctx.ellipse(a+dx,b+dx*.17,3.7,4.2,-.05,0,Math.PI*2);ctx.strokeStyle=darkGlass;ctx.lineWidth=1.2;ctx.stroke();}
        line([[a,b],[a+4,b-5],[a+7,b+.6],[a,b],[a+8,b-4],[a+12,b+2]],col,1.35);
        line([[a+7,b-4],[a+8,b-7],[a+11,b-7]],darkGlass,1);
      }
      bike(11,15,"#bd8364");bike(26,8,"#65988c");bike(35,0,"#d3a15a");
    } else if(id===25) {
      shadowPad();
      box(8,8,30,23,1,35,"#f4e7d8");slopeRoof(8,8,30,23,36,6,"#748fb4");
      window(12,7.8,20,9,9);window(25,7.8,20,9,9);
      box(25,3,21,16,1,16,"#f7d8c6");flatRoof(25,3,21,16,17,"#c28076");
      door(30,2.8,1,11,14);window(13,7.8,4,9,10);
      const [u,v]=point(24,17,43);
      oval(u+1,v+1,14.5,14.5,"#465b77");oval(u,v,14.5,14.5,"#f9f1df");
      const tube="#425d82";
      line([[u-8,v-6],[u-8,v-1],[u-6,v+2],[u-3,v+3],[u,v+2],[u+2,v-1],[u+2,v-6]],tube,2.4);
      line([[u-3,v+3],[u-3,v+6],[u-1,v+8],[u+3,v+8],[u+6,v+5],[u+6,v+1]],tube,2.4);
      for(const dx of [-8,2]) oval(u+dx,v-6,1.8,1.8,"#ba6659");
      oval(u+6,v-1,3.3,3.3,tube);oval(u+6,v-1,1.6,1.6,"#e5bb94");
    }
    ctx.restore();
  }
  globalThis.drawVillageArt = drawVillageArt;
})();
