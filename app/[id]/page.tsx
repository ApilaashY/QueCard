"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { fetchCardSet, Book } from "@/lib/reduxStore";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function CardSet() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);
  const router = useRouter();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCardSet() {
      if (typeof params.id !== "string") {
        setLoading(false);
        router.push("/");
        return;
      }
      const fetchedSet = await fetchCardSet(params.id);
      if (fetchedSet) {
        setBook(fetchedSet);
      } else {
        router.push("/");
      }
      setLoading(false);
    }

    loadCardSet();
  }, [params.id, router]);

  // Scroll chat to bottom when chats change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [book?.chats]);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Check if book is loaded
    if (!book) return;

    const formElement = event.currentTarget;
    const fileInput = formElement.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const files = fileInput?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("bookId", book.id);
    formData.append("document", files[0]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        // Refresh the card set to show the new document
        const updatedSet = await fetchCardSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to upload document");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  }

  async function sendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Check if book is loaded
    if (!book) return;

    const formElement = event.currentTarget;
    const messageInput = formElement.querySelector(
      'input[name="textinput"]'
    ) as HTMLInputElement;
    const message = messageInput?.value;
    if (!message) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/sendChat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookId: book.id,
            message,
          }),
        }
      );

      if (response.ok) {
        const updatedSet = await fetchCardSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to send chat");
      }
    } catch (error) {
      console.error("Error sending chat:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-pulse text-xl text-gray-600">
          Loading flashcards...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-screen p-4">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-3">{book?.title}</h1>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-[1fr_2fr] gap-6 flex-1 min-h-0 w-full">
          <div className="bg-black/30 rounded-2xl flex flex-col p-4 min-h-0">
            <h2 className="text-center text-3xl">Documents</h2>
            <div className="flex-1 overflow-y-auto min-h-0">
              {book?.documents.map((doc) => (
                <div key={doc.id} className="p-4 border-b border-gray-700">
                  <h3 className="text-l font-semibold mb-2">{doc.title}</h3>
                </div>
              ))}
            </div>
            <form onSubmit={uploadDocument} className="flex flex-row mt-4">
              <input type="file" />
              <input
                type="submit"
                className="ml-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                value="Upload"
              />
            </form>
          </div>

          <div className="bg-black/30 rounded-2xl flex flex-col p-4 min-h-0">
            <h2 className="text-center text-3xl">Chats</h2>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto min-h-0">
              {book?.chats.map((chat, index) => (
                <div key={index} className="p-4 border-b border-gray-700">
                  <h3 className="text-l font-semibold mb-5 pl-15 text-right">
                    {chat.user}
                  </h3>
                  <div className="text-l font-semibold mb-1 pr-15">
                    {chat.ai_response.split(/\$\$|\$/).map((part, i) => {
                      if (i % 2 === 0) return <span key={i}>{part}</span>;
                      if (
                        part.startsWith("\n") ||
                        chat.ai_response.split(/\$\$|\$/)[i - 1]?.endsWith("\n")
                      ) {
                        return <BlockMath key={i} math={part.trim()} />;
                      }
                      return <InlineMath key={i} math={part} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={sendChat}
              className="flex flex-row mt-4 justify-center"
            >
              <input
                type="text"
                placeholder="Message"
                name="textinput"
                className="flex-1"
              />
              <input
                type="submit"
                className="ml-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
                value="Send"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
