import { configureStore, createSlice } from "@reduxjs/toolkit";

export interface Flashcard {
  question: string;
  answer: string;
}

const cardSets = createSlice({
  name: "CardSets",
  initialState: {} as Record<string, Flashcard[]>,
  reducers: {
    addCardSet: (
      state,
      action: { payload: { id: string; data: Flashcard[] } }
    ) => {
      state[action.payload.id] = action.payload.data;
    },
  },
});

export const store = configureStore({
  reducer: {
    cardSets: cardSets.reducer,
  },
});

// export const { addCardSet } = cardSets.actions;

// Function to get a specfic card set from the api
export async function fetchCardSet(
  id: string,
  forceDownload: boolean = false
): Promise<Flashcard[]> {
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
      console.error("Failed to fetch card set");
      return [];
    }

    const parsedCards: Flashcard[] = (await response.json()).flashcards
      .split("\n\n")
      .map((card: string) => {
        const [question, answer] = card.split("\n");
        return { question: question, answer: answer };
      });

    // Add the card set to the store
    dispatch(cardSets.actions.addCardSet({ id, data: parsedCards }));

    return parsedCards;
  } catch (error) {
    console.error("Error fetching card set:", error);
  }
  return [];
}
