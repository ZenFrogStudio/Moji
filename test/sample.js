// Sample file – open this in the Extension Development Host to test decorations.

import { readFile } from 'fs/promises';

export class DataLoader extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
  }

  async loadFile(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const data = await readFile(path, 'utf-8');
      this.cache.set(path, data);
      return data;
    } catch (err) {
      throw new Error(`Failed to load ${path}: ${err.message}`);
    } finally {
      console.log('load attempt finished');
    }
  }
}

// Keywords inside strings should NOT be decorated:
const msg = "if you break the rules, try to catch the error";

// Keywords inside comments should NOT be decorated:
// return, function, class, const, var, while, for

/* block comment: import export default yield await */

function processItems(items) {
  for (const item of items) {
    if (typeof item === 'undefined') {
      continue;
    }

    switch (item.type) {
      case 'skip':
        break;
      case 'delete':
        delete item.data;
        break;
      default:
        void item;
    }
  }
}

function* counter() {
  let i = 0;
  while (true) {
    yield i++;
  }
}

// Property access – ".return" should NOT be decorated:
const val = obj.return;
const cls = elem.class;

// ── Fix 1 verification: object property keys ────────────────────────────────
// None of the keys below should be decorated (they are property names, not keywords):
const htmlAttrs = { for: 'nameInput', class: 'btn', type: 'submit' };
const refs      = { for: inputEl, this: selfRef, get: getFn };
const nested    = { a: 1, for: 2, b: { this: 3 } };

// Destructuring – 'for' and 'this' are property keys here, NOT keywords:
const { for: forAttr, this: thisRef } = someObj;

// Real keywords immediately AFTER a block open – must still be decorated:
if (htmlAttrs) {
  for (const [key, val2] of Object.entries(htmlAttrs)) {
    if (this.map) return key;
  }
}

export default processItems;


