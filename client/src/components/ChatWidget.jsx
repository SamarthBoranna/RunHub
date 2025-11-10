import { useState, useRef, useEffect } from "react";
import { Button, Input, Card, CardBody, CardHeader } from "@heroui/react";
import { Sparkles, X, Send, Loader2, RotateCcw } from "lucide-react";
import { useActivities } from "./ActivitiesContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const MAX_CONVERSATION_LENGTH = 25; // Maximum number of messages in a conversation
const WARNING_THRESHOLD = 20; // Show warning when approaching limit

export default function ChatWidget() {
  const { userId, isAuthorized } = useActivities();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your running coach assistant. I can help you with training plans, performance analysis, and running advice based on your activity history. What would you like to know?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isAuthorized || !userId) {
    return null;
  }

  const handleClearConversation = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your running coach assistant. I can help you with performance analysis and running advice based on your activity history. What would you like to know?",
      },
    ]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check conversation length limit
    if (messages.length >= MAX_CONVERSATION_LENGTH) {
      const limitMessage = {
        role: "assistant",
        content:
          "This conversation has reached the maximum length. Please start a new conversation by clicking the 'Clear' button to continue.",
      };
      setMessages((prev) => [...prev, limitMessage]);
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message to chat
    const newUserMessage = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          // Rate limit exceeded
          const retryAfter = errorData.retry_after || 60;
          throw new Error(`RATE_LIMIT:${retryAfter}`);
        }
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage;
      if (error.message && error.message.startsWith("RATE_LIMIT:")) {
        const retryAfter = parseInt(error.message.split(":")[1]);
        const minutes = Math.ceil(retryAfter / 60);
        errorMessage = {
          role: "assistant",
          content: `You've sent too many messages. Please wait ${minutes} ${
            minutes === 1 ? "minute" : "minutes"
          } before trying again.`,
        };
      } else {
        errorMessage = {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again later.",
        };
      }
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[1000] bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Open chat"
          style={{ marginBottom: "0" }}
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <Card
          className="fixed bottom-6 right-6 z-[1000] w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] flex flex-col shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            marginBottom: "0",
          }}
        >
          {/* Header */}
          <CardHeader
            className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary text-white rounded-t-lg"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.95)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <h3 className="font-semibold">RunHub AI</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={handleClearConversation}
                className="text-white hover:bg-white/20"
                title="Clear conversation"
              >
                <RotateCcw size={16} />
              </Button>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X size={18} />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardBody
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ backgroundColor: "rgba(249, 250, 251, 0.95)" }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            {/* Warning message when approaching limit */}
            {messages.length >= WARNING_THRESHOLD &&
              messages.length < MAX_CONVERSATION_LENGTH && (
                <div className="flex justify-center">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 max-w-[90%]">
                    <p className="text-xs text-yellow-800 text-center">
                      Conversation length: {messages.length}/
                      {MAX_CONVERSATION_LENGTH} messages. Consider starting a
                      new conversation soon.
                    </p>
                  </div>
                </div>
              )}
            <div ref={messagesEndRef} />
          </CardBody>

          {/* Input */}
          <div
            className="p-4 border-t border-gray-200 rounded-b-lg"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.95)" }}
          >
            {messages.length >= MAX_CONVERSATION_LENGTH ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600 mb-2">
                  Conversation limit reached. Click the refresh button above to
                  start a new conversation.
                </p>
                <Button
                  color="primary"
                  size="sm"
                  onPress={handleClearConversation}
                  startContent={<RotateCcw size={16} />}
                >
                  Start New Conversation
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your running performance..."
                  disabled={
                    isLoading || messages.length >= MAX_CONVERSATION_LENGTH
                  }
                  className="flex-1"
                  size="sm"
                />
                <Button
                  isIconOnly
                  color="primary"
                  onPress={handleSend}
                  disabled={
                    !inputValue.trim() ||
                    isLoading ||
                    messages.length >= MAX_CONVERSATION_LENGTH
                  }
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
