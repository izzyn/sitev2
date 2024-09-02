function displayRandomMessage() {
    quotes = [
        '"Damn, web developers live like this?" -me',
        '"I\'ll never stop wanting to entirely rework this website" -me',
        '"If you look at my github page you might get the impression that I have... commitment issues (ahah)\" -me',
    ]
  
    var randomIndex = Math.floor(Math.random() * quotes.length);
    var randomMessage = quotes[randomIndex];
  
    var messageElement = document.getElementById("quote");
    messageElement.innerHTML = randomMessage;
}
window.onload = displayRandomMessage