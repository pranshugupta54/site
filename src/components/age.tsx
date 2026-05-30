"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

function ageYMD() {
  const dob = new Date(SITE.dob + "T00:00:00");
  const now = new Date();
  let y = now.getFullYear() - dob.getFullYear();
  let m = now.getMonth() - dob.getMonth();
  let d = now.getDate() - dob.getDate();
  if (d < 0) {
    m -= 1;
    // days in the previous month
    d += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}

export function Age({ className }: { className?: string }) {
  const [s, setS] = useState("");
  useEffect(() => {
    const upd = () => {
      const { y, m, d } = ageYMD();
      setS(`${y}y ${m}m ${d}d`);
    };
    upd();
    const id = setInterval(upd, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} suppressHydrationWarning>
      {s || "--"}
    </span>
  );
}
