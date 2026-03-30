// Sample TSX file – open in the Extension Development Host to verify Fix 1 & Fix 2.
// Each section has a comment explaining what SHOULD and SHOULD NOT be decorated.

import React, { Component } from 'react';

// ── Fix 1: property keys in JSX/TS context ──────────────────────────────────

// None of the keys below should be decorated:
const labelProps = { for: 'email', type: 'text', class: 'input' };
const stateMap   = { this: null, for: 0, get: () => {}, set: () => {} };

// Real keywords must still be decorated:
async function processForm(data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'undefined') continue;
    try {
      await save(key, value);
    } catch (err) {
      throw new Error(`Failed: ${key}`);
    } finally {
      this.done = true;
    }
  }
  return true;
}

// Ternary – both 'this' references must be decorated:
const child = loading ? this.props.fallback : this.props.children;

// Regression – property access via dot must NOT be decorated:
const a = obj.return;
const b = arr.for;
const c = el.class;


// ── Fix 2: JSX text content ──────────────────────────────────────────────────

class UserPage extends Component {
  render() {
    const { name, count } = this.props;  // 'this' MUST be decorated

    return (
      <div className="page">

        {/* Inline JSX text – 'for' and 'this' must NOT be decorated: */}
        <p>This is for all users</p>
        <label htmlFor="name">Submit this form for access</label>
        <span>New for this release</span>

        {/* Multi-line JSX text – 'for', 'this', 'return', 'new' must NOT be decorated: */}
        <p>
          This feature is new for this version.
          Return to the home page for more details.
        </p>

        {/* JSX text that STARTS with a code keyword – conservatively kept, see plan note: */}
        {/* 'return' below is still decorated because the line starts with a keyword */}
        <p>
          return to this page later
        </p>

        {/* JSX expressions – 'this' MUST be decorated (it's real code): */}
        <div>{this.props.children}</div>
        <button onClick={() => this.setState({ open: true })}>
          Click for more
        </button>

        {/* JSX text with embedded expression – 'for' in text NOT decorated,
            but 'this' in expression MUST be decorated: */}
        <p>{count} items for all {this.state.label} users</p>

        {/* Code keywords inside JSX must still be decorated: */}
        {items.map((item) => {
          if (typeof item === 'undefined') return null;
          return <li key={item.id}>{item.name}</li>;
        })}

        {/* String attributes – keywords inside strings must NOT be decorated: */}
        <div className="for-all this-class new-style" aria-label="for users" />

      </div>
    );
  }
}

export default UserPage;
