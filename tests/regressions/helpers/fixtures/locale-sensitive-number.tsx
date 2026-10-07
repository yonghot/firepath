'use client';

const PRICE = (1234567.5).toLocaleString();

export function LocaleSensitiveNumber() {
  return <p>{PRICE}</p>;
}
