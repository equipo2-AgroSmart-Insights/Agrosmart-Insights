import { QueryProvider } from "./context/QueryContext";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import NLQHome from "./components/chat/NLQHome";

export default function App() {
  return (
    <QueryProvider>
      <Sidebar />
      <div className="pl-72">
        <Header />
        <main className="relative pt-20 min-h-screen bg-background">
          <NLQHome />
        </main>
      </div>
    </QueryProvider>
  );
}