'use client';

import { useState } from 'react';

export function WindowBranch() {
  const [where] = useState(() => (typeof window === 'undefined' ? 'server' : 'browser'));
  return <p>{where}</p>;
}
