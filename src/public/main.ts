/// <reference path="../../node_modules/@types/jquery/index.d.ts" />
/// <reference path="../../node_modules/@types/socket.io-client/index.d.ts" />

import Socket = SocketIOClient.Socket;
import {Player} from "../models/Player";
import {Card, CardType} from "../models/Card";
import {Color, Colors} from "../models/Color";
import {NumericCard} from "../models/NumericCard";
import {ColorChangeCard} from "../models/ColorChangeCard";
import {PlusFourCard} from "../models/PlusFourCard";
import {PlusTwoCard} from "../models/PlusTwoCard";
import {ReturnCard} from "../models/ReturnCard";
import {SkipCard} from "../models/SkipCard";
import {Utils} from "../models/Utils";

let socket: Socket;
let stage = 1;
let player: Player = null;
let players: Player[] = [];
let currentPlayer: Player = null;
let currentCard: Card = null;
let currentColor: Color = null;
let direction: boolean;
const pageSize = 5;
let page = 1;
let choosenColor: Color = null;

socket = io.connect(`http://${document.location.hostname}:${document.location.port}`, { "forceNew": true });

socket.on("restart", function () {
    location.reload(true);
});

socket.on("players", function (plys: Player[]) {
    players = plys;
    renderPlayers();
});

socket.on("update-player", function (ply: Player) {
    let p = getPlayer(ply.id);
    if (p != null) {
        p.name = ply.name;
        p.cards = createCards(ply.cards);
        p.points = ply.points;
    } else {
        console.error("P is NULL");
    }

    if (player.id == p.id) {
        player = p;
    }

    // console.log(player == null ? "Player is null" : "Player is not null", ply == null ? "Ply is null" : "Ply is not null");

    if (player.id != ply.id || stage > 2) {
        updatePlayer(p, true);
    }
});

socket.on("show-message", function (message: string) {
    alert(message);
});

socket.on("start-game", function (ply: Player, cCard: Card, cColor: Color, dir: boolean) {
    player = ply;
    player.cards = createCards(ply.cards);
    currentCard = Utils.createCard(cCard);
    currentColor = cColor;
    direction = dir;
    setStage(3);
});

socket.on("set-current-player", function (current: Player) {
    setCurrentPlayer(current);
});

socket.on("set-direction", function (dir: boolean) {
    direction = dir;
    renderDirection();
});

socket.on("set-current-card", function (card: Card) {
    setCurrentCard(Utils.createCard(card));
});

socket.on("set-current-color", function (color: Color) {
   currentColor = color;
   setCurrentColor();
});

$(function() {
    btnRestartClick();
    btnEnterClick();
    btnSetClick();
    btnStartClick();
    btnPaginateLeftClick();
    btnPaginateRightClick();
    btnPutCardClick();
    selectColorClick();
    setStage(1);
});

function btnRestartClick() {
    $("#restart-btn").click(function(e) {
        e.preventDefault();
        restart();
    });
}

function btnEnterClick() {
    $("#btn-enter").click(function(e) {
        player = new Player(new Date().getTime(), "New Player");
        socket.emit("new-player", player);
        setStage(2);
    });
}

function btnSetClick() {
    $("#player-table").on('click', '#btn-set', () => {
        player.name = <string>$("#player-name").val();
        socket.emit("update-player", player);
    });
}

function btnStartClick() {
    $("#btn-start").click(function(e) {
        socket.emit("start");
    });
}

function btnPaginateLeftClick() {
    $("#paginate-left img").click(function () {
        if (!$("#paginate-left").hasClass("disabled")) {
            setPage(page - 1);
        }
    });
}

function btnPaginateRightClick() {
    $("#paginate-right img").click(function () {
        if (!$("#paginate-right").hasClass("disabled")) {
            setPage(page + 1);
        }
    });
}

function btnPutCardClick() {
    $("#my-cards").on("click", ".put-card-btn", function (e) {
        e.preventDefault();
        let id = $(this).closest("div").attr("id");
        let cardIndex = parseInt(id.substr(5));
        let card = player.cards[cardIndex];

        socket.emit("select-card", card);

        if (card.type == CardType.PlusFour || card.type == CardType.ColorChange) {
            openChooseColorModal();
        }
    });
}

function selectColorClick() {
    $(".choose-color").click(function () {
        $("#choose-color-" + choosenColor.codeName).html("");
        let id = $(this).attr("id");
        let color = id.substr(13);
        switch (color) {
            case "blue":
                choosenColor = Colors.BLUE;
                break;
            case "green":
                choosenColor = Colors.GREEN;
                break;
            case "red":
                choosenColor = Colors.RED;
                break;
            case "yellow":
                choosenColor = Colors.YELLOW;
                break;
        }

        $("#choose-color-" + choosenColor.codeName).html("<h2>Seleccionado</h2>");
    });
}

function setStage(s: number) {
    $("#stage-" + stage).hide(1000);
    stage = s;
    $("#stage-" + stage).show(1000, onStageChange);
}

function onStageChange() {
    if (stage == 3) {
        setCurrentCard(currentCard);
        setCurrentColor();
        renderPlayers();
        renderCards();
        renderDirection();

        socket.emit("ready");
    }
}

function restart() {
    socket.emit("restart");
}

function getPlayer(id: number): Player {
    const result = players.filter(p => p.id == id);
    if (result.length > 0) {
        return result[0];
    } else {
        return null;
    }
}

function renderPlayers() {
    if (stage == 2) {
        const table = $("#player-table tbody");
        table.html("");
        players.forEach(p => {

            if (player.id == p.id) {
                table.append(`<tr id="player-stg2-${p.id}">
                                <td><input value="${p.name}" class="input" id="player-name" autofocus></td>
                                <td><button class="button" id="btn-set">Set</button></td>
                              </tr>`);
            } else {
                table.append(`<tr id="player-stg2-${p.id}"><td>${p.name}</td></tr>`);
            }
        });
    } else if (stage == 3) {
        $(".player").remove();
        let plys = $(".players");
        players.forEach(p => {
            if (player.id == p.id) {
                $("#my-player").html(`<h5>${p.name}</h5><h3>${p.points}</h3>`);
            } else {
                plys.append(`<div class="player" id="player-${p.id}">
                            <h5>${p.name}</h5>
                            <h3>${p.points}</h3>
                        </div>`);
            }
        });
    }
}

function updatePlayer(p: Player, animate: boolean) {
    if (stage == 2) {
        $(`#player-stg2-${p.id}`).html(`<td>${p.name}</td>`);
    } else if (stage == 3) {
        let id = `#player-${p.id}`;
        if (player.id == p.id) {
            id = "#my-player";
        }
        if (animate) {
            animateNumber($(`${id} h3`), p.points, 300);
        } else {
            $(`${id}`).html(`<h5>${p.name}</h5><h3>${p.points}</h3>`);
        }

        if (player.id == p.id) {
            renderCards();
        }
    }
}

function setCurrentColor() {

    $("#current-color").removeClass("red green blue yellow")
        .addClass(currentColor.codeName);
}

function renderCards() {
    $(".card-uno").remove();
    let cards = $("#my-cards");
    player.cards.forEach((c, i) => {
        cards.append(`<div class="card-uno" id="card-${i}">
                            <img class="image" src="img/${c.getImageName()}" height="150"/>
                            <a href="#" class="put-card-btn"><img src="img/check.png"/></a>
                        </div>`);
    });

    setPage(1);
}

function setCurrentPlayer(current: Player) {
    if (currentPlayer != null) {
        if (currentPlayer.id == player.id) {
            $(`#my-player`).removeClass("active");
        } else {
            $(`#player-${currentPlayer.id}`).removeClass("active");
        }
    }
    currentPlayer = current;
    if (currentPlayer.id == player.id) {
        $(`#my-player`).addClass("active");
    } else {
        $(`#player-${currentPlayer.id}`).addClass("active");
    }

    if (currentPlayer.id == player.id) {
        player.cards.forEach((c, i) => {
            if (validateCard(c)) {
                $(`#card-${i}`).addClass("valid");
            }
        });
    } else {
        $(".card-uno").removeClass("valid");
    }
}

function renderDirection() {
    let code = direction ? "cw" : "acw";
    $("#arrow-left").attr("src", `img/arrow-${code}-left.png`);
    $("#arrow-right").attr("src", `img/arrow-${code}-right.png`);
}

function setCurrentCard(card: Card) {
    if (currentCard !== card) {
        currentCard = card;
    }

    $("#current-card").attr("src", "img/" + currentCard.getImageName());
}

function setPage(p: number) {
    $(".card-uno").removeClass("visible");
    page = p;
    for (let i = (page - 1) * pageSize; i < page * pageSize; i++) {
        if (i < player.cards.length) {
            $(`#card-${i}`).addClass("visible");
        }
    }

    if (page == 1) {
        $("#paginate-left").addClass("disabled");
    } else {
        $("#paginate-left").removeClass("disabled");
    }

    if (page * pageSize < player.cards.length) {
        $("#paginate-right").removeClass("disabled");
    } else {
        $("#paginate-right").addClass("disabled");
    }
}

function createCards(cards: Card[]): Card[] {
    return cards.map(card => Utils.createCard(card));
}

function validateCard(card: Card): boolean {
    if (card.type == currentCard.type) {
        if (currentCard.type == CardType.Numeric) {
            if (card.color.code == currentColor.code) {
                return true;
            } else {
                return (card as NumericCard).num == (currentCard as NumericCard).num;
            }
        } else {
            return true;
        }
    } else if (card.type == CardType.PlusFour || card.type == CardType.ColorChange) {
        return true;
    } else {
        return card.color.code == currentColor.code;
    }
}

function animateNumber(el: any, newValue: number, time: number) {
    const value = parseInt(el.text());
    let duration = (newValue - value) * time;
    if (duration < 0) duration = -duration;

    el.prop('Counter', value).animate({
        Counter: newValue
    }, {
        duration: duration,
        easing: 'swing',
        step: function (now: number) {
            el.text(Math.ceil(now));
        }
    });
}

function openChooseColorModal() {
    choosenColor = currentColor;
    $("#choose-color-" + choosenColor.codeName).html("<h2>Seleccionado</h2>");

    let modal = $("#choose-color-modal");
    modal.modal({
        backdrop: true,
        keyboard: false,
        show: true
    });

    modal.on("hide.bs.modal", function () {
        $("#choose-color-" + choosenColor.codeName).html("");
        socket.emit("select-color", choosenColor);
        socket.emit("turn-ended");
    });
}