/* Beebo-owned code-native artwork copied from campsite-games.html at 7b0dc76b.
 * Drawing functions accept presentation data only; no rules, input handlers or network.
 * See ART-PARITY-W1.md for provenance and the unresolved older clearance wording.
 */
(function () {
'use strict';
let artSequence = 0;
function svgel(tag, attrs, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function artCanvas(w,h,cls='game-art'){
  const svg=svgel('svg',{viewBox:`0 0 ${w} ${h}`,class:cls,'aria-hidden':'true',focusable:'false'}),id='beebo-art-'+(++artSequence);
  const defs=svgel('defs',{});svg.append(defs);
  const gradient=(name,a,b)=>{const g=svgel('linearGradient',{id:id+'-'+name,x1:0,y1:0,x2:1,y2:1});g.append(svgel('stop',{offset:0,'stop-color':a}),svgel('stop',{offset:1,'stop-color':b}));defs.append(g);return `url(#${id}-${name})`;};
  const paint={gold:gradient('gold','#fff0b0','#bf842d'),purple:gradient('purple','#d7c4ff','#7045ba'),blue:gradient('blue','#92e5f1','#267695'),ivory:gradient('ivory','#fffdf3','#cfbaa0'),ink:gradient('ink','#425373','#111c32'),wood:gradient('wood','#ac7346','#593726')};
  return {svg,paint,add:(tag,attrs,text)=>{const n=svgel(tag,attrs,text);svg.append(n);return n;}};
}
function artPips(value,colour='#172945',cls='art-pips'){
  const svg=svgel('svg',{viewBox:'0 0 60 60',class:cls,'aria-hidden':'true',focusable:'false'});
  const patterns={1:[[30,30]],2:[[15,15],[45,45]],3:[[15,15],[30,30],[45,45]],4:[[15,15],[45,15],[15,45],[45,45]],5:[[15,15],[45,15],[30,30],[15,45],[45,45]],6:[[15,13],[45,13],[15,30],[45,30],[15,47],[45,47]]};
  (patterns[value]||[]).forEach(([cx,cy])=>{svg.append(svgel('circle',{cx,cy:cy+1,r:5.5,fill:'#000',opacity:.12}),svgel('circle',{cx,cy,r:5,fill:colour}));});return svg;
}
function artSuit(suit,x,y,scale=1,colour='#263954'){
  const paths={H:'M 0 8 C -23 -7 -24 -23 -10 -24 C -4 -24 0 -21 0 -17 C 0 -21 4 -24 10 -24 C 24 -23 23 -7 0 8 Z',D:'M 0 -25 L 18 -8 L 0 11 L -18 -8 Z',S:'M 0 -27 C -5 -19 -22 -10 -19 0 C -16 10 -5 10 0 2 C 0 8 -3 12 -8 15 H 8 C 3 12 0 8 0 2 C 5 10 16 10 19 0 C 22 -10 5 -19 0 -27 Z',C:'M 0 -25 C -13 -25 -15 -12 -7 -8 C -23 -16 -28 7 -13 9 C -8 10 -3 6 0 2 C 0 8 -3 12 -8 15 H 8 C 3 12 0 8 0 2 C 3 6 8 10 13 9 C 28 7 23 -16 7 -8 C 15 -12 13 -25 0 -25 Z'};
  return svgel('path',{d:paths[suit]||paths.S,transform:`translate(${x} ${y}) scale(${scale})`,fill:colour});
}
function artCardFace(c,back=false){
  const a=artCanvas(100,140,'art-card-face'),{svg,paint,add}=a;
  add('rect',{x:2,y:3,width:96,height:135,rx:10,fill:back?paint.ink:paint.ivory,stroke:back?'#d1ae65':'#eadbc5','stroke-width':2});
  if(back){
    add('rect',{x:9,y:10,width:82,height:121,rx:6,fill:'none',stroke:'#c6a96c','stroke-width':1.2});
    for(let i=-6;i<12;i++)add('path',{d:`M ${i*14} 10 L ${i*14+85} 130 M ${i*14+85} 10 L ${i*14} 130`,stroke:'#b0a0d1','stroke-width':.6,opacity:.3});
    add('path',{d:'M 50 35 L 76 70 L 50 105 L 24 70 Z',fill:paint.purple,stroke:'#f6d989','stroke-width':2});
    add('path',{d:'M 50 50 L 54 65 L 68 70 L 54 74 L 50 90 L 46 74 L 32 70 L 46 65 Z',fill:paint.gold});return svg;
  }
  const colour=c.red?'#a3283d':'#203552',rank=String(c.rank||'?');
  add('text',{x:14,y:25,fill:colour,'font-family':'Georgia,serif','font-size':18,'font-weight':700},rank);
  svg.append(artSuit(c.suit,18,41,.29,colour));
  const bottom=svgel('g',{transform:'translate(100 140) rotate(180)'});
  bottom.append(svgel('text',{x:14,y:25,fill:colour,'font-family':'Georgia,serif','font-size':18,'font-weight':700},rank),artSuit(c.suit,18,41,.29,colour));svg.append(bottom);
  const count=rank==='A'?1:Number(rank);
  if(count>=1&&count<=10){
    const pipPositions={1:[[50,76]],2:[[50,44],[50,106]],3:[[50,43],[50,75],[50,107]],4:[[36,46],[64,46],[36,102],[64,102]],5:[[36,46],[64,46],[50,75],[36,104],[64,104]],6:[[36,44],[64,44],[36,75],[64,75],[36,106],[64,106]],7:[[36,42],[64,42],[50,58],[36,76],[64,76],[36,109],[64,109]],8:[[36,42],[64,42],[50,57],[36,76],[64,76],[50,94],[36,110],[64,110]],9:[[36,38],[64,38],[36,61],[64,61],[50,77],[36,90],[64,90],[36,113],[64,113]],10:[[36,36],[64,36],[50,50],[36,62],[64,62],[36,88],[64,88],[50,102],[36,114],[64,114]]};
    pipPositions[count].forEach(([x,y])=>svg.append(artSuit(c.suit,x,y,count===1?1.05:.35,colour)));
  }else{
    add('path',{d:'M 31 43 L 69 43 L 76 68 L 69 97 L 31 97 L 24 68 Z',fill:colour,opacity:.12,stroke:colour,'stroke-width':1});
    add('path',{d:'M 30 63 L 26 47 L 40 56 L 50 39 L 60 56 L 74 47 L 70 63 Z',fill:paint.gold,stroke:'#906332','stroke-width':1});
    add('path',{d:'M 32 69 H 68 M 36 74 L 32 98 H 68 L 64 74',fill:colour,stroke:colour,'stroke-width':3,'stroke-linejoin':'round'});
    svg.append(artSuit(c.suit,50,88,.33,'#fff3d0'));
  }
  return svg;
}
function seaShipArt(ship){
  const length=ship.size*100,vertical=!!ship.vertical;
  const svg=svgel('svg',{viewBox:vertical?'0 0 100 '+length:'0 0 '+length+' 100',class:'sb-ship-svg','aria-hidden':'true',focusable:'false'});
  const g=svgel('g',vertical?{transform:'translate(100 0) rotate(90)'}:{});svg.append(g);
  const add=(tag,a)=>g.append(svgel(tag,a));
  add('ellipse',{cx:length/2,cy:56,rx:length*.47,ry:42,fill:'#72bbd3',opacity:'.13'});
  const hull=`M 17 29 Q 12 50 17 71 L ${length-62} 82 Q ${length-25} 74 ${length-7} 50 Q ${length-25} 26 ${length-62} 18 Z`;
  add('path',{d:hull,fill:ship.sunk?'#657582':'#a9c9d6',stroke:'#09283c','stroke-width':5});
  add('path',{d:`M 24 33 L ${length-66} 26 Q ${length-36} 32 ${length-23} 49 L 24 49 Z`,fill:'#e0f0f1',opacity:'.58'});
  add('path',{d:`M 24 51 L ${length-23} 51 Q ${length-36} 68 ${length-66} 74 L 24 68 Z`,fill:'#557789',opacity:'.55'});
  if(ship.id===0){
    add('rect',{x:35,y:31,width:length-104,height:39,rx:5,fill:'#35576b',stroke:'#edf4df','stroke-width':2});
    add('path',{d:`M 43 50 H ${length-83}`,stroke:'#f3d77b','stroke-width':3,'stroke-dasharray':'13 10'});
    add('rect',{x:90,y:16,width:72,height:20,rx:5,fill:'#708b9e',stroke:'#deeced','stroke-width':2});
    add('path',{d:'M 125 35 L 135 46 L 151 50 L 135 53 L 125 63 L 127 52 L 116 50 L 127 47 Z',fill:'#edf6ed'});
  }else if(ship.id===2){
    add('rect',{x:43,y:35,width:length-100,height:30,rx:15,fill:'#3c6173',stroke:'#d4e6e8','stroke-width':2});
    add('rect',{x:length*.48,y:30,width:42,height:39,rx:8,fill:'#728f9c',stroke:'#d9eeee','stroke-width':2});
    add('path',{d:`M ${length*.56} 39 V 23 H ${length*.63}`,fill:'none',stroke:'#e8e9da','stroke-width':5});
  }else{
    add('rect',{x:length*.38,y:30,width:length*.25,height:40,rx:6,fill:'#45687f',stroke:'#d7edf1','stroke-width':2});
    add('rect',{x:length*.44,y:35,width:length*.10,height:30,rx:3,fill:'#aac4cd'});
    for(const x of [length*.20,length*.76]){
      add('circle',{cx:x,cy:50,r:12,fill:'#647f91',stroke:'#d6e3e4','stroke-width':2});
      add('path',{d:`M ${x} 50 H ${x+24}`,stroke:'#edf2df','stroke-width':5,'stroke-linecap':'round'});
    }
  }
  add('path',{d:`M ${length-51} 35 V 65`,stroke:'#f0cf75','stroke-width':4,opacity:'.9'});
  for(const x of [27,length-67])add('circle',{cx:x,cy:50,r:3,fill:'#ffe8a1'});
  return svg;
}
// Twelve ranks drawn with the guest Pairs deck, keeping the website's pair IDs.
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q'];
function memoryCard(face, back) {
  const rank = ranks[face];
  const svg = artCardFace({rank:rank, suit:face % 2 ? 'H' : 'S', red:!!(face % 2)}, back);
  svg.classList.add(back ? 'back' : 'face');
  return svg;
}
function shipOverlay(grid, id, cells, sunk) {
  if (!cells || !cells.length) return;
  const vertical = cells.length > 1 && cells[1] - cells[0] === 8;
  const node = document.createElement('div');
  node.className = 'ship-art' + (sunk ? ' wreck' : '');
  node.setAttribute('aria-hidden', 'true');
  node.style.gridColumn = (cells[0] % 8 + 2) + ' / span ' + (vertical ? 1 : cells.length);
  node.style.gridRow = (Math.floor(cells[0] / 8) + 2) + ' / span ' + (vertical ? cells.length : 1);
  node.append(seaShipArt({id:id, size:cells.length, vertical:vertical, sunk:!!sunk}));
  grid.append(node);
}
// Same six faces and orientation table as the guest's artDie/artSetDie. No animation controller.
function die(value) {
  const box = cls => { const n = document.createElement('div'); n.className = cls; return n; };
  const n = box('art-die'), view = box('art-die-view'), cube = box('art-cube');
  n.setAttribute('aria-hidden', 'true'); n.append(view); view.append(cube);
  for (let v = 1; v <= 6; v++) { const face = box('art-face'); face.append(artPips(value ? v : 0)); cube.append(face); }
  const turns = {1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
  const angle = turns[value] || turns[1];
  cube.style.transform = `rotateX(${angle[0]}deg) rotateY(${angle[1]}deg)`;
  return n;
}
window.BeeboCampsiteArt = Object.freeze({ship:seaShipArt, shipOverlay:shipOverlay, die:die,
  memoryCard:memoryCard, memoryName:face => ({A:'Ace',J:'Jack',Q:'Queen'}[ranks[face]] || ranks[face]) + (face % 2 ? ' of hearts' : ' of spades')});
})();
