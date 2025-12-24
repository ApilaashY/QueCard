import { configureStore, createSlice } from "@reduxjs/toolkit";
import type { Prisma } from "@prisma/client";

// Use Prisma-generated type with included cards
export type CardSet = Prisma.card_setsGetPayload<{
  include: { card: true };
}>;

export type FlashCard = Prisma.cardGetPayload<{}>;

const cardSets = createSlice({
  name: "CardSets",
  initialState: {} as Record<string, CardSet>,
  reducers: {
    addCardSet: (state, action: { payload: { id: string; data: CardSet } }) => {
      state[action.payload.id] = action.payload.data;
    },
    updateCardValue: (
      state,
      action: {
        payload: {
          setId: string;
          cardId: string;
          field: "question" | "answer";
          newValue: string;
        };
      }
    ) => {
      const { setId, cardId, field, newValue } = action.payload;
      const cardSet = state[setId];
      if (cardSet) {
        const cardItem = cardSet.card.find((c) => c.id === cardId);
        if (cardItem) {
          cardItem[field] = newValue;
        }
      }
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
  store.dispatch(
    cardSets.actions.updateCardValue({ setId, cardId, field, newValue })
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
