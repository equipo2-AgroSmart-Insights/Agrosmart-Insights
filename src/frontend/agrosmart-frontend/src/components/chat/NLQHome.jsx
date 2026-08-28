import { useState } from "react";
import { useNLQQuery } from "../../hooks/useNLQQuery";
import ChatInput from "./ChatInput";
import SuggestedQueries from "./SuggestedQueries";
import LoadingIndicator from "./LoadingIndicator";
import DashboardContainer from "../dashboard/DashboardContainer";

export default function NLQHome() {
  const [text, setText] = useState("");
  const { runQuery } = useNLQQuery();

  function handleSubmit() {
    runQuery(text);
  }

  function handleSelectSuggestion(suggestionText) {
    setText(suggestionText);
  }

  return (
    <div className="flex flex-col w-full items-center justify-center min-h-[calc(100vh-80px)] px-margin-desktop py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[800px] h-[800px] bg-primary-fixed/20 rounded-full blur-3xl opacity-50 absolute -top-20 -left-20" />
        <div className="w-[600px] h-[600px] bg-wheat-gold/10 rounded-full blur-3xl opacity-60 absolute bottom-0 right-0" />
      </div>

      <div className="max-w-4xl w-full text-center mb-12 flex flex-col items-center">
        <h1 className="font-headline-lg text-headline-lg text-forest-green mb-6 tracking-tight max-w-3xl leading-tight">
          Decisiones inteligentes
          <br />
          para tu cosecha
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Consulta tendencias de mercado, pronósticos climáticos y obtén
          recomendaciones accionables al instante.
        </p>
      </div>

      <ChatInput value={text} onChange={setText} onSubmit={handleSubmit} />

      <LoadingIndicator />
      <DashboardContainer />

      <SuggestedQueries onSelect={handleSelectSuggestion} />
    </div>
  );
}