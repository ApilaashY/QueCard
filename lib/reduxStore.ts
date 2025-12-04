import { configureStore, createSlice } from "@reduxjs/toolkit";

export interface CardSet {
  id: string;
  title: string;
  cards: FlashCard[];
}

export interface FlashCard {
  id: string;
  question: string;
  answer: string;
}

const cardSets = createSlice({
  name: "CardSets",
  initialState: {} as Record<string, CardSet>,
  reducers: {
    addCardSet: (state, action: { payload: { id: string; data: CardSet } }) => {
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
): Promise<CardSet | undefined> {
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
      return;
    }

    const cards = await response.json();

    // Add the card set to the store
    dispatch(cardSets.actions.addCardSet({ id, data: cards }));

    return cards;
  } catch (error) {
    console.error("Error fetching card set:", error);
  }
  return undefined;
}

// Function to update flash card field
export async function updateFlashcard(
  setId: string,
  cardId: string,
  field: "question" | "answer",
  newValue: string
) {
  const state = store.getState();
  const currentSet = state.cardSets[setId];
  const cardIndex = currentSet?.cards.findIndex((card) => card.id === cardId);
  if (!currentSet || cardIndex < 0 || cardIndex >= currentSet.cards.length) {
    console.error("Invalid set ID or card index");
    return;
  }

  const updatedSet = [...currentSet.cards];
  updatedSet[cardIndex] = {
    ...updatedSet[cardIndex],
    [field]: newValue,
  };

  store.dispatch(
    cardSets.actions.addCardSet({
      id: setId,
      data: { ...currentSet, cards: updatedSet },
    })
  );

  // Update the database via API route
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/updateCard`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId,
          field,
          newValue,
        }),
      }
    );
  } catch (error) {
    console.error("Error updating flashcard in database:", error);
  }
}
