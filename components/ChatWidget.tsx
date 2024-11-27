"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "ai/react";
import { SendIcon } from "lucide-react";

export function ChatWidget() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      maxSteps: 5,
    });

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md border rounded-md overflow-scroll">
      <ScrollArea className="flex-grow p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading}>
          <SendIcon className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
