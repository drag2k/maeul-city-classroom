/* Local QR encoder for classroom links. QR Model 2, byte mode, ECC M, versions 1–20. */
(() => {
  "use strict";
  // Each pair gives the total and payload bytes of one error-correction block.
  // Blocks of a given size are repeated the number of times in the first column.
  const layouts = [
    [1,26,16], [1,44,28], [1,70,44], [2,50,32], [2,67,43], [4,43,27], [4,49,31],
    [2,60,38,2,61,39], [3,58,36,2,59,37], [4,69,43,1,70,44], [1,80,50,4,81,51],
    [6,58,36,2,59,37], [8,59,37,1,60,38], [4,64,40,5,65,41], [5,65,41,5,66,42],
    [7,73,45,3,74,46], [10,74,46,1,75,47], [9,69,43,4,70,44], [3,70,44,11,71,45],
    [3,67,41,13,68,42]
  ];
  const centers = [
    [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
    [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],
    [6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90]
  ];
  const masks = [
    (x,y)=>(x+y)%2===0, (x,y)=>y%2===0, x=>x%3===0, (x,y)=>(x+y)%3===0,
    (x,y)=>(Math.floor(y/2)+Math.floor(x/3))%2===0, (x,y)=>(x*y)%2+(x*y)%3===0,
    (x,y)=>((x*y)%2+(x*y)%3)%2===0, (x,y)=>((x+y)%2+(x*y)%3)%2===0
  ];
  const exp = new Uint8Array(510), log = new Uint8Array(256);
  let field = 1;
  for (let i=0;i<255;i++) {
    exp[i]=exp[i+255]=field;
    log[field]=i;
    field <<= 1;
    if (field & 256) field ^= 0x11d;
  }
  function multiply(a,b) { return a && b ? exp[log[a]+log[b]] : 0; }
  function parity(bytes,count) {
    let generator=[1];
    for (let i=0;i<count;i++) {
      const next=Array(generator.length+1).fill(0);
      generator.forEach((term,j)=>{ next[j]^=term; next[j+1]^=multiply(term,exp[i]); });
      generator=next;
    }
    const message=[...bytes,...Array(count).fill(0)];
    for(let i=0;i<bytes.length;i++) {
      const lead=message[i];
      generator.forEach((term,j)=>{message[i+j]^=multiply(lead,term);});
    }
    return message.slice(bytes.length);
  }
  function errorProtected(payload,layout) {
    const blocks=[],checks=[];
    let offset=0;
    for (let i=0;i<layout.length;i+=3) {
      for(let j=0;j<layout[i];j++) {
        const block=payload.slice(offset,offset+layout[i+2]);
        offset+=block.length;
        blocks.push(block);
        checks.push(parity(block,layout[i+1]-block.length));
      }
    }
    const result=[];
    for(const group of [blocks,checks]) {
      const longest=Math.max(...group.map(b=>b.length));
      for(let i=0;i<longest;i++) for(const block of group) if(i<block.length) result.push(block[i]);
    }
    return result;
  }
  function encode(value) {
    const bytes=new TextEncoder().encode(value);
    const utf8=bytes.some(b=>b>127);
    for(let v=1;v<=layouts.length;v++) {
      const layout=layouts[v-1];
      let capacity=0;
      for(let i=0;i<layout.length;i+=3) capacity+=layout[i]*layout[i+2];
      const lengthBits=v<10?8:16;
      const needed=(utf8?12:0)+4+lengthBits+8*bytes.length;
      if(needed>capacity*8) continue;
      const bits=[];
      const append=(n,width)=>{ for(let i=width-1;i>=0;i--) bits.push((n>>i)&1); };
      if(utf8) {append(7,4);append(26,8);}
      append(4,4);append(bytes.length,lengthBits);
      for(const byte of bytes) append(byte,8);
      append(0,Math.min(4,capacity*8-bits.length));
      while(bits.length%8) bits.push(0);
      const data=[];
      for(let i=0;i<bits.length;i+=8) data.push(bits.slice(i,i+8).reduce((n,b)=>n*2+b,0));
      let even=true;
      while(data.length<capacity) {data.push(even?0xec:0x11);even=!even;}
      return {v,words:errorProtected(data,layout)};
    }
    throw new RangeError("학급 주소가 너무 길어 QR을 생성할 수 없습니다.");
  }
  function bch(value,shift,polynomial) {
    let remainder=value<<shift;
    while(remainder && Math.clz32(remainder)<=Math.clz32(polynomial)) {
      remainder^=polynomial<<(Math.clz32(polynomial)-Math.clz32(remainder));
    }
    return value<<shift|remainder;
  }
  function matrix(version,words,mask) {
    const size=version*4+17;
    const grid=Array.from({length:size},()=>Array(size).fill(null));
    function finder(cx,cy) {
      for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) {
        const x=cx+dx,y=cy+dy,d=Math.max(Math.abs(dx),Math.abs(dy));
        if(x>=0 && x<size && y>=0 && y<size) grid[y][x]=d!==2 && d!==4;
      }
    }
    finder(3,3);finder(size-4,3);finder(3,size-4);
    for(const y of centers[version-1]) for(const x of centers[version-1]) {
      if(grid[y][x]!==null) continue;
      for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) grid[y+dy][x+dx]=Math.max(Math.abs(dx),Math.abs(dy))!==1;
    }
    for(let i=8;i<size-8;i++) {
      if(grid[6][i]===null) grid[6][i]=i%2===0;
      if(grid[i][6]===null) grid[i][6]=i%2===0;
    }
    const format=bch(mask,10,0x537)^0x5412;
    for(let i=0;i<15;i++) {
      const bit=!!(format&(1<<i));
      const y=i<6?i:i<8?i+1:size-15+i;
      const x=i<8?size-i-1:i===8?7:14-i;
      grid[y][8]=grid[8][x]=bit;
    }
    grid[size-8][8]=true;
    if(version>=7) {
      const versionBits=bch(version,12,0x1f25);
      for(let i=0;i<18;i++) {
        const a=size-11+(i%3),b=Math.floor(i/3);
        grid[a][b]=grid[b][a]=!!(versionBits&(1<<i));
      }
    }
    let cursor=0,up=true;
    for(let right=size-1;right>0;right-=2) {
      if(right===6) right--;
      for(let step=0;step<size;step++) {
        const y=up?size-1-step:step;
        for(let x=right;x>=right-1;x--) {
          if(grid[y][x]!==null) continue;
          const bit=(words[cursor>>3]>>(7-(cursor%8)))&1;
          grid[y][x]=!!bit!==masks[mask](x,y);
          cursor++;
        }
      }
      up=!up;
    }
    return grid;
  }
  function penalty(grid) {
    let score=0,dark=0;
    function linePenalty(line) {
      let run=0,last=null;
      for(const bit of line) {
        run=bit===last?run+1:1;
        if(run===5) score+=3;
        if(run>5) score++;
        last=bit;
      }
      const str=line.map(Number).join("");
      score+=40*((str.match(/(?=10111010000|00001011101)/g)||[]).length);
    }
    for(let y=0;y<grid.length;y++) {
      linePenalty(grid[y]);
      linePenalty(grid.map(row=>row[y]));
      for(let x=0;x<grid.length;x++) {
        const bit=grid[y][x];
        dark+=Number(bit);
        if(x && y && bit===grid[y-1][x] && bit===grid[y][x-1] && bit===grid[y-1][x-1]) score+=3;
      }
    }
    return score+10*Math.floor(Math.abs(100*dark/(grid.length**2)-50)/5);
  }
  globalThis.drawQR=function drawQR(canvas,value) {
    const {v,words}=encode(String(value));
    let best=null,bestScore=Infinity;
    for(let mask=0;mask<8;mask++) {
      const grid=matrix(v,words,mask),score=penalty(grid);
      if(score<bestScore) {best=grid;bestScore=score;}
    }
    const width=best.length+8,scale=8;
    canvas.width=canvas.height=width*scale;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#102d26";
    best.forEach((row,y)=>row.forEach((on,x)=>{if(on)ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);}));
  };
})();
