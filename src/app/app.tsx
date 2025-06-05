"use client";

import dynamic from "next/dynamic";

const Main = dynamic(() => import("~/components/Main"), {
  ssr: false,
});

export default function App(
  { title }: { title?: string } = { title: "Footy App" }
) {
  console.log(title); // TODO: remove debug log
  return <Main />;
}
