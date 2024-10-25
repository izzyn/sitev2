---
title: Multiplayerproj
header: Skapandet av ett multiplayerprojekt för spel
date: 2024-05-01
---


# Introduktion
Under den senaste månaden så har jag arbetat på ett TCP (förhoppningsvis också UDP) ramverk i rust för ändamålet av att underlätta processen av att skapa konsekventa multiplayer spel med god prestanda och projektet har nu nått en punkt där det finns gott om saker att kolla på och leka runt med, så det kändes naturligt att skriva om stegen som togs för att nå denna punkt. 

# Varför valde jag att göra detta?

Jag har varit intresserad i nätverksprogrammering i ett [bra tag](https://github.com/izzyn/Multiplayer-Hackgame). Och att finna sätt att inkludera multiplayer i alla mina före-detta spelprojekt har varit en riktigt givande och rolig process under de senaste åren. Men jag har alltid tyckt att det är roligare att arbeta med TCP på låg nivå jämfört med att arbeta med abstraktionslager såsom Godot's multiplayer-ramverk (även om det är ett väldigt bra ramverk för att skapa små multiplayer spel enkelt). Så det är ingen överraskning att jag senare skulle få idén att skapa mitt egna ramverk när jag fick mer kunskap inom ämnet.
# Processen

Jag började med att tänka på hur upplevelsen hade varit från perspektivet av en spelutvecklare som använder ramverket (detta var ett stort fokus eftersom att jag verkligen ogillar att arbeta med ett dåligt designat ramverk) och ett protokoll for att formatera data.
## Formatteringen
För att formatera data så använde jag en simpel model som bestod av att designera vissa nummer till visa typer och att ge ett error om numret som skickas för att beskriva typen inte har en designerad typ. Sedan så hanteras den följande datan beroende på vilken typ som var given, med olika säkerhetsåtgärder som försäkrar sig att invalid data inte orsakar säkerhetsproblem. Dessutom så är information om längden på data krävd för datatyper som har en variabel storlek. 
## Design

### Koncept
Angående design så har jag alltid gillat RPC's (remote procedural calls), det vill säga att man knyter en funktion på ena sidan till en funktion på andra sidan, när en sida kallar sin funktion så kommer motsvarande funktion kallas på andra sidan. Det möjliggör ett säkert sätt att utföra logik på en annan dator, genom att ge den datorn kontroll över exakt vad den andra datorn tillåts göra.


Vad jag ogillade om detta dock, var hur svårt det var att arbeta med spel då man har olika rum/lobbies med RPC's. Eftersom att man behövde flytta runt referenser inom funktionerna på sätt som var otympliga.


Vad jag då kom på som design i mitt ramverk var en modifierad version av RPC modellen, en "kopplings"-model. D.v.s Att man datorn kan koppla en funktion till ett "ID", sedan när den andra datorn skickar det korresponderande ID:t så kallas funktionen som är kopplad till det ID:t. Detta underlättar processen av att arbeta med lobbies/rum, att byta spelkaraktär, etc. eftersom att varje gång som den enda datorn vill förändra beteendet på detta sätt så behöver du enbart koppla en annan funktion till samma ID på den andra datorn.

Det svåra är att faktiskt implementera denna design på ett sätt som inte känns otympligt för den slutgiltiga utvecklaren.
### De tekniska detaljerna
Idealet är att den slutgiltiga utvecklaren enbart hade behövt genomgå 3 simpla steg för att koppla och använda en funktion med denna modell:
1. Lägga till en "decorator" till den funktion du vill använda.
2. Koppla funktionen på sidan du vill att den ska kallas på.
3. Skicka den korresponderande signalen på den andra datorn.

Problem? Writing decorators is an interesting experience, and handling type-safety whilst receiving arbitrary data from a client is difficult. Let's explain what I mean by that.

Problemet är att processen av att skriva en "decorator" är svår, och att vara typsäkerhet samtidigt som man kan få arbiträr data från klienten är svårt. Låt oss gå in djupare på vad som menas med detta.

En "decorator" eller (som de kallas i rust "attribute macros") är effektivt en macro som tar AST:t (abstract syntax tree) av funktionen som decoratorn är applicerad på och ger ett AST av det som ska ersätta dess text.


What we then want to do with this decorator is to: Create another function that functions identically to the original, but takes in parsed data from the client (which can be any type), do type checking on it, and call the original function with the checked data (providing there weren't any data). Otherwise we throw an error that is handled within the framework's data parsing loop.

Vad vi då vill att decoratorn ska göra är att: Skapa en till funktion som tar in avkodad data från den andra datorn (som kan vara godtycklig typ), kolla att de typerna som gavs är rätt, sedan kalla den orginella funktionen med den datan (givet att datan vi fick inte innehöll inkorrekt data). Om något i den processen går fel så skickar vi ett error som hanteras utan att krascha programmet. 

Sen så vill vi att kopplingsfunktionen ska vara en macro som tar in den originella funktionen som du vill använda och ett ID, macron kallar sedan en funktion som lägger till den korresponderande nätverks-kompatibla funktionen till ett hash-table med ID:t som nyckel.

# Resultatet
Som det ser ut just nu, även om resultatet är imponerande så är det inte mer ergonomiskt än saken som denna lösning är tänkt att ersätta, d.v.s RPC. Dock så kan detta lösas med få förändringar/förbättringar.

Så hur är det att använda ramverket idag? För att utreda detta går vi över ett exempel på hur processen av att kalla en funktion genom detta ramverk är.

## Att använda ramverket
First of all, we create a basic TCP project using tokio or similar, I'll be using tokio for the example. I won't go through how to create such a main communication loop. But you can find great explanations on how to do this in the tokio docs, or from [this blog post](https://blog.graysonhead.net/posts/rust-tcp/).

För det första så vill vi skapa ett TCP projekt med biblioteket tokio eller liknande, tokio har använts i exempelkoden. Du kan finna hur kopplar två klienter via tokio i deras dokumentation eller [i denna blog](https://blog.graysonhead.net/posts/rust-tcp/).


Så du har två datorer som är kopplade via en TCP ström och du vill nu kalla en funktion på den andra datorn. Först definierar vi funktionen som vi vill ha kallad på den andra datorn. Vi kallar denna funktion ``test``. 
```rust
// client/src/main.rs

fn test(a: &str, b: i32) {
    println!("{}{}", a, b);
}
```

För att göra det möjligt för ramverket att använda funktionen så ger vi den ``#[netfunc]`` decoratorn.
```rust
// client/src/main.rs

#[netfunc]
fn test(a: &str, b: i32) {
    println!("{}{}", a, b);
}
```


Nu har vi definierat en funktion, och den kan användas av ramverket. Då är det enda som återstår att koppla den och kalla den.

```rust
// client/src/main.rs

async fn handle_connection(stream: TcpStream) -> Result<(), Box<dyn Error>> {
    let mut client = shared::clients::Client::new();

    shared::connect!(2, client, test);
	//...
}
```

Nu har vi skapat klient objektet och kopplat rätt funktion till den, så hur kallar vi den?


Först måste vi skicka signalen från den andra datorn, vi gör detta såhär:
```rust
//server/src/main.rs

//Within the network function handler, inside the read clause.
client.send(
2,
&[
	encode_string("hello wassup!".to_string())?,
	encode_i32(32).to_vec(),
]
.to_vec()
.concat(),
);
client.push_input();
match stream.try_write(&client.inputbffr) {
	Ok(n) => {
		println!("Wrote {} bytes", n);
	}
	//Handle errors...
}

```

Först säger vi att vi vill använda ``send`` funktionen för att skicka signal ``2``, (vilket korresponderar till ``test`` funktionen som vi kopplade tidigare). Vi kan senare använda ramverkets givna ``encode`` funktioner för att översätta datan så att den kan skickas korrekt.

We then push all of our signals we decided to send above. This pushes all the queued messages we want to send into the `client.inputbuffr` until the buffer is full. Then we send it!

Sedan så stoppar vi alla signaler som vi har bestämt oss för att skicka ovan till ``client.inputbuffr`` tills buffern är full. Sen är det bara att skicka buffern!

Så hur får vi nu datan och hur kallar vi funktionen?
```rust
//client/src/main.rs

//In our read loop
match stream.try_read(&mut client.outputbffr) {
	Ok(n) => {
		match client.exec_data(parse(&client.outputbffr)?) {
			Err(e) => {
				println!("{e}");
				break;
			}
			Ok(()) => break,
		}
	}

```
Först så läser vi datan som vi precis fick till ``client.outputbuffr``, Sen använder vi ramverkets ``parse`` funktion för att översätta tillbaka all datan som vi skickade innan. Sen säger vi helt enkelt åt klienten att utföra alla signaler som blev skickade!

# Avslutningsvis
Detta projekt har varit otroligt kul, inte enbart eftersom att jag har tvingats hantera många intressanta problem, men också eftersom att den har klargjort stora delar av processen bakom att skriva ett välgjort bibliotek, vilket är en förmåga som jag konstant söker att bli bättre på. Även om projektet inte ännu är vid en punkt då jag skulle rekommendera det som lösningen du bör använda för dina multiplayer spel dag. Så har basen för ramverket skapats, och jag är mycket nöjd över vad som har åstadkommits. 




