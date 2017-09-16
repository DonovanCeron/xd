import {Player} from "./Player";
import {Card} from "./Card";
import {Color} from "./Color";

export interface Game {
    players: Player[];
    currentPlayer: Player;
    winner: Player;
    currentCard: Card;
    currentColor: Color;
    direction: boolean;
    round: number;

    start: Function;
    getPlayer(id: number): Player;
    updatePlayer(player: Player): void;
    selectCard(card: Card): void;
    pickFromDeck: Function;
    sayUno: Function;
    didntSayUno: Function;
    logOut: Function;
}

export namespace Constants {
    export const minPlayers = 2;
    export const maxPlayers = 4;
    export const initialCards = 7;
    export const pageSize = 7;
}