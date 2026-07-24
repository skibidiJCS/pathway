import type { Metadata } from "next";
import { ResearchAtlasApp } from "./components/ResearchAtlasApp";

export const metadata: Metadata = {
  title: "ResearchAtlas",
  description: "Explore a paper’s immediate citation neighborhood.",
};

export default function Home() {
  return <ResearchAtlasApp />;
}
