import { QueryProvider } from "./context/QueryContext";
import ChatInput from "./components/chat/ChatInput";
import LoadingIndicator from "./components/chat/LoadingIndicator";
import DashboardContainer from "./components/dashboard/DashboardContainer";

export default function App() {
  return (
    <QueryProvider>
      <h1>AgroSmart Insights</h1>
      <ChatInput />
      <LoadingIndicator />
      <DashboardContainer />
    </QueryProvider>
  );
}
