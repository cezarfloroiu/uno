import { isNullOrUndefined } from "util";
import create from "zustand";
import { canPlayCard } from "../BotsServer/BotsServer";
import { wrapMod } from "../utils/helpers";
import { Card, Player } from "../utils/interfaces";

interface StoreState {
  playerId: string;
  currentPlayer: number;
  orderOffset: number;
  direction: number;
  tableStack: Card[];
  drawingStack: Card[];
  players: Player[];
  lastPlayerDrawed: boolean;

  setPlayerId(playerId: string): void;
  init(players: Player[], startingCards: Card[]): void;
  move(
    nxtPlayer: number,
    card?: Card,
    draw?: number,
    cardsToDraw?: Card[]
  ): void;
  ready(): void;
}

let cardLayoutIdIdx = 111;

function generateDrawingCards(cnt: number) {
  return Array(cnt)
    .fill(0)
    .map((i) => ({ layoutId: `id_${cardLayoutIdIdx++}` }));
}

export const useGameStore = create<StoreState>((set, get) => ({
  playerId: "",
  currentPlayer: 0,
  orderOffset: 0,
  direction: 1,
  tableStack: [],
  players: [],
  drawingStack: [],
  lastPlayerDrawed: false,

  setPlayerId: (playerId: string) => set({ playerId }),

  init: (players: Player[], startingCards: Card[]) => {
    set({ tableStack: [], direction: 1, lastPlayerDrawed: false });

    // Find my player and re-order
    let playersFinal: Player[] = [];
    let myIdx = 0;
    while (myIdx < players.length) {
      if (players[myIdx].id === get().playerId) break;
      myIdx++;
    }

    for (let i = myIdx; i < players.length; i++) {
      playersFinal.push(players[i]);
    }
    set({ currentPlayer: playersFinal.length % players.length });
    for (let i = 0; i < myIdx; i++) {
      playersFinal.push(players[i]);
    }

    //Set Cards for players
    let cardsToDistribute: Card[] = startingCards.map((c) => ({
      ...c,
      layoutId: `id_${cardLayoutIdIdx++}`,
      rotationY: 0,
      playable: myIdx === 0,
      forPlayer: 0,
    }));

    for (let i = 1; i < playersFinal.length; i++) {
      cardsToDistribute = cardsToDistribute.concat(
        Array(startingCards.length)
          .fill(0)
          .map(() => ({
            layoutId: `id_${cardLayoutIdIdx++}`,
            forPlayer: i,
          }))
      );
    }

    set({
      players: playersFinal,
      drawingStack: cardsToDistribute.concat(generateDrawingCards(20)),
      orderOffset: myIdx,
    });
  },

  ready() {
    set((state) => ({
      players: state.players.map((player, idx) => {
        return {
          ...player,
          cards: state.drawingStack.filter((c) => c.forPlayer === idx),
        };
      }),
      drawingStack: state.drawingStack.filter((c) =>
        isNullOrUndefined(c.forPlayer)
      ),
    }));
  },

  move: (
    nxtPlayer: number,
    card?: Card,
    draw?: number,
    cardsToDraw?: Card[]
  ) => {
    const curPlayerObj = get().players[get().currentPlayer];
    nxtPlayer = wrapMod(nxtPlayer - get().orderOffset, get().players.length);

    if (card?.action === "reverse")
      set((state) => ({
        direction: -1 * state.direction,
      }));

    if (draw) {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id === curPlayerObj.id) {
            let newCards = get().drawingStack.slice(0, draw);
            if (curPlayerObj.id === get().playerId && cardsToDraw) {
              newCards = newCards.map((c, idx) => ({
                ...c,
                ...cardsToDraw[idx],
                rotationY: 0,
              }));
            }
            return {
              ...p,
              cards: p.cards.concat(newCards),
            };
          }
          return p;
        }),
        drawingStack: get()
          .drawingStack.slice(draw)
          .concat(generateDrawingCards(draw)),
        lastPlayerDrawed: true,
      }));
    }

    if (card) {
      let layoutId = card.layoutId;
      let shouldFlip = false;
      if (curPlayerObj.id !== get().playerId) {
        layoutId =
          curPlayerObj.cards[
            Math.floor(Math.random() * curPlayerObj.cards.length)
          ].layoutId;
        shouldFlip = true;
      } else {
        const cardToMove = curPlayerObj.cards.filter(
          (c) => c.layoutId === layoutId
        )[0];

        card.color = cardToMove.color;
        card.action = cardToMove.action;
        card.digit = cardToMove.digit;
      }

      set((state) => ({
        tableStack: [
          ...state.tableStack.slice(-1),
          {
            layoutId,
            color: card.color,
            action: card.action,
            digit: card.digit,
            flip: shouldFlip,
            rotationY: 0,
          },
        ],
        players: state.players.map((p) => {
          if (p === curPlayerObj) {
            return {
              ...p,
              cards: p.cards.filter((c) => c.layoutId !== layoutId),
            };
          }
          return p;
        }),
        lastPlayerDrawed: false,
      }));
    }

    // just a little delay to give animations some room to play
    setTimeout(() => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id === get().playerId) {
            const myTurn = nxtPlayer === 0;

            return {
              ...p,
              cards: p.cards.map((c) => {
                return {
                  ...c,
                  playable:
                    myTurn &&
                    canPlayCard(
                      get().tableStack[get().tableStack.length - 1],
                      c,
                      get().lastPlayerDrawed
                    ),
                };
              }),
            };
          }
          return p;
        }),
        currentPlayer: nxtPlayer,
      }));
    }, 500);
  },
}));
