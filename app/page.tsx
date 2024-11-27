import { ChatWidget } from "../components/ChatWidget";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Chat Widget Demo</h1>
      <ChatWidget />
    </main>
  );
}
