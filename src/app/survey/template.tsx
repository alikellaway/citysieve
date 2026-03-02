export default function SurveyTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 ease-out fill-mode-both">
      {children}
    </div>
  );
}
