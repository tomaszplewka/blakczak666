// 
// 
// API Ctrl
// 
// 
const ApiCtrl = (function() {
    // API calls
    const getDeck = async function() {
        const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6', {
            method: 'GET',
            mode: 'cors',
            headers: {
            'Content-Type': 'application/json'
            }
        });
        if (!response.ok) { throw new Error('Network response was not ok'); }
        else { return await response.json(); }
    };
    const drawCards = async function(deckId, cards = 1) {
        const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${cards}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
            'Content-Type': 'application/json'
            }
        });
        if (!response.ok) { throw new Error('Network response was not ok'); }
        else { return await response.json(); }
    };
    return { getDeck, drawCards }
})();
export default ApiCtrl;