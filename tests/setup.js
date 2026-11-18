import 'fake-indexeddb/auto';
import {afterEach} from 'vitest';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);
window.scrollTo = () => {};
window.matchMedia ||= () => ({matches:false,addEventListener() {},removeEventListener() {}});
HTMLElement.prototype.scrollIntoView = () => {};
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
HTMLCanvasElement.prototype.getContext = () => null;

// Direct store calls in tests update React outside act(); the assertions still await the DOM, so mute the noise.
const error = console.error;
console.error = (...args) => { if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return; error(...args); };
