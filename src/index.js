// Imports
import swal from 'sweetalert';
import './css/style.css';
import regeneratorRuntime from "regenerator-runtime";
import back from '../src/imgs/back.jpg';
import ApiCtrl from './js/ApiCtrl';
import FirebaseCtrl from './js/FirebaseCtrl';
// 
// 
// App Ctrl
// 
// 
const AppCtrl = (function(FirebaseCtrl, ApiCtrl) {
    const grab = document.querySelector.bind(document);
    const UISelectors = {
        gameHistory: grab('.game-history'),
        gameHistoryGoBack: grab('#game-history-go-back'),
        loader: '.loader',
        welcomeSection: grab('#welcome-section'),
        guestBtn: grab('#guest'),
        signInBtn: grab('#sign-in'),
        google: grab('#google'),
        github: grab('#github'),
        dealerHandWrapper: grab('#dealer-hand-wrapper'),
        gameRound: grab('.game-round'),
        dealerCardValue: grab('.dealer-hand-value'),
        dealerHandCardWrapper: grab('.dealer-hand-card-wrapper'),
        gameFeedbackText: grab('.game-feedback-text'),
        nextRoundWrapper: grab('.next-round-wrapper'),
        nextRoundBtn: grab('#next-round'),
        playerHandWrapper: grab('#player-hand-wrapper'),
        playerHandCardWrapper: grab('.player-hand-card-wrapper'),
        playerCredit: grab('#credit'),
        betChips: grab('.bet-chips'),
        betValue: grab('.player-hand-bet-value'),
        playerName: grab('.player-hand-name'),
        playerCardValue: grab('.player-hand-value'),
        betForm: grab('#bet-form'),
        decrementBtn: grab('.decrement'),
        betInput: grab('#bet-input'),
        incrementBtn: grab('.increment'),
        playerWhatNext: grab('.player-hand-what-next'),
        whatNextBtn: grab('#what-next-btn'),
        hit: grab('#hit'),
        stand: grab('#stand'),
        doubleDown: grab('#double-down'),
        gameOptions: grab('#game-options-section'),
        topResultsBtn: grab('#top-results'),
        historyBtn: grab('#history'),
        historyRoundsWrapper: grab('.history-rounds-wrapper'),
        saveBtn: grab('#save'),
        loadBtn: grab('#load'),
        restartBtn: grab('#restart'),
        signOutBtn: grab('#sign-out'),
        signInBtnOptions: grab('#sign-in-options'),
        googleOptions: grab('#google-options'),
        githubOptions: grab('#github-options'),
        topResults: grab('.top-results'),
        resultsGoBack: grab('#results-go-back'),
        floatingOptions: grab('.floating-options'),
        backCard: '.back',
        saveWrapper: grab('.save-wrapper'),
        loadWrapper: grab('.load-wrapper'),
    };
    const state = {
        game: {
            deckID: null,
            player: {
                displayName: null,
                credit: 1000,
                hand: {},
                currentValue: null,
                busted: false
            },
            dealer: {
                hand: {},
                currentValue: null,
                busted: false
            },
            bet: null,
            round: null,
            lastMove: null,
            resolveCards: null
        },
        history: {},
    };
    const userDocRef = {};   
    const savedGamesSnapshot = {};
    const unsubscribeFromAuthService = {};
    // Card related
    const dealCards = function(cards) {
        let playerHand = [];
        let dealerHand = [];
        let i = 0;
        let j = 0;
        cards.forEach((card, index) => {
            if (index % 2) {
                state.game.dealer.hand[i] = card;
                i++;
                if (index === 1) {
                    dealerHand.push(generateCard('dealer', card.image, false));
                    card.back = true;
                } else {
                    dealerHand.push(generateCard('dealer', card.image))
                }
            } else {
                state.game.player.hand[j] = card;
                j++;
                playerHand.push(generateCard('player', card.image));
            }
        });
        // Clear hands
        UISelectors.playerHandCardWrapper.innerHTML = '';
        UISelectors.dealerHandCardWrapper.innerHTML = '';
        const playerHandCardWrapper = UISelectors.playerHandCardWrapper;
        const dealerHandCardWrapper = UISelectors.dealerHandCardWrapper;
        playerHand.forEach((card, index) => {
            playerHandCardWrapper.appendChild(card);
            dealerHandCardWrapper.appendChild(dealerHand[index]);
        });
    };
    const dealSingleCard = function(card, player = 'player') {
        const cardWrapper = grab(`.${player}-hand-card-wrapper`);
        const hand = state.game[player].hand;
        const index = Object.keys(hand).length;
        hand[index] = card;
        cardWrapper.appendChild(generateCard(player, card.image));
    };
    const generateCard = function(hand, image, front = true) {
        const card = document.createElement('div');
        hand === 'player' ? (card.className = 'card player-hand-card') : (card.className = 'card dealer-hand-card');
        if (front) {
            card.style.backgroundImage = `url(${image})`;
        } else {
            card.style.backgroundImage = `url(${back})`;
            card.classList.add('back');
        }
        return card;
    };
    const getValue = function(card) {
        const value = card.value;
        if (value === "KING" || value === "QUEEN" || value === "JACK") {
            card.trueValue = 10;
            return 10;
        } else if(value === "ACE") {
            card.trueValue = 11;
            return 11;
        } else {
            card.trueValue = parseInt(value);
            return parseInt(value);
        }
    };
    // UI table
    const resetTable = async function() {
        // Clear dealer's hand & score
        clearHands();
        // Hide round
        UISelectors.gameRound.textContent = '';
        // Reset dealer's score
        UISelectors.dealerCardValue.classList.add('hidden');
        UISelectors.dealerCardValue.textContent = '';
        // Reset feedback
        UISelectors.gameFeedbackText.textContent = 'Place your bet (min. 50) ';
        // Clear bet & chips
        if (UISelectors.betChips.classList.contains('hidden')) {
            // Round ended
            UISelectors.gameFeedbackText.classList.remove('hidden');
            UISelectors.nextRoundWrapper.classList.add('hidden');
            UISelectors.whatNextBtn.disabled = false;
        } else {
            // Round ongoing
            UISelectors.betChips.classList.add('hidden');
            UISelectors.betValue.textContent = '';
        }
        // Reset player's credit, hand & score
        UISelectors.playerCredit.textContent = 1000;
        UISelectors.playerCardValue.classList.add('hidden');
        UISelectors.playerCardValue.textContent = '';
        // Reset bet form, what next btn
        UISelectors.whatNextBtn.disabled = false;
        UISelectors.doubleDown.parentElement.classList.remove('hidden');
        UISelectors.playerWhatNext.classList.add('hidden');
        UISelectors.betForm.classList.remove('hidden');
        toggleBetForm(false);
        UISelectors.betForm.reset();
        // Clear game state & history
        state.game.player.busted = false;
        state.game.player.currentValue = null;
        state.game.player.hand = [];
        state.game.player.credit = 1000;
        state.game.player.displayName = null;
        state.game.dealer.busted = false;
        state.game.dealer.currentValue = null;
        state.game.dealer.hand = [];
        state.game.bet = null;
        state.game.round = null;
        state.game.lastMove = null;
        state.game.resolveCards = null;
        state.game.deckID = null;
        state.history = {};
        // Get new deck
        try {
            const cards = await ApiCtrl.getDeck();
            // Set new deck ID
            state.game.deckID = cards.deck_id;
        } catch (error) {
            showMessage('Network problem! Check your internet connection and refresh!');
        }
    };
    const setHistoryTable = function(history) {
        // Set round
        UISelectors.gameRound.textContent = `round ${history.round}`;
        // Set hands
        UISelectors.dealerHandCardWrapper.innerHTML = '';
        UISelectors.playerHandCardWrapper.innerHTML = '';
        Object.keys(history.dealer.hand).forEach(key => {
            UISelectors.dealerHandCardWrapper.appendChild(generateCard('dealer', history.dealer.hand[key].image));
        });
        Object.keys(history.player.hand).forEach(key => {
            UISelectors.playerHandCardWrapper.appendChild(generateCard('player', history.player.hand[key].image));
        });
        // Set dealer's card value
        UISelectors.dealerCardValue.classList.remove('hidden');
        UISelectors.dealerCardValue.textContent = history.dealer.currentValue;
        // Set feedback
        if (!UISelectors.nextRoundWrapper.classList.contains('hidden')) {
            UISelectors.nextRoundWrapper.classList.add('hidden');
            UISelectors.gameFeedbackText.classList.remove('hidden');
        }
        UISelectors.gameFeedbackText.textContent = `${history.resolveCards} after ${history.lastMove}`;
        // Set chips
        UISelectors.betChips.classList.remove('hidden');
        UISelectors.betValue.textContent = history.bet;
        // Set player's credit, score
        UISelectors.playerCredit.textContent = history.player.credit;
        UISelectors.playerCardValue.textContent = history.player.currentValue;
        UISelectors.playerCardValue.classList.remove('hidden');
        // Set bet form, what next btn
        if (UISelectors.playerWhatNext.classList.contains('hidden')) {
            UISelectors.betForm.classList.add('hidden');
        } else {
            UISelectors.playerWhatNext.classList.add('hidden');
        }
    };
    const setNextRoundTable = function(history) {
        // Clear hands
        clearHands();
        // Set game round
        if (!(history.round === null)) {
            UISelectors.gameRound.textContent = `round ${history.round}`;
        }
        // Reset dealer's score
        UISelectors.dealerCardValue.classList.add('hidden');
        UISelectors.dealerCardValue.textContent = '';
        // Reset feedback
        UISelectors.gameFeedbackText.classList.remove('hidden');
        UISelectors.nextRoundWrapper.classList.add('hidden');
        // Reset chips
        if (!UISelectors.betChips.classList.contains('hidden')) {
            UISelectors.betChips.classList.add('hidden');
        }
        UISelectors.betValue.textContent = '';
        // Reset player's credit, score
        UISelectors.playerCredit.textContent = history.player.credit;
        UISelectors.playerCardValue.classList.add('hidden');
        UISelectors.playerCardValue.textContent = '';
        // Reset bet form, what next btn
        UISelectors.whatNextBtn.disabled = false;
        UISelectors.doubleDown.parentElement.classList.remove('hidden');
        UISelectors.playerWhatNext.classList.add('hidden');
        toggleBetForm(false);
        UISelectors.betForm.reset();
        if (history.round > 5) {
            UISelectors.gameFeedbackText.textContent = 'Game ended!'
        } else {
            UISelectors.betForm.classList.remove('hidden');
            UISelectors.gameFeedbackText.textContent = 'Place your bet (min. 50)'
        }
    };
    const setTable = function(history) {
        if (!Object.keys(history.dealer.hand).length) {
            // Beginning of a new round
            setNextRoundTable(history);
        } else {
            // Round ongoing
            // Set round
            UISelectors.gameRound.textContent = `round ${history.round}`;
            // Set hands
            UISelectors.dealerHandCardWrapper.innerHTML = '';
            UISelectors.playerHandCardWrapper.innerHTML = '';
            Object.keys(history.dealer.hand).forEach((key, index) => {
                if (!index) {
                    UISelectors.dealerHandCardWrapper.appendChild(generateCard('dealer', history.dealer.hand[key].image, false));
                } else {
                    UISelectors.dealerHandCardWrapper.appendChild(generateCard('dealer', history.dealer.hand[key].image));
                }
            });
            Object.keys(history.player.hand).forEach(key => {
                UISelectors.playerHandCardWrapper.appendChild(generateCard('player', history.player.hand[key].image));
            });
            // Set dealer's card value
            if (UISelectors.dealerCardValue.classList.contains('hidden')) {
                UISelectors.dealerCardValue.classList.remove('hidden');
            }
            UISelectors.dealerCardValue.textContent = history.dealer.currentValue;
            // Set feedback
            UISelectors.gameFeedbackText.textContent = 'Player! Your Move!';         
            // Set chips
            UISelectors.betChips.classList.remove('hidden');
            UISelectors.betValue.textContent = history.bet;
            // Set player's credit, score
            UISelectors.playerCredit.textContent = history.player.credit;
            if (UISelectors.playerCardValue.classList.contains('hidden')) {
                UISelectors.playerCardValue.classList.remove('hidden');
            }
            UISelectors.playerCardValue.textContent = history.player.currentValue;
            // Set bet form, what next btn
            if (!UISelectors.betForm.classList.contains('hidden')) {
                UISelectors.betForm.classList.add('hidden');
            }
            UISelectors.playerWhatNext.classList.remove('hidden');
            UISelectors.playerWhatNext.disabled = false;
            if (history.lastMove === 'hit') {
                UISelectors.doubleDown.parentElement.classList.add('hidden');
            }
        }
    };
    const restoreGameTable = function(history) {
        if (history.round == 5) {
            // Game ended
            setTable(history);
        } else {
            if (history.resolveCards !== null) {
                // Round ended - adjust game state
                history.lastMove = null;
                history.resolveCards = null;
                history.round = history.round + 1;
            }
            // Render table
            setTable(history);
        }
    };
    const showTable = function() {
        // Add loader
        showLoader();
        setTimeout(() => {
            // Adjust UI
            grab(UISelectors.loader).parentElement.parentElement.remove();
            UISelectors.welcomeSection.classList.add('roll-up');
            UISelectors.gameFeedbackText.textContent = 'Place your bet (min. 50)'
            grab('body').classList.remove('no-overflow');
        }, 1000);
    };
    const clearHands = function() {
        const html = `
        <div class="card"></div>
        <div class="card"></div>
        `;
        UISelectors.dealerHandCardWrapper.innerHTML = html;
        UISelectors.playerHandCardWrapper.innerHTML = html;
    };
    // Game logic
    const checkCards = function(hand, player = 'player') {
        let score = 0;
        if (state.game[player].currentValue === null) {
            // Check both cards
            Object.keys(hand).forEach(index => {
                hand[index].back === undefined ? (score += getValue(hand[index])) : getValue(hand[index]);
            });
            // Adjust UI
            UISelectors[`${player}CardValue`].classList.remove('hidden');
        } else {
            // Check last card
            const card = hand[Object.keys(hand).length - 1];
            score = getValue(card);
            score += state.game[player].currentValue;
        }
        // Adjust score
        score = (score > 21 ? checkAces(state.game[player].hand, score) : score);
        // Adjust hand value
        state.game[player].currentValue = score;
        UISelectors[`${player}CardValue`].textContent = score;
        return score;
    };
    const checkAces = function(hand, score) {
        let currentScore = score;
        for (let i = 0; i < Object.keys(hand).length; i++) {
            // Look for an ACE
            if (hand[i].trueValue == 11) {
                // Change its value to 1
                hand[i].trueValue = 1;
                // Recalculate hand
                currentScore -= 10;
                break;
            }
        }
        return currentScore;
    };
    const resolveCards = async function(currentPlayerScore, player = 'player') {
        if (currentPlayerScore > 21) {
            // Busted
            state.game[player].busted = true;
            if (player === 'player') {
                let dealerScore = 0;
                const hand = state.game.dealer.hand;
                Object.keys(hand).forEach(index => {
                    if (hand[index].back !== undefined) {
                        // Flip card
                        grab(UISelectors.backCard).style.backgroundImage = `url('${hand[index].image}')`;
                    }
                    dealerScore += getValue(hand[index]);
                });
                state.game.dealer.currentValue = dealerScore;
                UISelectors.dealerCardValue.textContent = dealerScore;
                return dealerWins();
            } else {
                return playerWins();
            }
        } else if (currentPlayerScore == 21 && player === 'player') {
            // Player has blackjack
            return await resolveDealer(currentPlayerScore);
        } else if (currentPlayerScore == 21 && player === 'dealer') {
            // Dealer has blackjack
            const playerScore = state.game.player.currentValue;
            return whoWins(playerScore, currentPlayerScore);
        } else {
            return false;
        }
    };
    const resolveDealer = async function(playerScore) {
        // Check cards
        const hand = state.game.dealer.hand;
        let dealerScore = 0;
        Object.keys(hand).forEach(index => {
            if (hand[index].back !== undefined) {
                // Flip card
                grab(UISelectors.backCard).style.backgroundImage = `url('${hand[index].image}')`;
            }
            dealerScore += getValue(hand[index]);
        });
        // Adjust game state
        state.game.dealer.currentValue = dealerScore;
        // Adjust UI
        UISelectors.dealerCardValue.textContent = dealerScore;
        // Resolve cards
        const outcome = await resolveCards(dealerScore, 'dealer');
        // Act accordingly
        if (outcome) { return outcome; }
        else {
            if (dealerScore >= 17) {
                return whoWins(playerScore, dealerScore);
            } else {
                // Needs to keep hitting till gets 17 or higher
                const outcome = await keepHitting();
                if (!outcome) {
                    const dealerScore = state.game.dealer.currentValue;
                    return whoWins(playerScore, dealerScore);
                } else { return true; }
            }
        }
    };
    const keepHitting = async function() {
        while(true) {
            try {
                // Draw cards
                const draw = await ApiCtrl.drawCards(state.game.deckID);
                dealSingleCard(draw.cards[0], 'dealer');
                // Check cards
                const cardsValue = checkCards(state.game.dealer.hand, 'dealer');
                const outcome = await resolveCards(cardsValue, 'dealer');
                if (outcome) { return true; }
                else if (!outcome && cardsValue >= 17) { return false; }
            } catch (error) {
                showMessage('Network problem! Check your internet connection and refresh!');
                break;
            }
        }
    };
    const whoWins = function(playerScore, dealerScore) {
        if (playerScore > dealerScore) {
            // Player wins
            return playerWins();
        } else if (dealerScore > playerScore) {
            // Dealer wins
            return dealerWins();
        } else {
            // Push
            return push();
        }
    };
    const playerWins = function() {
        const winning = state.game.bet * 1.5;
        // Update game state
        state.game.player.credit += winning;
        state.game.resolveCards = 'player wins';
        UISelectors.gameFeedbackText.textContent = `Player wins`;
        roundEnds();
        return true;
    };
    const dealerWins = function() {
        // Update game state
        state.game.resolveCards = 'dealer wins';
        UISelectors.gameFeedbackText.textContent = `Dealer wins`;
        roundEnds();
        return true;
    };
    const push = function() {
        // Update game state
        state.game.resolveCards = 'push';
        state.game.player.credit += state.game.bet;
        UISelectors.gameFeedbackText.textContent = `Push`;
        roundEnds();
        return true;
    };
    const roundEnds = function() {
        setHistory();
        // Reset player & dealer
        state.game.player.busted = false;
        state.game.player.currentValue = null;
        state.game.player.hand = {};
        state.game.dealer.busted = false;
        state.game.dealer.currentValue = null;
        state.game.dealer.hand = {};
        state.game.bet = null;
        // Update UI
        UISelectors.playerCredit.textContent = state.game.player.credit;
        UISelectors.betChips.classList.add('hidden');
        UISelectors.betValue.innerHTML = '';
        // Show popup & ask user what next
        setTimeout(async () => {
            await whatNext();
        }, 2500);
    };
    const setHistory = function() {
        const round = `round${state.game.round}`;
        const game = cloneObject(state.game);
        state.history[round] = game;
    };
    const cloneObject = function(obj) {
        let clone = {};
        for(let i in obj) {
            if(obj[i] != null &&  typeof(obj[i])=="object") {
                clone[i] = cloneObject(obj[i]);
            } else {
                clone[i] = obj[i];
            }
        }
        return clone;
    };
    const whatNext = async function() {
        if (state.game.round == 5) {
            // Game ends
            await gameEnds();
        } else {
            UISelectors.nextRoundWrapper.classList.remove('hidden');
            UISelectors.gameFeedbackText.classList.add('hidden');
        }
    };
    const gameEnds = async function() {
        window.scroll({
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
        // Update top results
        setTopResults(state.game.player.credit);
        // Adjust UI
        UISelectors.gameFeedbackText.textContent = `Game ends`;
        // Show loader
        showLoader();
        setTimeout(async () => {
            // Reset game state
            await resetTable();
            // Remove loader
            grab(UISelectors.loader).parentElement.parentElement.remove();
        }, 1000);
    };   
    // TOP RESULTS
    const toggleTopResults = function() {
        UISelectors.topResults.classList.toggle('hidden');
        UISelectors.floatingOptions.classList.toggle('hidden');
    };
    const setTopResults = function(result) {
        const topResults = getFromLS("results");
        if (topResults === null) {
            // No results in local storage
            const data = { "results": [result] };
            localStorage.setItem("results", JSON.stringify(data));
        } else {
            // Append new top result
            topResults.results.push(result);
            // Sort top results
            topResults.results.sort((a, b) => b - a);
            // Keep top 5 results
            if (topResults.results.length > 5) {
                topResults.results.pop();
            }
            localStorage.setItem("results", JSON.stringify(topResults));
        }
	};
	const getFromLS = function(key) {
		return JSON.parse(localStorage.getItem(key));
	};
    const displayTopResults = function() {
        const topResults = getFromLS("results");
        const ul = document.createElement('ul');
        if (topResults === null) {
            // Render message
            ul.innerHTML = 'No results to show!'
        } else {
            // Render list of top results
            let html = '';
            topResults.results.forEach((result, index) => {
                html += `<li>${index + 1}. ${result}</li>`;
            });
            ul.innerHTML = html;
        }
        UISelectors.topResults.lastElementChild.appendChild(ul);
    };
    const saveToLocalStorage = function(data) {
        localStorage.setItem("savedGames", JSON.stringify(data));
    };
    // GAME HISTORY
    const showGameHistory = function(target, className = 'hidden') {
        const gameHistory = target;
        const gameRounds = state.history;
        // Reset html
        gameHistory.lastElementChild.innerHTML = '';
        // Create html
        let html = '';
        if (Object.keys(gameRounds).length) {
            Object.keys(gameRounds).forEach(key => {
                html += `
                <button id="${key}" class="control-btn">
                    <span>${key}</span>
                </button>
                `;
            });
        } else {
            html = 'Nothing to show!'
        }
        gameHistory.lastElementChild.innerHTML = html;
        // Show game history
        gameHistory.classList.toggle(className);
    };
    const showLoadedGames = function() {
        const loadedGames = savedGamesSnapshot.docs.savedGames;
        // Reset html
        UISelectors.loadWrapper.innerHTML = '';
        // Create html
        let html = '';
        if (Object.keys(loadedGames).length) {
            Object.keys(loadedGames).forEach(key => {
                const date = (new Date(parseInt(key))).toLocaleString();
                html += `
                <button id="${key}" class="control-btn">
                    <span>${date}</span>
                </button>
                `;
            });
        } else {
            html = 'Nothing to show!'
        }
        UISelectors.loadWrapper.innerHTML = html;
        // Show game history
        UISelectors.loadWrapper.classList.toggle('roll-up');
    };
    // OPTIONS
    const toggleOptions = function() {
        if (userDocRef.docs === null && !UISelectors.saveBtn.classList.contains('hidden')) {
            UISelectors.saveBtn.classList.add('hidden');
            UISelectors.loadBtn.classList.add('hidden');
            UISelectors.signOutBtn.classList.add('hidden');
            UISelectors.signInBtnOptions.classList.remove('hidden');
        }
        if (userDocRef.docs && !UISelectors.signInBtnOptions.classList.contains('hidden')) {
            UISelectors.signInBtnOptions.classList.add('hidden');
            UISelectors.saveBtn.classList.remove('hidden');
            UISelectors.loadBtn.classList.remove('hidden');
            UISelectors.signOutBtn.classList.remove('hidden');
        }
        window.scroll({
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
        UISelectors.gameOptions.classList.toggle('roll-up');
        UISelectors.floatingOptions.firstElementChild.classList.toggle('hidden');
        UISelectors.floatingOptions.lastElementChild.classList.toggle('hidden');
        // Hide game history div
        if (!UISelectors.historyRoundsWrapper.classList.contains('roll-up')) {
            UISelectors.historyRoundsWrapper.classList.add('roll-up');
        }
        // Hide save games div
        if (!UISelectors.saveWrapper.classList.contains('roll-up')) {
            UISelectors.saveWrapper.classList.add('roll-up');
        }
        // Hide load games div
        if (!UISelectors.loadWrapper.classList.contains('roll-up')) {
            UISelectors.loadWrapper.classList.add('roll-up');
        }
        setTimeout(() => {
            grab('body').classList.toggle('no-overflow');
        }, 250);
    };
    // MISCELLANEOUS
    const toggleBetForm = function(enable = true) {
        UISelectors.betForm.bet.disabled = enable;
        UISelectors.betForm["bet-submit"].disabled = enable;
        UISelectors.betForm.decrement.disabled = enable;
        UISelectors.betForm.increment.disabled = enable;
    };
    const showLoader = function() {
        const loader = document.createElement('div');
        loader.className = 'loader-wrapper';
        loader.innerHTML = '<div><div class="loader"></div></div>';
        grab('body').appendChild(loader);
    };
    const updateName = function(name = 'guest') {
        state.game.player.displayName = name;
        UISelectors.playerName.textContent = name;
    };
    const showMessage = function(text) {
        const div = document.createElement('div');
        div.className = 'show-message';
        const divMsg = document.createElement('div');
        divMsg.textContent = text;
        div.appendChild(divMsg);
        grab('body').appendChild(div);
    };
    const welcomeBtns = function(disable) {
        UISelectors.guestBtn.disabled = disable;
        UISelectors.signInBtn.disabled = disable;
    };
    const loadEventListeners = function() {
        // GUEST
        UISelectors.guestBtn.addEventListener('click', () => {
            showTable();
            UISelectors.playerName.textContent = 'guest';
        });
        // LOG IN WITH GOOGLE
        UISelectors.google.addEventListener('click', e => {
            e.preventDefault();
            FirebaseCtrl.signInGoogle();
        });
        UISelectors.googleOptions.addEventListener('click', e => {
            e.preventDefault();
            // Show loader
            showLoader();
            // Options
            FirebaseCtrl.signInGoogle();
            toggleOptions();
            setTimeout(async () => {
                await resetTable();
                UISelectors.playerName.textContent = userDocRef.displayName;
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        // LOG IN WITH GITHUB
        UISelectors.github.addEventListener('click', e => {
            e.preventDefault();
            FirebaseCtrl.signInGithub();
        });
        // LOG IN WITH GITHUB
        UISelectors.githubOptions.addEventListener('click', e => {
            e.preventDefault();
            // Show loader
            showLoader();
            // Options
            FirebaseCtrl.signInGithub();
            toggleOptions();
            setTimeout(async () => {
                await resetTable();
                UISelectors.playerName.textContent = userDocRef.displayName;
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        // SIGNED OUT
        UISelectors.signOutBtn.addEventListener('click', e => {
            // Show loader
            showLoader();
            FirebaseCtrl.signOut();
            setTimeout(async () => {
                await resetTable();
                UISelectors.playerName.textContent = 'guest';
                // Options
                toggleOptions();
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        // BET
        UISelectors.betForm.addEventListener('submit', async e => {
            e.preventDefault();
            // Basic bet validation
            const bet = Number(UISelectors.betForm.bet.value);
            if (bet !== '' && bet >= 50 && bet <= state.game.player.credit) {
                // Disable form
                toggleBetForm();
                // Adjust game state
                if (state.game.round == null) {
                    state.game.round = 1;
                    UISelectors.gameRound.textContent = `round: ${state.game.round}`;
                }
                state.game.lastMove = 'bet';
                state.game.player.credit -= bet;
                state.game.bet = bet;
                // Adjust UI
                UISelectors.gameFeedbackText.textContent = `Player bets ${bet}`;
                UISelectors.playerCredit.textContent = state.game.player.credit;
                UISelectors.betChips.classList.remove('hidden');
                UISelectors.betValue.textContent = bet;
                setTimeout(async () => {
                    try {
                        // Adjust UI
                        UISelectors.gameFeedbackText.textContent = `Drawing and dealing`;
                        // Draw cards
                        const draw = await ApiCtrl.drawCards(state.game.deckID, 4);
                        // Deal cards
                        dealCards(draw.cards);
                        // Check cards
                        const playerCards = checkCards(state.game.player.hand);
                        checkCards(state.game.dealer.hand, 'dealer');
                        const outcome = await resolveCards(playerCards, 'player');
                        if (!outcome) {
                            // Adjust UI
                            UISelectors.gameFeedbackText.textContent = `Player! Your move!`;
                            // Hide bet form
                            UISelectors.betForm.classList.add('hidden');
                            // Show what next options
                            UISelectors.playerWhatNext.classList.remove('hidden');
                        }
                    } catch (error) {
                        showMessage('Network problem! Check your internet connection and refresh!');
                    }
                }, 2500);
            }
        });
        // HIT
        UISelectors.hit.addEventListener('click', e => {
            // Disable btns
            UISelectors.whatNextBtn.disabled = true;
            // Update last move
            state.game.lastMove = 'hit';
            // Adjust UI
            UISelectors.gameFeedbackText.textContent = `Player hits`;
            setTimeout(async () => {
                try {
                    // Draw card
                    const draw = await ApiCtrl.drawCards(state.game.deckID);
                    // Deal card
                    dealSingleCard(draw.cards[0]);
                    // Check card
                    const cardsValue = checkCards(state.game.player.hand);
                    const outcome = await resolveCards(cardsValue, 'player');
                    if (!outcome) {
                        // Enable form
                        UISelectors.whatNextBtn.disabled = false;
                        // Adjust UI - hide double down
                        UISelectors.doubleDown.parentElement.classList.add('hidden');
                    }
                } catch (error) {
                    showMessage('Network problem! Check your internet connection and refresh!');
                }
            }, 2500);
        });
        // STAND
        UISelectors.stand.addEventListener('click', async e => {
            // Disable btns
            UISelectors.whatNextBtn.disabled = true;
            // Update game state
            state.game.lastMove = 'stand';
            // Adjust UI
            UISelectors.gameFeedbackText.textContent = `Player stands`;
            setTimeout(async () => {
                try {
                    // Check cards
                    const outcome = await resolveCards(state.game.player.currentValue, 'player');
                    // Act accordingly
                    if (!outcome) {
                        await resolveDealer(state.game.player.currentValue);
                    }
                } catch (error) {
                    showMessage('Network problem! Check your internet connection and refresh!');
                }
            }, 2500);
        });
        // DOUBLE DOWN
        UISelectors.doubleDown.addEventListener('click', e => {
            const bet = state.game.bet;
            const currentCredit = state.game.player.credit;
            if (!(currentCredit - bet < 0)) {
                // Disable btns
                UISelectors.whatNextBtn.disabled = true;
                // Adjust bet & credit
                state.game.player.credit -= bet;
                state.game.bet = 2 * bet;
                UISelectors.betValue.textContent = state.game.bet;
                UISelectors.playerCredit.textContent = state.game.player.credit;
                state.game.lastMove = 'double-down';
                // Adjust UI
                UISelectors.gameFeedbackText.textContent = `Player stands down`;
                setTimeout(async () => {
                    try {
                        // Draw cards
                        const draw = await ApiCtrl.drawCards(state.game.deckID);
                        // Deal card
                        dealSingleCard(draw.cards[0]);
                        // Check cards
                        const cardsValue = checkCards(state.game.player.hand);
                        const outcome = await resolveCards(cardsValue, 'player');
                        // Act accordingly
                        if (!outcome) {
                            await resolveDealer(cardsValue);
                        }
                    } catch (error) {
                        showMessage('Network problem! Check your internet connection and refresh!');
                    }
                }, 2500);
            }
        });
        // NEXT ROUND
        UISelectors.nextRoundBtn.addEventListener('click', e => {
            window.scroll({
                top: 0, 
                left: 0, 
                behavior: 'smooth' 
            });
            // Show loader
            showLoader();
            setTimeout(async () => {
                // Check if player has enough credit to continue
                if (state.game.player.credit >= 50) {
                    // Game continues
                    state.game.round = state.game.round + 1;
                    setNextRoundTable(state.game);
                    // Update game state
                    state.game.lastMove = null;
                    state.game.resolveCards = null;
                } else {
                    // Game ends
                    await gameEnds();
                }
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        // OPTIONS
        UISelectors.floatingOptions.addEventListener('click', toggleOptions);
        // TOP RESULTS
        UISelectors.topResultsBtn.addEventListener('click', e => {
            UISelectors.topResults.lastElementChild.innerHTML = '';
            displayTopResults();
            toggleTopResults();
        });
        UISelectors.resultsGoBack.addEventListener('click', toggleTopResults);
        // HISTORY
        UISelectors.historyBtn.addEventListener('click', () => {
            // Show loader
            showLoader();
            setTimeout(() => {
                showGameHistory(UISelectors.historyRoundsWrapper, 'roll-up');
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        UISelectors.gameHistoryGoBack.addEventListener('click', e => {
            // Show loader
            showLoader();
            setTimeout(() => {
                // Adjust table to the previous point in time
                restoreGameTable(state.game);
                // Hide game history
                UISelectors.gameHistory.classList.toggle('hidden');
                // Show menu toggler
                UISelectors.floatingOptions.classList.remove('hidden');
                toggleOptions();
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        UISelectors.historyRoundsWrapper.addEventListener('click', e => {
            if ((e.target.tagName === 'SPAN') || (e.target.tagName === 'BUTTON')) {
                // Get id
                let id = '';
                let tempID
                if (e.target.tagName === 'SPAN') {
                    tempID = e.target.parentElement.id;
                } else {
                    tempID = e.target.id;
                }
                const words = tempID.split('-');
                id = words[0];        
                // Show loader
                showLoader();
                setTimeout(() => {
                    // Hide menu toggler
                    UISelectors.floatingOptions.classList.add('hidden');
                    toggleOptions();
                    showGameHistory(UISelectors.gameHistory);
                    setHistoryTable(state.history[id]);
                    // Remove loader
                    grab(UISelectors.loader).parentElement.parentElement.remove();
                }, 1000);
            }
        });
        UISelectors.gameHistory.lastElementChild.addEventListener('click', e => {
            if ((e.target.tagName === 'SPAN') || (e.target.tagName === 'BUTTON')) {
                // Get id
                let id = '';
                let tempID
                if (e.target.tagName === 'SPAN') {
                    tempID = e.target.parentElement.id;
                } else {
                    tempID = e.target.id;
                }
                const words = tempID.split('-');
                id = words[0];        
                // Show loader
                showLoader();
                setTimeout(() => {
                    // Hide menu toggler
                    setHistoryTable(state.history[id]);
                    // Remove loader
                    grab(UISelectors.loader).parentElement.parentElement.remove();
                }, 1000);
            }
        });
        // RESET
        UISelectors.restartBtn.addEventListener('click', e => {
            e.preventDefault();
            // Show loader
            showLoader();
            setTimeout(async () => {
                await resetTable();
                // Options
                toggleOptions();
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        // SAVE
        UISelectors.saveBtn.addEventListener('click', async e => {
            e.preventDefault();
            // Hide game history div
            if (!UISelectors.historyRoundsWrapper.classList.contains('roll-up')) {
                UISelectors.historyRoundsWrapper.classList.add('roll-up');
            }
            // Hide load games div
            if (!UISelectors.loadWrapper.classList.contains('roll-up')) {
                UISelectors.loadWrapper.classList.add('roll-up');
            }
            const dataToSave = state;
            // Show loader
            showLoader();
            setTimeout(async () => {
                try {
                    await FirebaseCtrl.saveGame(userDocRef.docs, dataToSave);
                    // Remove loader
                    grab(UISelectors.loader).parentElement.parentElement.remove();
                    // Show msg when save
                    UISelectors.saveWrapper.textContent = 'Saved successfully!';
                    UISelectors.saveWrapper.classList.toggle('roll-up');
                } catch (error) {
                    // Remove loader
                    grab(UISelectors.loader).parentElement.parentElement.remove();
                    // Show msg when not saved
                    UISelectors.saveWrapper.textContent = 'Network problem!'
                    UISelectors.saveWrapper.classList.toggle('roll-up');
                }
            }, 1000);
        });
        // LOAD
        UISelectors.loadBtn.addEventListener('click', e => {
            e.preventDefault();
            // Hide game history div
            if (!UISelectors.historyRoundsWrapper.classList.contains('roll-up')) {
                UISelectors.historyRoundsWrapper.classList.add('roll-up');
            }
            // Hide load games div
            if (!UISelectors.saveWrapper.classList.contains('roll-up')) {
                UISelectors.saveWrapper.classList.add('roll-up');
            }
            // Show loader
            showLoader();
            setTimeout(() => {
                showLoadedGames();
                // Remove loader
                grab(UISelectors.loader).parentElement.parentElement.remove();
            }, 1000);
        });
        UISelectors.loadWrapper.addEventListener('click', e => {
            if ((e.target.tagName === 'SPAN') || (e.target.tagName === 'BUTTON')) {
                // Get id
                let id = '';
                let tempID
                if (e.target.tagName === 'SPAN') {
                    tempID = e.target.parentElement.id;
                } else {
                    tempID = e.target.id;
                }
                const words = tempID.split('-');
                id = words[0];        
                // Show loader
                showLoader();
                setTimeout(() => {
                    // Assign game state
                    const state = cloneObject(savedGamesSnapshot.docs.savedGames[id]);
                    // Render table
                    restoreGameTable(state.game);
                    // Toggle options
                    toggleOptions();
                    // Remove loader
                    grab(UISelectors.loader).parentElement.parentElement.remove();
                }, 1000);
            }
        });
        // SAVE WHEN TAB/BROWSER CLOSES
        window.addEventListener('beforeunload', async e => {
            e.preventDefault();
            // Save in local storage
            saveToLocalStorage(state);
            unsubscribeFromAuthService.func();
            swal("Game state has been saved. You are free to go!");
            e.returnValue = '';
        });
        // Decrement & Increment Btns
        UISelectors.decrementBtn.addEventListener('click', e => {
            e.preventDefault();
            if (!((Number(e.target.nextElementSibling.value) - 25) < 50)) {
                e.target.nextElementSibling.value = Number(e.target.nextElementSibling.value) - 25;
            }
        });
        UISelectors.incrementBtn.addEventListener('click', e => {
            e.preventDefault();
            const currentCredit = state.game.player.credit;
            if (!((Number(e.target.previousElementSibling.value) + 25) > currentCredit)) {
                e.target.previousElementSibling.value = Number(e.target.previousElementSibling.value) + 25;
            }
        });
    };
    return {
        init: async function() {
            try {
                // Disable btns
                welcomeBtns(true);
                // Draw cards
                const cards = await ApiCtrl.getDeck();
                // Assign deck ID
                state.game.deckID = cards.deck_id;
                // Adjust UI
                setTimeout(() => {
                    grab(UISelectors.loader).parentElement.classList.add('shrink');
                    grab(UISelectors.loader).parentElement.parentElement.parentElement.classList.add('scaleX');
                    setTimeout(() => {
                        grab(UISelectors.loader).parentElement.parentElement.parentElement.remove();
                    }, 1000);
                    // Load event listeners
                    loadEventListeners();
                    // Listen to auth state change
                    unsubscribeFromAuthService.func = FirebaseCtrl.auth.onAuthStateChanged(async userAuth => {
                        if (userAuth) {
                            userDocRef.docs = await FirebaseCtrl.storeUser(userAuth);
                            // Adjust UI
                            showTable();
                            updateName(userAuth.displayName);
                            userDocRef.docs.onSnapshot(snapshot => {
                                savedGamesSnapshot.docs = snapshot.data();
                            });
                        } else {
                            userDocRef.docs = null;
                            // Enable btns
                            welcomeBtns(false);
                        }
                        if (userDocRef.docs !== null) {
                            const savedGames = getFromLS('savedGames');
                            if (savedGames !== null) {
                                await FirebaseCtrl.saveGame(userDocRef.docs, savedGames);
                                localStorage.removeItem('savedGames');
                            }
                        }
                    });
                }, 2000);
            } catch (error) {
                showMessage('Network problem! Check your internet connection and refresh!');
            }
        }
    };
})(FirebaseCtrl, ApiCtrl);
// Initialize app
AppCtrl.init();