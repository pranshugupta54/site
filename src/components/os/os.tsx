"use client";

import { useSyncExternalStore } from "react";
import type { OsData } from "./data";
import { Desktop } from "./desktop";
import { Phone } from "./phone";
import "./os.css";

const PHONE = "(max-width: 767px)";
const watchPhone = (f: () => void) => {
  const mq = matchMedia(PHONE);
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
};
const isPhone = () => matchMedia(PHONE).matches;
const onServer = () => null;

/**
 * p54 os: the site as a tiny desktop. The wallpaper renders on the server;
 * the desktop (or, below 768px, a phone home screen) mounts on the client,
 * where it can know the screen it's on and what this tab already had open.
 */
export function Os(data: OsData) {
  const phone = useSyncExternalStore(watchPhone, isPhone, onServer);
  return (
    <div className="os-root">
      <div className="os-wall" aria-hidden>
        <span className="os-sig">pranshu</span>
      </div>
      <h1 className="sr-only">p54 os — pranshu gupta&apos;s site, as a desktop</h1>
      {phone === null ? null : phone ? <Phone data={data} /> : <Desktop data={data} />}
    </div>
  );
}
