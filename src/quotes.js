function displayRandomMessage() {
    quotes = [
        'Damn, web developers live like this?',
        'I\'ll never stop wanting to entirely rework this website',
        'If you look at my github page you might get the impression that I have... commitment issues (ahah)',
    ]
  
    var randomIndex = Math.floor(Math.random() * quotes.length);
    var randomMessage = quotes[randomIndex];
  
    var messageElement = document.getElementById("quote");
    messageElement.innerHTML = randomMessage;
}
window.onload = displayRandomMessage
