import { useState } from "react";
import { useNLQQuery } from "../../hooks/useNLQQuery";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { runQuery } = useNLQQuery();

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    runQuery(text);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ej: ¿Debo vender mi cosecha de papa hoy o esperar?"
        style={{ width: "80%", padding: "8px" }}
      />
      <button type="submit">Preguntar</button>
    </form>
  );
}