"use client";

import "./toys.css";
import { useState } from "react";

// door 17: a fortune cookie. click, it cracks, a fortune falls out. tofu wrote them;
// they come in through `copy`, from the door data.

export default function Fortune({ copy = [] }: { copy?: string[] }) {
  const [order] = useState(() => [...copy.keys()].sort(() => Math.random() - 0.5));
  const [i, setI] = useState(-1);
  const cracked = i >= 0;
  const cookie = cracked ? ["  _      _  ", " ( '.  .' ) ", "  '-'  '-'  "] : ["   ______   ", "  (  ~~  )  ", "   '----'   "];
  return (
    <div className="adv-toy adv-fortune">
      <button type="button" className="adv-field-btn" onClick={() => setI((x) => (x + 1) % order.length)} aria-label={cracked ? "another fortune" : "crack the cookie"}>
        <pre className="adv-art adv-cookie" aria-hidden>
          {cookie.join("\n")}
        </pre>
      </button>
      <p className="adv-slip" aria-live="polite">
        {cracked ? copy[order[i]] : "click the cookie."}
      </p>
      {cracked ? <p className="adv-dim adv-toy-line">fortune {i + 1} of {order.length} · click for another</p> : null}
    </div>
  );
}
