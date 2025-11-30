import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to Chatbot Real</h1>
      <p className="text-xl mb-8 text-muted-foreground">
        Your AI-powered chat assistant
      </p>
      <div className="flex gap-4">
        <Link href="/chat">
          <Button>Start Chatting</Button>
        </Link>
      </div>
    </div>
  );
}

