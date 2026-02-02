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

export default processItems;


