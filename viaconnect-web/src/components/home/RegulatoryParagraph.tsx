// Prompt #138c §4.1: regulatory posture paragraph.

export interface RegulatoryParagraphProps {
  text: string;
}

export function RegulatoryParagraph({ text }: RegulatoryParagraphProps) {
  return (
    <p className="max-w-3xl mx-auto text-center text-sm sm:text-base text-slate-300 leading-relaxed">
      {text}
    </p>
  );
}
