import {useEffect,useRef,useState} from 'react';
import {money} from '../lib/format.js';
import {prefersReducedMotion} from '../lib/dom.js';

/** Counts smoothly between prices (≈350 ms). Falls back to the exact value for reduced motion and tests. */
export function AnimatedMoney({value}) {
  const [shown,setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined' || import.meta.env.MODE === 'test') { setShown(value); from.current = value; return; }
    const start = performance.now(), origin = from.current;
    let raf;
    const tick = now => {
      const t = Math.min(1,(now - start) / 350), eased = 1 - Math.pow(1 - t,3);
      from.current = origin + (value - origin) * eased;
      setShown(from.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  },[value]);
  return <>{money(Math.round(shown))}</>;
}
