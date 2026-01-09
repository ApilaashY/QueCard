"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { fetchBookSet, Book } from "@/lib/reduxStore";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

export default function CardSet() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);
  const router = useRouter();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState<string | boolean | null>(null);
  const [creatingAi, setCreatingAi] = useState<string | boolean | null>(null);
  const [clickedDocument, setClickedDocument] = useState<number | null>(null);
  const [clickedAi, setClickedAi] = useState<number | null>(null);
  const [editingCardSet, setEditingCardSet] = useState<string>("");

  useEffect(() => {
    async function loadCardSet() {
      if (typeof params.id !== "string") {
        setLoading(false);
        router.push("/");
        return;
      }
      const fetchedSet = await fetchBookSet(params.id);
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

    // Check if book is already being uploaded
    if (uploading !== null) return;

    setUploading(true);

    const formElement = event.currentTarget;
    const fileInput = formElement.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const files = fileInput?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("bookId", book.id);
    formData.append("document", files[0]);

    setUploading(files[0].name);

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
        const updatedSet = await fetchBookSet(book.id, true);
        if (updatedSet) {
          setUploading(null);
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to upload document");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    }

    setUploading(null);
  }

  async function removeDocument(documentId: string) {
    // Check if book is loaded
    if (!book) return;

    // Make sure document is not being uploaded
    if (uploading !== null) return;

    // Make sure user really want to remove document
    if (!confirm("Are you sure you want to remove this document?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/documents/remove`,
        {
          method: "POST",
          body: JSON.stringify({
            documentId,
          }),
        }
      );

      if (response.ok) {
        // Refresh the card set to show the new document
        const updatedSet = await fetchBookSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to remove document");
      }
    } catch (error) {
      console.error("Error removing document:", error);
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
        const updatedSet = await fetchBookSet(book.id, true);
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

  async function generateFlashCards() {
    // Check if book is loaded
    if (!book) return;

    // Check if AI is already being created
    if (creatingAi !== null) return;

    setCreatingAi("Generating...");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/generateFlashCards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookId: book.id,
          }),
        }
      );

      if (response.ok) {
        const updatedSet = await fetchBookSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        alert("Failed to generate flashcards");
      }
    } catch (error) {
      alert("Error generating flashcards");
    }

    setCreatingAi(null);
  }

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  function openCardOptions(card_set_id: string) {
    setMenuOpen(card_set_id);
  }

  async function removeCardSet(card_set_id: string) {
    // Check if book is loaded
    if (!book) return;

    // Make sure user really want to remove document
    if (!confirm("Are you sure you want to remove this card set?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: card_set_id,
          }),
        }
      );

      if (response.ok) {
        // Refresh the card set to show the new document
        const updatedSet = await fetchBookSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to remove card set");
      }
    } catch (error) {
      console.error("Error removing card set:", error);
    }
  }

  async function editCardSet(
    card_set_id: string,
    prompt: string,
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMenuOpen(null);

    // Check if book is loaded
    if (!book) return;

    // Make sure the book is not already processing
    if (book.card_sets.some((set) => set.processing)) {
      alert("Please wait for the current card set to finish processing");
      return;
    }

    // Set the card set to processing
    const newBook = {
      ...book,
    };
    newBook.card_sets = book.card_sets.map((set) => {
      if (set.id === card_set_id) {
        return {
          ...set,
          processing: true,
        };
      }
      return set;
    });
    setBook(newBook);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/edit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookId: book.id,
            setId: card_set_id,
            prompt,
          }),
        }
      );

      if (response.ok) {
        // Refresh the card set to show the new document
        const updatedSet = await fetchBookSet(book.id, true);
        if (updatedSet) {
          setBook(updatedSet);
        }
      } else {
        console.error("Failed to edit card set");
      }
    } catch (error) {
      console.error("Error editing card set:", error);
    }

    setEditingCardSet("");
  }
  if (loading || book === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-pulse text-xl text-gray-600">
          Loading flashcards...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-screen p-4 relative">
      {/* Popup Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-[40%] max-w-[600px] min-w-[300px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Modifications</h3>
            </div>

            <form
              onSubmit={(e) => editCardSet(menuOpen, editingCardSet, e)}
              className="flex items-center gap-2 mb-6"
            >
              <input
                type="text"
                className="flex-1 border border-gray-600 rounded-xl px-4 py-2 text-white bg-gray-800"
                value={editingCardSet}
                onChange={(e) => setEditingCardSet(e.target.value)}
                placeholder="Make changes to card set. Enter in natural language."
              />
              <input
                type="submit"
                className="bg-blue-600/20 hover:bg-blue-600/40 rounded-xl transition-colors px-4 py-2 text-white cursor-pointer"
                value="Enter"
              />
            </form>

            <div className="flex flex-col gap-3">
              <button
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-xl transition-colors text-left px-4 font-semibold"
                onClick={() => {
                  removeCardSet(menuOpen);
                  setMenuOpen(null);
                }}
              >
                Delete Card Set
              </button>
              {/* Add more modifications here */}
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-3">{book?.title}</h1>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-[1fr_1fr_1fr] gap-6 flex-1 min-h-0 w-full">
          {/* Documents */}
          <div className="bg-black/30 rounded-2xl flex flex-col p-4 min-h-0 min-w-0">
            <h2 className="text-center text-3xl">Documents</h2>
            <div className="flex-1 overflow-y-auto min-h-0">
              {book?.documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className="p-4 border-b border-gray-700 flex flex-row justify-between items-center"
                  onMouseEnter={() => setClickedDocument(index)}
                  onMouseLeave={() => setClickedDocument(null)}
                >
                  <h3 className="px-2 py-1 text-l font-semibold">
                    {doc.title}
                  </h3>
                  {clickedDocument === index && uploading === null && (
                    <button
                      className="px-2 py-1 rounded cursor-pointer"
                      onClick={() => removeDocument(doc.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
              {uploading && typeof uploading === "string" && (
                <div className="p-4 border-b border-gray-700 animate-pulse">
                  <h3 className="px-2 py-1 text-l font-semibold text-gray-400">
                    {uploading}
                  </h3>
                </div>
              )}
            </div>
            <form
              onSubmit={uploadDocument}
              className="flex flex-wrap gap-2 mt-4"
            >
              <input type="file" className="flex-1 min-w-0" />
              <input
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                value="Upload"
              />
            </form>
          </div>

          {/* Chats */}
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

          {/* Generate AI-Content */}
          <div className="bg-black/30 rounded-2xl flex flex-col p-4 min-h-0">
            <h2 className="text-center text-3xl">Generate Content</h2>

            {/* Generatable AI Content */}
            <div className="flex-1 grid grid-cols-2 gap-4 my-5 mx-3">
              <div
                className="bg-white/10 p-4 rounded-lg aspect-square cursor-pointer"
                onClick={generateFlashCards}
              >
                <h3 className="text-xl font-semibold mb-2">Flash Cards</h3>
              </div>
            </div>

            {/* Generated AI Content */}
            <div className="flex-2 flex flex-col gap-4 my-5 mx-3">
              {book.card_sets.map((card_set, index) => (
                <div
                  key={card_set.id}
                  className="relative group"
                  onMouseEnter={() => setClickedAi(index)}
                  onMouseLeave={() => setClickedAi(null)}
                >
                  <div
                    onClick={() =>
                      card_set.processing
                        ? null
                        : router.push(`/${book.id}/cards/${card_set.id}`)
                    }
                    className={`block bg-white/10 p-4 rounded-lg hover:bg-white/20 transition-colors ${
                      card_set.processing
                        ? "animate-pulse cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <h3 className="text-xl font-semibold">
                        {card_set.title}
                      </h3>
                    </div>
                  </div>
                  {clickedAi === index && (
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full cursor-pointer z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCardOptions(card_set.id);
                      }}
                    >
                      <PiDotsThreeVerticalBold size={24} />
                    </button>
                  )}
                </div>
              ))}
              {creatingAi && typeof creatingAi === "string" && (
                <div className="bg-white/5 p-4 rounded-lg animate-pulse">
                  <h3 className="text-xl font-semibold mb-2">{creatingAi}</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
