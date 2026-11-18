import {colors,newDraft} from '../data/catalog.js';
import {faceDesign} from '../lib/pricing.js';

/* Illustrative 2D proofs: product silhouettes with the customer's text/artwork in the print area. */
const productShapes = {
  tee:<><path className="fabric" d="m95 54 34-17c18 19 44 19 62 0l34 17 43 42-35 36-19-16v111H106V116l-19 16-35-36Z"/><path className="seam" d="M129 37c6 21 56 21 62 0m-83 176h105M90 119l-32-30m172 30 32-30"/></>,
  tote:<><path fill="none" stroke="var(--material)" strokeWidth="13" d="M116 113V72c0-44 88-44 88 0v41"/><path className="fabric" d="M86 97h148l-13 130H99Z"/><path className="seam" d="M91 112h138m-111 4v-14m86 14v-14m-97 116h106"/></>,
  mug:<><path className="fabric" d="M203 89h20c56 0 52 93-4 93h-18l1-17h18c33 0 35-58 2-58h-21Z"/><path className="fabric" d="M87 75h130l-7 116c0 32-116 32-116 0Z"/><ellipse className="fabric" cx="152" cy="75" rx="65" ry="15"/><ellipse fill="#21163425" cx="152" cy="76" rx="53" ry="9"/></>,
  cap:<><path className="fabric" d="M65 147c0-66 40-104 95-104 60 0 97 38 97 104l-13 22-169 5Z"/><path className="seam" d="M160 43c-45 7-53 59-53 107m53-107c43 7 53 59 53 108"/><path className="fabric" d="M69 152c58-18 129-17 173 11-34 42-143 59-198 30-17-9-1-25 25-41Z"/><path className="seam" d="M53 184c43 23 137 15 180-15"/></>
};
const printAreas = {tee:[160,121,61,56],tote:[160,159,76,73],mug:[152,133,69,61],cap:[160,111,62,38]};

export function paperGeometry(item,draft) {
  const shapes = {fold:[206,147,6],id:[114,178,10],face:[150,170,66],card:[198,111,5],flyer:[144,191,3],sticker:[156,156,78],banner:[241,126,3]};
  const [baseWidth,baseHeight,baseRadius] = shapes[item.shape];
  let width = baseWidth, height = baseHeight, radius = baseRadius;
  if (item.shape === 'id' && draft.variant.startsWith('Landscape')) [width,height] = [height,width];
  if (item.shape === 'card' && draft.variant.startsWith('55')) width = height = 145;
  if (draft.specs.Cut === 1 && item.shape === 'face') { height = width; radius = width / 2; }
  if (draft.specs.Cut === 2 && item.shape === 'face') radius = 8;
  if (draft.specs.Cut === 1 && item.shape === 'sticker') radius = 22;
  if (draft.specs.Corners === 1) radius = 15;
  return {x:(320 - width) / 2,y:(260 - height) / 2,width,height,radius};
}

function PaperShape({item,draft}) {
  const {x,y,width,height,radius} = paperGeometry(item,draft);
  const folds = item.shape === 'fold' ? Array.from({length:draft.specs.Fold === 0 ? 1 : 2},(_,index) => {
    const line = x + (index + 1) * width / (draft.specs.Fold === 0 ? 2 : 3);
    return <path key={index} d={`M${line} ${y}v${height}`} stroke="#523c7b42" strokeDasharray="4 4"/>;
  }) : null;
  const eyelets = item.shape === 'banner' && draft.specs.Mounting === 1
    ? [[x + 10,y + 10],[x + width - 10,y + 10],[x + 10,y + height - 10],[x + width - 10,y + height - 10]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="3.5" fill="#b4abbf"/>) : null;
  return <>
    {item.shape === 'face' && draft.specs.Backing === 0 && <rect x="153" y="189" width="14" height="62" rx="4" fill="#c3946a"/>}
    <rect className="fabric" x={x} y={y} width={width} height={height} rx={radius}/>
    {folds}{eyelets}
  </>;
}

/** One distinct composition per print product, so the catalogue reads as a product range rather than a colour grid. */
function tileArt(item) {
  const box = paperGeometry(item,newDraft(item));
  const {x,y,width,height} = box;
  const pad = Math.round(Math.min(width,height) * .1);
  const left = x + pad, top = y + pad, w = width - pad * 2, h = height - pad * 2;
  const cx = x + width / 2, cy = y + height / 2, A = item.accent;
  const bars = (bx,by,maxWidth,rows) => rows.map(([barHeight,ratio,opacity],index) =>
    <rect key={index} x={bx} y={by + index * (barHeight + 7)} width={maxWidth * ratio} height={barHeight} rx="3" fill={A} fillOpacity={opacity}/>);
  switch (item.id) {
    case 'brochure': {
      const third = w / 3;
      return <>
        <rect x={left} y={top} width={third} height={h} fill={A} fillOpacity=".14"/>
        <circle cx={left + third / 2} cy={top + h * .3} r={third * .2} fill={A}/>
        <rect x={left + third + 8} y={top + 12} width={w - third - 16} height={h * .34} rx="3" fill={A} fillOpacity=".2"/>
        {bars(left + third + 8,top + h * .58,w - third - 16,[[5,.9,.75],[5,.6,.4]])}
        <rect x={left + 8} y={top + h - 14} width={third - 16} height="5" rx="2.5" fill={A} fillOpacity=".55"/>
      </>;
    }
    case 'id-card':
      return <>
        <rect x={cx - 15} y={top + 3} width="30" height="5" rx="2.5" fill="#c4bcd4"/>
        <circle cx={cx} cy={top + h * .33} r={w * .19} fill={A} fillOpacity=".18"/>
        <circle cx={cx} cy={top + h * .28} r={w * .09} fill={A}/>
        <rect x={cx - w * .16} y={top + h * .42} width={w * .32} height={h * .12} rx={w * .06} fill={A}/>
        {bars(cx - w * .28,top + h * .65,w * .56,[[5,.8,.8],[5,.55,.4]])}
        <rect x={left + 4} y={top + h - 12} width={w * .34} height="6" rx="2" fill={A} fillOpacity=".25"/>
      </>;
    case 'business-card':
      return <>
        <circle cx={left + 13} cy={top + 13} r="9" fill={A}/>
        <rect x={left + 28} y={top + 9} width={w * .42} height="7" rx="3" fill={A}/>
        <rect x={left + 28} y={top + 21} width={w * .28} height="4" rx="2" fill={A} fillOpacity=".4"/>
        {bars(left + 4,top + h * .55,w * .34,[[4,.9,.6],[4,.66,.35]])}
        <rect x={left + w * .62} y={top + h - 22} width={w * .34} height="18" rx="4" fill={A} fillOpacity=".85"/>
      </>;
    case 'face-cutout':
      return <>
        <circle cx={cx} cy={top + h * .42} r={w * .33} fill="#ffc5a9"/>
        <path d={`M${cx - w * .3} ${top + h * .35}q${w * .04} ${-h * .27} ${w * .3} ${-h * .25}q${w * .24} ${h * .02} ${w * .23} ${h * .26}q${-w * .09} ${-h * .12} ${-w * .24} ${-h * .14}q${-w * .07} ${h * .1} ${-w * .29} ${h * .13}`} fill="#462741"/>
        <circle cx={cx - w * .11} cy={top + h * .41} r="4" fill="#462741"/>
        <circle cx={cx + w * .11} cy={top + h * .41} r="4" fill="#462741"/>
        <path d={`M${cx - w * .07} ${top + h * .52}q${w * .07} ${h * .06} ${w * .14} 0`} fill="none" stroke="#a64155" strokeWidth="4" strokeLinecap="round"/>
      </>;
    case 'flyer':
      return <>
        <rect x={left} y={top} width={w} height={h * .42} rx="4" fill={A} fillOpacity=".9"/>
        <circle cx={left + w * .74} cy={top + h * .2} r={h * .1} fill="#ffffff55"/>
        {bars(left + 4,top + h * .56,w,[[9,.9,.85],[7,.72,.6],[5,.55,.35]])}
        <rect x={left + 4} y={top + h - 10} width={w * .3} height="4" rx="2" fill={A}/>
        <rect x={left + w - 34} y={top + h - 12} width="30" height="8" rx="4" fill={A} fillOpacity=".2"/>
      </>;
    case 'sticker':
      return <>
        <circle cx={cx} cy={cy} r={Math.min(w,h) * .4} fill={A} fillOpacity=".12"/>
        <circle cx={cx} cy={cy} r={Math.min(w,h) * .3} fill="none" stroke={A} strokeWidth="3" strokeDasharray="6 6"/>
        <path d="M0 -1 L0.22 -0.22 L1 0 L0.22 0.22 L0 1 L-0.22 0.22 L-1 0 L-0.22 -0.22 Z" transform={`translate(${cx} ${cy}) scale(${Math.min(w,h) * .22})`} fill={A}/>
      </>;
    case 'poster':
      return <>
        <circle cx={cx} cy={top + h * .33} r={Math.min(w,h) * .3} fill={A} fillOpacity=".2"/>
        <circle cx={cx} cy={top + h * .33} r={Math.min(w,h) * .16} fill={A}/>
        {bars(left,top + h * .62,w,[[10,.86,.9],[7,.62,.6],[5,.44,.35]])}
        <rect x={left + w - 22} y={top + h - 8} width="18" height="4" rx="2" fill={A} fillOpacity=".5"/>
      </>;
    case 'banner':
      return <>
        <rect x={left} y={top} width={w * .36} height={h} rx="3" fill={A} fillOpacity=".14"/>
        <circle cx={left + w * .18} cy={top + h * .5} r={Math.min(w,h) * .16} fill={A}/>
        {bars(left + w * .44,top + h * .3,w * .5,[[11,.9,.9],[8,.7,.62]])}
        <rect x={left} y={top + 1} width={w} height="2" fill={A} fillOpacity=".28"/>
        <rect x={left} y={top + h - 3} width={w} height="2" fill={A} fillOpacity=".28"/>
      </>;
    default:
      return <><rect x={left} y={top} width={w * .5} height={h * .34} rx="4" fill={A}/>{bars(left,top + h * .5,w,[[6,.8,.6],[4,.6,.35]])}</>;
  }
}

/** Catalogue tile for print products. */
export function PrintTile({item}) {
  return <svg className="print-tile" viewBox="0 0 320 260" role="img" aria-label={item.name} style={{'--material':'#fff'}}>
    <PaperShape item={item} draft={newDraft(item)}/>
    {tileArt(item)}
  </svg>;
}

function proofText(text,width,height,hasArt) {
  const fontSize = Math.min(11,height * (hasArt ? .24 : .34));
  const capacity = Math.max(1,Math.floor((width - 6) / (fontSize * .72)));
  const maxLines = hasArt ? 2 : 3;
  const rows = [''];
  for (const word of text.split(/\s+/)) {
    const index = rows.length - 1;
    const combined = rows[index] ? rows[index] + ' ' + word : word;
    if (rows[index] && Array.from(combined).length > capacity && rows.length < maxLines) rows.push(word);
    else rows[index] = combined;
  }
  const lineHeight = fontSize * 1.16, textHeight = rows.length * lineHeight;
  const startY = hasArt ? height - textHeight : Math.max(0,(height - textHeight) / 2);
  const lines = rows.map((line,index) => {
    const fit = Array.from(line).length * fontSize * .78 > width - 6;
    return <text key={index} x={width / 2} y={startY + index * lineHeight + fontSize * .88} fontSize={fontSize} fontWeight="700" {...(fit ? {textLength:width - 6,lengthAdjust:'spacingAndGlyphs'} : {})}>{line}</text>;
  });
  return {lines,artHeight:Math.max(0,startY - 2)};
}

function ProofContent({draft,width,height}) {
  const design = faceDesign(draft);
  const text = (design.text.trim() || (draft.face === 'front' ? draft.roster?.sample : '') || '').slice(0,60);
  const attached = design.pdf || (draft.face === 'back' && draft.pdfBoth && draft.pdf);
  const ink = ['Charcoal','Navy'].includes(draft.color) ? '#f9ecff' : '#402477';
  if (!text && !design.art) {
    return <g fill={ink} opacity=".7"><rect x=".5" y=".5" width={width - 1} height={height - 1} rx="4" fill="none" stroke={ink} strokeDasharray="3 2"/>
      <text x={width / 2} y={height / 2 + 3} textAnchor="middle" fontSize="8">{attached ? 'PDF attached' : 'Print area'}</text></g>;
  }
  const {lines,artHeight} = text ? proofText(text,width,height,Boolean(design.art)) : {lines:null,artHeight:height};
  return <>
    {design.art && <image href={design.art} x="2" y="1" width={width - 4} height={Math.max(0,artHeight - 1)} preserveAspectRatio="xMidYMid meet" aria-label="Your artwork"/>}
    <g fill={ink} textAnchor="middle">{lines}</g>
  </>;
}

/** The SVG proof for a draft or cart line. Mug/tee lines show their saved studio render when present. */
export function ProofSvg({item,draft}) {
  if (draft.studioProof && ['mug','tee'].includes(item.id)) return <img src={draft.studioProof} alt="Saved print layout preview" style={{objectFit:'contain'}}/>;
  let [x,y,w,h] = printAreas[item.id] || [160,130,120,96];
  if (item.shape) {
    const box = paperGeometry(item,draft);
    w = box.width * (item.shape === 'face' || item.shape === 'sticker' ? .68 : .77);
    h = box.height * .70;
  }
  return <svg viewBox="0 0 320 260" role="img" aria-label={`${draft.face} ${item.name}`} style={{'--material':colors[draft.color]}}>
    {item.shape ? <PaperShape item={item} draft={draft}/> : productShapes[item.id]}
    <svg x={x - w / 2} y={y - h / 2} width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="hidden"><ProofContent draft={draft} width={w} height={h}/></svg>
  </svg>;
}
