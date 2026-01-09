import { configureStore, createSlice } from "@reduxjs/toolkit";

export interface Book {
  id: string;
  title: string;
  documents: Document[];
  chats: Chat[];
  card_sets: CardSet[];
}

export interface Document {
  id: string;
  title: string;
}

export interface Chat {
  user: string;
  ai_response: string;
  created_at: string;
}

export interface CardSet {
  id: string;
  title: string;
  processing: boolean;
}

export interface Card {
  id: string;
  question: string;
  answer: string;
}

const cardSets = createSlice({
  name: "Books",
  initialState: {} as Record<string, Book>,
  reducers: {
    addBook: (state, action: { payload: { id: string; data: Book } }) => {
      state[action.payload.id] = action.payload.data;
    },
  },
});

const sendUpdates = createSlice({
  name: "SendUpdates",
  initialState: {
    sendUpdates: true,
  },
  reducers: {
    toggleSendUpdates: (state) => {
      state.sendUpdates = !state.sendUpdates;
    },
    setSendUpdates: (state, action: { payload: boolean }) => {
      state.sendUpdates = action.payload;
    },
  },
});

export const store = configureStore({
  reducer: {
    cardSets: cardSets.reducer,
    sendUpdates: sendUpdates.reducer,
  },
});

// export const { addCardSet } = cardSets.actions;

// Function to get a specfic card set from the api
export async function fetchBookSet(
  id: string,
  forceDownload: boolean = false
): Promise<Book | undefined> {
  // Try to get the card set from redux store first
  const state = store.getState();
  if (state.cardSets[id] && !forceDownload) {
    return state.cardSets[id];
  }

  // If not in store, fetch from API
  const dispatch = store.dispatch;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/fetchSet`,
      {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      console.error("Failed to fetch book");
      return;
    }

    const book = await response.json();

    // Add the card set to the store
    dispatch(cardSets.actions.addBook({ ...book }));

    return book;
  } catch (error) {
    console.error("Error fetching book:", error);
  }
  return undefined;
}

export async function fetchCardSet(id: string): Promise<Card[] | undefined> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/fetchCardSet`,
      {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      console.error("Failed to fetch card set");
      return;
    }

    const card_set = await response.json();

    return card_set.cards;
  } catch (error) {
    console.error("Error fetching card set:", error);
  }
}
